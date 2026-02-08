# Hausverwaltung

Web-App zur professionellen Hausverwaltung (bis 10 Immobilien). Zählerstanderfassung, Verbrauchsauswertung mit Prognose, Kostenmanagement, Ausgabenverwaltung und Reporting.

## Tech-Stack

- **Backend**: Flask, SQLAlchemy, SQLite, JWT-Auth
- **Frontend**: React, Recharts, Axios
- **Deployment**: Docker

## Schnellstart

### Entwicklung

```bash
# Backend
cd backend
pip install -r requirements.txt
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

- **Benutzer**: `admin`
- **Passwort**: `admin`

## Funktionen

- Immobilienverwaltung (CRUD)
- Zählerstanderfassung (Wasser, Strom Tag/Nacht)
- Tarifverwaltung (zeitraumbasiert)
- Einmalige Ausgaben mit USt-Berechnung
- Laufende Kosten
- Benutzerverwaltung (Admin kann User Immobilien zuordnen)
- Dashboard mit Kennzahlen
- Reports: Verbrauch, Kosten, Prognose, Monatsvergleich, Jahresabrechnung
- CSV-Export
