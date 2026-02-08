import csv
import io
from datetime import date
from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Property, MeterReading, Tariff, Expense, RecurringCost, User, FileAttachment
from utils import get_consumption, get_forecast, get_cost_for_tariff_type, get_recurring_costs_total, get_expenses_total
from activity_logger import log_activity

reports_bp = Blueprint('reports', __name__)


def check_property_access(user, pid):
    if user.role == 'admin':
        return True
    return any(p.id == pid for p in user.properties)


@reports_bp.route('/api/reports/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    user = User.query.get(int(get_jwt_identity()))
    if user.role == 'admin':
        properties = Property.query.all()
    else:
        properties = user.properties

    results = []
    for prop in properties:
        readings_count = MeterReading.query.filter_by(property_id=prop.id).count()
        expenses_count = Expense.query.filter_by(property_id=prop.id).count()
        recurring_count = RecurringCost.query.filter_by(property_id=prop.id).filter(
            db.or_(RecurringCost.end_date.is_(None), RecurringCost.end_date >= date.today())
        ).count()
        latest_reading = (
            MeterReading.query.filter_by(property_id=prop.id)
            .order_by(MeterReading.reading_date.desc()).first()
        )
        results.append({
            **prop.to_dict(),
            'readings_count': readings_count,
            'expenses_count': expenses_count,
            'active_recurring_costs': recurring_count,
            'latest_reading_date': latest_reading.reading_date.isoformat() if latest_reading else None,
        })
    return jsonify(results)


@reports_bp.route('/api/reports/consumption/<int:pid>', methods=['GET'])
@jwt_required()
def consumption_report(pid):
    user = User.query.get(int(get_jwt_identity()))
    if not check_property_access(user, pid):
        return jsonify({'error': 'Kein Zugriff'}), 403
    start = request.args.get('start', f'{date.today().year}-01-01')
    end = request.args.get('end', date.today().isoformat())
    start_date = date.fromisoformat(start)
    end_date = date.fromisoformat(end)

    result = {}
    for mt in ['water', 'electricity_day', 'electricity_night']:
        data, _ = get_consumption(pid, mt, start_date, end_date)
        if data:
            result[mt] = data
    return jsonify(result)


@reports_bp.route('/api/reports/costs/<int:pid>', methods=['GET'])
@jwt_required()
def cost_report(pid):
    user = User.query.get(int(get_jwt_identity()))
    if not check_property_access(user, pid):
        return jsonify({'error': 'Kein Zugriff'}), 403
    start = request.args.get('start', f'{date.today().year}-01-01')
    end = request.args.get('end', date.today().isoformat())
    start_date = date.fromisoformat(start)
    end_date = date.fromisoformat(end)

    costs = {}
    for mt in ['water', 'electricity_day', 'electricity_night']:
        cons_data, _ = get_consumption(pid, mt, start_date, end_date)
        if cons_data:
            tariff_type = mt
            cost = get_cost_for_tariff_type(pid, tariff_type, cons_data['total'], start_date, end_date)
            if cost:
                costs[mt] = cost
    water_data, _ = get_consumption(pid, 'water', start_date, end_date)
    if water_data:
        ww_cost = get_cost_for_tariff_type(pid, 'wastewater', water_data['total'], start_date, end_date)
        if ww_cost:
            costs['wastewater'] = ww_cost

    recurring_total, recurring_details = get_recurring_costs_total(pid, start_date, end_date)
    expenses_total, expenses_details = get_expenses_total(pid, start_date, end_date)

    usage_total = sum(c.get('total_cost', 0) for c in costs.values())

    return jsonify({
        'period': {'start': start, 'end': end},
        'consumption_costs': costs,
        'recurring_costs': {'total': recurring_total, 'details': recurring_details},
        'expenses': {'total': expenses_total, 'details': expenses_details},
        'grand_total': round(usage_total + recurring_total + expenses_total, 2),
    })


@reports_bp.route('/api/reports/forecast/<int:pid>', methods=['GET'])
@jwt_required()
def forecast_report(pid):
    user = User.query.get(int(get_jwt_identity()))
    if not check_property_access(user, pid):
        return jsonify({'error': 'Kein Zugriff'}), 403
    year = int(request.args.get('year', date.today().year))
    result = {}
    for mt in ['water', 'electricity_day', 'electricity_night']:
        fc = get_forecast(pid, mt, year)
        if fc:
            result[mt] = fc
    return jsonify(result)


@reports_bp.route('/api/reports/annual/<int:pid>', methods=['GET'])
@jwt_required()
def annual_report(pid):
    user = User.query.get(int(get_jwt_identity()))
    if not check_property_access(user, pid):
        return jsonify({'error': 'Kein Zugriff'}), 403
    year = int(request.args.get('year', date.today().year))
    start_date = date(year, 1, 1)
    end_date = date(year, 12, 31)

    consumption = {}
    costs = {}
    for mt in ['water', 'electricity_day', 'electricity_night']:
        cons_data, _ = get_consumption(pid, mt, start_date, end_date)
        if cons_data:
            consumption[mt] = cons_data
            cost = get_cost_for_tariff_type(pid, mt, cons_data['total'], start_date, end_date)
            if cost:
                costs[mt] = cost

    water_data, _ = get_consumption(pid, 'water', start_date, end_date)
    if water_data:
        ww_cost = get_cost_for_tariff_type(pid, 'wastewater', water_data['total'], start_date, end_date)
        if ww_cost:
            costs['wastewater'] = ww_cost

    recurring_total, recurring_details = get_recurring_costs_total(pid, start_date, end_date)
    expenses_total, expenses_details = get_expenses_total(pid, start_date, end_date)
    usage_total = sum(c.get('total_cost', 0) for c in costs.values())

    # Add attachment info to expense details
    for exp in expenses_details:
        att_count = FileAttachment.query.filter_by(entity_type='expense', entity_id=exp['id']).count()
        exp['attachment_count'] = att_count
        if att_count > 0:
            atts = FileAttachment.query.filter_by(entity_type='expense', entity_id=exp['id']).all()
            exp['attachments'] = [a.to_dict() for a in atts]

    log_activity(user.id, 'view', 'report', pid, f'Jahresabrechnung {year}')

    return jsonify({
        'year': year,
        'property_id': pid,
        'consumption': consumption,
        'costs': costs,
        'recurring_costs': {'total': recurring_total, 'details': recurring_details},
        'expenses': {'total': expenses_total, 'details': expenses_details},
        'grand_total': round(usage_total + recurring_total + expenses_total, 2),
    })


@reports_bp.route('/api/reports/monthly/<int:pid>', methods=['GET'])
@jwt_required()
def monthly_comparison(pid):
    user = User.query.get(int(get_jwt_identity()))
    if not check_property_access(user, pid):
        return jsonify({'error': 'Kein Zugriff'}), 403
    year = int(request.args.get('year', date.today().year))
    months = []
    for m in range(1, 13):
        start_date = date(year, m, 1)
        if m == 12:
            end_date = date(year, 12, 31)
        else:
            end_date = date(year, m + 1, 1)
        rec_total, _ = get_recurring_costs_total(pid, start_date, end_date)
        exp_total, _ = get_expenses_total(pid, start_date, end_date)
        months.append({
            'month': m,
            'recurring_costs': rec_total,
            'expenses': exp_total,
            'total': round(rec_total + exp_total, 2),
        })
    return jsonify(months)


@reports_bp.route('/api/reports/export/<int:pid>', methods=['GET'])
@jwt_required()
def export_csv(pid):
    user = User.query.get(int(get_jwt_identity()))
    if not check_property_access(user, pid):
        return jsonify({'error': 'Kein Zugriff'}), 403
    report_type = request.args.get('type', 'expenses')
    start = request.args.get('start', f'{date.today().year}-01-01')
    end = request.args.get('end', date.today().isoformat())
    start_date = date.fromisoformat(start)
    end_date = date.fromisoformat(end)

    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')

    if report_type == 'expenses':
        writer.writerow(['Datum', 'Rechnungsersteller', 'Rechnungsnr.', 'Beschreibung', 'Kategorie', 'Netto', 'USt %', 'USt', 'Brutto'])
        expenses = Expense.query.filter_by(property_id=pid).filter(
            Expense.invoice_date >= start_date, Expense.invoice_date <= end_date
        ).order_by(Expense.invoice_date).all()
        for e in expenses:
            writer.writerow([e.invoice_date, e.vendor, e.invoice_number, e.description, e.category, e.net_amount, e.vat_rate, e.vat_amount, e.gross_amount])
    elif report_type == 'meters':
        writer.writerow(['Datum', 'Zählertyp', 'Wert', 'Notizen'])
        readings = MeterReading.query.filter_by(property_id=pid).filter(
            MeterReading.reading_date >= start_date, MeterReading.reading_date <= end_date
        ).order_by(MeterReading.reading_date).all()
        for r in readings:
            writer.writerow([r.reading_date, r.meter_type, r.reading_value, r.notes])
    elif report_type == 'recurring':
        writer.writerow(['Beschreibung', 'Anbieter', 'Monatlich', 'USt %', 'Netto', 'Brutto', 'Start', 'Ende', 'Kategorie'])
        costs = RecurringCost.query.filter_by(property_id=pid).all()
        for c in costs:
            writer.writerow([c.description, c.vendor, c.monthly_amount, c.vat_rate, c.net_amount, c.gross_amount, c.start_date, c.end_date, c.category])

    log_activity(user.id, 'export', 'report', pid, f'CSV Export: {report_type}')

    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment; filename=report_{report_type}_{pid}.csv'}
    )
