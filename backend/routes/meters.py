import os
import uuid
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date
from models import db, MeterReading, User
from activity_logger import log_activity

meters_bp = Blueprint('meters', __name__)

VALID_METER_TYPES = ['water', 'electricity_day', 'electricity_night']
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'meters')


def check_property_access(user, pid):
    if user.role == 'admin':
        return True
    return any(p.id == pid for p in user.properties)


@meters_bp.route('/api/properties/<int:pid>/meters', methods=['GET'])
@jwt_required()
def list_readings(pid):
    user = User.query.get(int(get_jwt_identity()))
    if not check_property_access(user, pid):
        return jsonify({'error': 'Kein Zugriff'}), 403
    meter_type = request.args.get('meter_type')
    q = MeterReading.query.filter_by(property_id=pid)
    if meter_type:
        q = q.filter_by(meter_type=meter_type)
    readings = q.order_by(MeterReading.reading_date.desc()).all()
    return jsonify([r.to_dict() for r in readings])


@meters_bp.route('/api/properties/<int:pid>/meters', methods=['POST'])
@jwt_required()
def create_reading(pid):
    user = User.query.get(int(get_jwt_identity()))
    if not check_property_access(user, pid):
        return jsonify({'error': 'Kein Zugriff'}), 403

    # Support both JSON and multipart form data (for photo uploads)
    if request.content_type and 'multipart' in request.content_type:
        meter_type = request.form.get('meter_type')
        reading_value = float(request.form.get('reading_value'))
        reading_date = date.fromisoformat(request.form.get('reading_date'))
        notes = request.form.get('notes', '')
        photo = request.files.get('photo')
    else:
        data = request.get_json()
        meter_type = data.get('meter_type')
        reading_value = data['reading_value']
        reading_date = date.fromisoformat(data['reading_date'])
        notes = data.get('notes', '')
        photo = None

    if meter_type not in VALID_METER_TYPES:
        return jsonify({'error': f'Ungültiger Zählertyp. Erlaubt: {VALID_METER_TYPES}'}), 400

    photo_filename = None
    if photo:
        ext = os.path.splitext(photo.filename)[1].lower()
        if ext not in ('.jpg', '.jpeg', '.png', '.webp'):
            return jsonify({'error': 'Nur Bildformate (JPG, PNG, WebP) erlaubt'}), 400
        photo_filename = f'{uuid.uuid4().hex}{ext}'
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        photo.save(os.path.join(UPLOAD_DIR, photo_filename))

    reading = MeterReading(
        property_id=pid,
        meter_type=meter_type,
        reading_value=reading_value,
        reading_date=reading_date,
        notes=notes,
        photo_filename=photo_filename,
    )
    db.session.add(reading)
    db.session.commit()
    log_activity(user.id, 'create', 'meter_reading', reading.id, f'Zählerstand {meter_type}: {reading_value}')
    return jsonify(reading.to_dict()), 201


@meters_bp.route('/api/properties/<int:pid>/meters/scan', methods=['POST'])
@jwt_required()
def scan_meter_photo(pid):
    user = User.query.get(int(get_jwt_identity()))
    if not check_property_access(user, pid):
        return jsonify({'error': 'Kein Zugriff'}), 403

    photo = request.files.get('photo')
    if not photo:
        return jsonify({'error': 'Kein Foto hochgeladen'}), 400

    image_bytes = photo.read()
    try:
        from ai_service import scan_meter_photo as ai_scan
        result = ai_scan(image_bytes)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': f'KI-Analyse fehlgeschlagen: {str(e)}'}), 500


@meters_bp.route('/api/meters/<int:mid>', methods=['PUT'])
@jwt_required()
def update_reading(mid):
    reading = MeterReading.query.get_or_404(mid)
    user = User.query.get(int(get_jwt_identity()))
    if not check_property_access(user, reading.property_id):
        return jsonify({'error': 'Kein Zugriff'}), 403
    data = request.get_json()
    if 'meter_type' in data and data['meter_type'] in VALID_METER_TYPES:
        reading.meter_type = data['meter_type']
    if 'reading_value' in data:
        reading.reading_value = data['reading_value']
    if 'reading_date' in data:
        reading.reading_date = date.fromisoformat(data['reading_date'])
    if 'notes' in data:
        reading.notes = data['notes']
    db.session.commit()
    log_activity(user.id, 'update', 'meter_reading', mid, f'Zählerstand aktualisiert')
    return jsonify(reading.to_dict())


@meters_bp.route('/api/meters/<int:mid>', methods=['DELETE'])
@jwt_required()
def delete_reading(mid):
    reading = MeterReading.query.get_or_404(mid)
    user = User.query.get(int(get_jwt_identity()))
    if not check_property_access(user, reading.property_id):
        return jsonify({'error': 'Kein Zugriff'}), 403
    db.session.delete(reading)
    db.session.commit()
    log_activity(user.id, 'delete', 'meter_reading', mid, 'Zählerstand gelöscht')
    return jsonify({'message': 'Gelöscht'})
