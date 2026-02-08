import os
import json
import base64
import io

ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')


def _get_client():
    import anthropic
    if not ANTHROPIC_API_KEY:
        raise ValueError('ANTHROPIC_API_KEY Umgebungsvariable nicht gesetzt')
    return anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


def _extract_exif_date(image_bytes):
    try:
        from PIL import Image
        from PIL.ExifTags import TAGS
        img = Image.open(io.BytesIO(image_bytes))
        exif = img._getexif()
        if exif:
            for tag_id, value in exif.items():
                tag = TAGS.get(tag_id, tag_id)
                if tag == 'DateTimeOriginal':
                    # Format: "2024:01:15 14:30:00" -> "2024-01-15"
                    return value.split(' ')[0].replace(':', '-')
    except Exception:
        pass
    return None


def _detect_media_type(image_bytes):
    if image_bytes[:4] == b'\x89PNG':
        return 'image/png'
    if image_bytes[:2] == b'\xff\xd8':
        return 'image/jpeg'
    if image_bytes[:4] == b'RIFF' and image_bytes[8:12] == b'WEBP':
        return 'image/webp'
    if image_bytes[:4] == b'%PDF':
        return 'application/pdf'
    return 'image/jpeg'


def _parse_json_response(text):
    text = text.strip()
    if text.startswith('{'):
        return json.loads(text)
    start = text.find('{')
    end = text.rfind('}') + 1
    return json.loads(text[start:end])


def scan_meter_photo(image_bytes):
    client = _get_client()
    b64 = base64.standard_b64encode(image_bytes).decode('utf-8')
    media_type = _detect_media_type(image_bytes)

    response = client.messages.create(
        model='claude-sonnet-4-5-20250929',
        max_tokens=1024,
        messages=[{
            'role': 'user',
            'content': [
                {
                    'type': 'image',
                    'source': {
                        'type': 'base64',
                        'media_type': media_type,
                        'data': b64,
                    },
                },
                {
                    'type': 'text',
                    'text': (
                        'Lies den Zählerstand von diesem Zählerfoto ab. '
                        'Antworte ausschließlich mit einem JSON-Objekt im folgenden Format:\n'
                        '{"reading_value": <Zahlenwert als Number>, "meter_type": "<water|electricity_day|electricity_night oder null>", "date": "<YYYY-MM-DD oder null>"}\n'
                        'Wenn du den Zählertyp nicht erkennen kannst, setze meter_type auf null. '
                        'Wenn du das Datum nicht erkennen kannst, setze date auf null. '
                        'Antworte NUR mit dem JSON, kein weiterer Text.'
                    ),
                },
            ],
        }],
    )

    result = _parse_json_response(response.content[0].text)

    # Try EXIF date as fallback
    if not result.get('date'):
        exif_date = _extract_exif_date(image_bytes)
        if exif_date:
            result['date'] = exif_date

    return result


