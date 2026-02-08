from datetime import date, timedelta
from models import db, MeterReading, Tariff, RecurringCost, Expense


def get_consumption(property_id, meter_type, start_date, end_date):
    """Calculate consumption between two dates for a meter type."""
    readings = (
        MeterReading.query
        .filter_by(property_id=property_id, meter_type=meter_type)
        .filter(MeterReading.reading_date >= start_date)
        .filter(MeterReading.reading_date <= end_date)
        .order_by(MeterReading.reading_date)
        .all()
    )
    if len(readings) < 2:
        return None, []
    consumption = readings[-1].reading_value - readings[0].reading_value
    days = (readings[-1].reading_date - readings[0].reading_date).days
    return {
        'total': round(consumption, 2),
        'days': days,
        'daily_avg': round(consumption / days, 4) if days > 0 else 0,
        'start_reading': readings[0].to_dict(),
        'end_reading': readings[-1].to_dict(),
    }, readings


def get_forecast(property_id, meter_type, year):
    """Forecast consumption for a full year based on available readings."""
    year_start = date(year, 1, 1)
    year_end = date(year, 12, 31)
    today = date.today()
    target_end = min(year_end, today)

    readings = (
        MeterReading.query
        .filter_by(property_id=property_id, meter_type=meter_type)
        .filter(MeterReading.reading_date >= year_start)
        .filter(MeterReading.reading_date <= target_end)
        .order_by(MeterReading.reading_date)
        .all()
    )
    if len(readings) < 2:
        return None

    actual_consumption = readings[-1].reading_value - readings[0].reading_value
    actual_days = (readings[-1].reading_date - readings[0].reading_date).days
    if actual_days == 0:
        return None

    daily_avg = actual_consumption / actual_days
    total_days_in_year = (year_end - year_start).days + 1
    remaining_days = (year_end - readings[-1].reading_date).days

    forecasted_additional = daily_avg * remaining_days
    total_forecast = actual_consumption + forecasted_additional

    return {
        'year': year,
        'meter_type': meter_type,
        'actual_consumption': round(actual_consumption, 2),
        'actual_days': actual_days,
        'daily_avg': round(daily_avg, 4),
        'forecasted_additional': round(forecasted_additional, 2),
        'total_forecast': round(total_forecast, 2),
        'remaining_days': remaining_days,
        'last_reading_date': readings[-1].reading_date.isoformat(),
    }


def get_cost_for_tariff_type(property_id, tariff_type, consumption, start_date, end_date):
    """Calculate cost for a given consumption using applicable tariffs."""
    tariffs = (
        Tariff.query
        .filter_by(property_id=property_id, tariff_type=tariff_type)
        .filter(Tariff.valid_from <= end_date)
        .filter(db.or_(Tariff.valid_to >= start_date, Tariff.valid_to.is_(None)))
        .order_by(Tariff.valid_from)
        .all()
    )
    if not tariffs:
        return None

    tariff = tariffs[-1]
    months = max(1, ((end_date.year - start_date.year) * 12 + end_date.month - start_date.month))
    usage_cost = consumption * tariff.price_per_unit
    base_cost = tariff.base_cost_monthly * months

    return {
        'tariff_type': tariff_type,
        'consumption': round(consumption, 2),
        'price_per_unit': tariff.price_per_unit,
        'usage_cost': round(usage_cost, 2),
        'base_cost_monthly': tariff.base_cost_monthly,
        'base_cost_total': round(base_cost, 2),
        'total_cost': round(usage_cost + base_cost, 2),
        'months': months,
    }


def get_recurring_costs_total(property_id, start_date, end_date):
    """Sum all recurring costs active in the given period."""
    costs = (
        RecurringCost.query
        .filter_by(property_id=property_id)
        .filter(RecurringCost.start_date <= end_date)
        .filter(db.or_(RecurringCost.end_date >= start_date, RecurringCost.end_date.is_(None)))
        .all()
    )
    total = 0.0
    details = []
    for c in costs:
        eff_start = max(c.start_date, start_date)
        eff_end = min(c.end_date, end_date) if c.end_date else end_date
        months = max(1, (eff_end.year - eff_start.year) * 12 + eff_end.month - eff_start.month + 1)
        amount = c.monthly_amount * months
        total += amount
        details.append({
            'description': c.description,
            'vendor': c.vendor,
            'monthly_amount': c.monthly_amount,
            'months': months,
            'total': round(amount, 2),
        })
    return round(total, 2), details


def get_expenses_total(property_id, start_date, end_date):
    """Sum all one-time expenses in the given period."""
    expenses = (
        Expense.query
        .filter_by(property_id=property_id)
        .filter(Expense.invoice_date >= start_date)
        .filter(Expense.invoice_date <= end_date)
        .all()
    )
    total = sum(e.gross_amount or 0 for e in expenses)
    return round(total, 2), [e.to_dict() for e in expenses]
