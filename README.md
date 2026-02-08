# Hausverwaltung

Web-App zur professionellen Immobilienverwaltung mit KI-gestützter Dokumentenerkennung. Zählerstanderfassung, Verbrauchsauswertung mit Prognose, Kostenmanagement, Ausgabenverwaltung und umfassendes Reporting.

## Features

- **Immobilienverwaltung** – CRUD mit Dashboard-Übersicht und Kennzahlen
- **Zählerstände** – Wasser, Strom (Tag/Nacht) mit KI-Fotoerkennung
- **Tarife** – Zeitraumbasierte Wasser- und Stromtarife mit Bulk-Anlage
- **Ausgaben** – Rechnungsverwaltung mit USt-Berechnung und Anhängen
- **Laufende Kosten** – Verträge mit monatlichen Beträgen und Laufzeiten
- **Kontakte** – Kontaktverwaltung mit KI-Visitenkartenscan
- **Reports** – Verbrauch, Kosten, Prognose, Monatsvergleich, Jahresabrechnung
- **CSV-Export** – Zähler, Ausgaben und laufende Kosten exportierbar
- **Benutzerverwaltung** – Rollen (Admin/Manager/Benutzer) mit Immobilienzuordnung
- **Aktivitätslog** – Nachvollziehbarkeit aller Aktionen
- **Backup & Restore** – Vollständige Datensicherung als JSON

### KI-Funktionen

Automatische Erkennung von Daten aus:
- Zählerfotos (Zählerstand, Typ, Datum)
- Visitenkarten (Name, Firma, Kontaktdaten)
- Rechnungen (Betrag, Datum, Rechnungsnummer, Lieferant)
- Verträgen (Beschreibung, Anbieter, Betrag, Laufzeit)

## Tech-Stack

| Bereich | Technologien |
|---|---|
| **Backend** | Flask, SQLAlchemy, SQLite, JWT-Auth |
| **Frontend** | React, Recharts, Axios |
| **KI** | OpenAI GPT-4o (Vision + Text) |
| **Deployment** | Docker, Docker Compose |

## Schnellstart

### Entwicklung

```bash
# Backend
cd backend
pip install -r requirements.txt
export OPENAI_API_KEY=sk-...  # Für KI-Funktionen
python app.py
# -> http://localhost:5000

# Frontend (separates Terminal)
cd frontend
npm install
npm start
# -> http://localhost:3000
```

### Docker

```bash
docker-compose up --build
# -> http://localhost:5000
```

## Standard-Login

| Benutzer | Passwort | Rolle |
|---|---|---|
| `admin` | `admin` | Admin |

## Projektstruktur

```
hausverwaltung/
├── backend/
│   ├── app.py              # Flask-App & Konfiguration
│   ├── models.py           # SQLAlchemy-Modelle
│   ├── auth.py             # JWT-Authentifizierung
│   ├── ai_service.py       # OpenAI-Integration
│   ├── activity_logger.py  # Aktivitätsprotokollierung
│   ├── utils.py            # Hilfsfunktionen
│   └── routes/             # API-Endpunkte
│       ├── properties.py
│       ├── meters.py
│       ├── tariffs.py
│       ├── expenses.py
│       ├── recurring_costs.py
│       ├── contacts.py
│       ├── users.py
│       ├── reports.py
│       ├── activity_log.py
│       ├── backup.py
│       └── uploads.py
├── frontend/
│   ├── public/
│   └── src/
│       ├── styles/         # Shared Theme & Styles
│       ├── components/     # Layout, Sidebar, ProtectedRoute
│       ├── pages/          # 12 Seiten-Komponenten
│       └── context/        # Auth-Context
├── Dockerfile
└── docker-compose.yml
```

## Screenshots

Die App enthält ein professionelles UI mit:
- Dunkle Sidebar (260px) mit Emoji-Icons und Immobilienverwaltung-Untertitel
- Gradient-Login-Seite
- Cards mit Border + Shadow
- Uppercase Tabellen-Headers mit Letter-Spacing
- Unterlinien-Tab-Navigation (Reports)
- KI-Scan-Bereiche mit Lila-Akzent
- Responsive Dashboard-Karten mit Statistiken

## Lizenz

Privates Projekt.