def scan_invoice(image_bytes, file_type='image'):
    client = _get_client()
    b64 = base64.standard_b64encode(image_bytes).decode('utf-8')
    media_type = 'application/pdf' if file_type == 'pdf' else _detect_media_type(image_bytes)

    content = []
    if file_type == 'pdf':
        content.append({
            'type': 'document',
            'source': {
                'type': 'base64',
                'media_type': 'application/pdf',
                'data': b64,
            },
        })
    else:
        content.append({
            'type': 'image',
            'source': {
                'type': 'base64',
                'media_type': media_type,
                'data': b64,
            },
        })

    content.append({
        'type': 'text',
        'text': (
            'Extrahiere alle Rechnungsdaten aus diesem Dokument. '
            'Antworte ausschließlich mit einem JSON-Objekt im folgenden Format:\n'
            '{"vendor": "<Rechnungsersteller>", "invoice_date": "<YYYY-MM-DD>", '
            '"net_amount": <Nettobetrag als Number>, "vat_rate": <USt-Satz als Number>, '
            '"vat_amount": <USt-Betrag als Number>, "gross_amount": <Bruttobetrag als Number>, '
            '"invoice_number": "<Rechnungsnummer oder null>", '
            '"description": "<Kurzbeschreibung der Leistung AUF DEUTSCH, übersetze falls nötig>", '
            '"contact_phone": "<Telefonnummer des Rechnungserstellers oder null>", '
            '"contact_email": "<E-Mail des Rechnungserstellers oder null>", '
            '"contact_address": "<Adresse des Rechnungserstellers oder null>"}\n'
            'Wenn ein Wert nicht erkennbar ist, setze ihn auf null. '
            'Beträge immer als Dezimalzahlen ohne Währungssymbol. '
            'Antworte NUR mit dem JSON, kein weiterer Text.'
        ),
    })

    response = client.messages.create(
        model='claude-sonnet-4-5-20250929',
        max_tokens=1024,
        messages=[{'role': 'user', 'content': content}],
    )

    return _parse_json_response(response.content[0].text)


def scan_contract(image_bytes, file_type='image'):
    client = _get_client()
    b64 = base64.standard_b64encode(image_bytes).decode('utf-8')
    media_type = 'application/pdf' if file_type == 'pdf' else _detect_media_type(image_bytes)

    content = []
    if file_type == 'pdf':
        content.append({
            'type': 'document',
            'source': {
                'type': 'base64',
                'media_type': 'application/pdf',
                'data': b64,
            },
        })
    else:
        content.append({
            'type': 'image',
            'source': {
                'type': 'base64',
                'media_type': media_type,
                'data': b64,
            },
        })

    content.append({
        'type': 'text',
        'text': (
            'Extrahiere Vertragsdaten aus diesem Dokument. '
            'Antworte ausschließlich mit einem JSON-Objekt im folgenden Format:\n'
            '{"vendor": "<Anbieter/Vertragspartner>", "monthly_amount": <Monatlicher Betrag brutto als Number>, '
            '"description": "<Beschreibung der Leistung>", '
            '"start_date": "<YYYY-MM-DD Vertragsbeginn>", '
            '"end_date": "<YYYY-MM-DD Vertragsende oder null>"}\n'
            'Wenn ein Wert nicht erkennbar ist, setze ihn auf null. '
            'Beträge immer als Dezimalzahlen. '
            'Antworte NUR mit dem JSON, kein weiterer Text.'
        ),
    })

    response = client.messages.create(
        model='claude-sonnet-4-5-20250929',
        max_tokens=1024,
        messages=[{'role': 'user', 'content': content}],
    )

    return _parse_json_response(response.content[0].text)


def scan_business_card(image_bytes):
    client = _get_client()
    b64 = base64.standard_b64encode(image_bytes).decode('utf-8')
    media_type = _detect_media_type(image_bytes)

    response = client.messages.create(
        model='claude-sonnet-4-5-20250929',
        max_tokens=1024,
        messages=[{
            'role': 'user',
            'content': [
                {
                    'type': 'image',
                    'source': {
                        'type': 'base64',
                        'media_type': media_type,
                        'data': b64,
                    },
                },
                {
                    'type': 'text',
                    'text': (
                        'Extrahiere alle Kontaktdaten von dieser Visitenkarte. '
                        'Antworte ausschließlich mit einem JSON-Objekt im folgenden Format:\n'
                        '{"name": "<Name der Person oder Firma>", "company": "<Firmenname oder null>", '
                        '"phone": "<Telefonnummer oder null>", "email": "<E-Mail oder null>", '
                        '"address": "<Adresse oder null>", "website": "<Website oder null>"}\n'
                        'Wenn ein Wert nicht erkennbar ist, setze ihn auf null. '
                        'Antworte NUR mit dem JSON, kein weiterer Text.'
                    ),
                },
            ],
        }],
    )

    return _parse_json_response(response.content[0].text)
