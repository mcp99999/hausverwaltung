from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date
from models import db, Tariff, User
from activity_logger import log_activity

tariffs_bp = Blueprint('tariffs', __name__)

VALID_TARIFF_TYPES = ['water', 'wastewater', 'electricity_day', 'electricity_night']


def check_property_access(user, pid):
    if user.role == 'admin':
        return True
    return any(p.id == pid for p in user.properties)


@tariffs_bp.route('/api/properties/<int:pid>/tariffs', methods=['GET'])
@jwt_required()
def list_tariffs(pid):
    user = User.query.get(int(get_jwt_identity()))
    if not check_property_access(user, pid):
        return jsonify({'error': 'Kein Zugriff'}), 403
    tariff_type = request.args.get('tariff_type')
    q = Tariff.query.filter_by(property_id=pid)
    if tariff_type:
        q = q.filter_by(tariff_type=tariff_type)
    tariffs = q.order_by(Tariff.valid_from.desc()).all()
    return jsonify([t.to_dict() for t in tariffs])


@tariffs_bp.route('/api/properties/<int:pid>/tariffs', methods=['POST'])
@jwt_required()
def create_tariff(pid):
    user = User.query.get(int(get_jwt_identity()))
    if not check_property_access(user, pid):
        return jsonify({'error': 'Kein Zugriff'}), 403
    data = request.get_json()
    if data.get('tariff_type') not in VALID_TARIFF_TYPES:
        return jsonify({'error': f'Ungültiger Tariftyp. Erlaubt: {VALID_TARIFF_TYPES}'}), 400
    tariff = Tariff(
        property_id=pid,
        tariff_type=data['tariff_type'],
        price_per_unit=data['price_per_unit'],
        base_cost_monthly=data.get('base_cost_monthly', 0.0),
        valid_from=date.fromisoformat(data['valid_from']),
        valid_to=date.fromisoformat(data['valid_to']) if data.get('valid_to') else None,
    )
    db.session.add(tariff)
    db.session.commit()
    log_activity(user.id, 'create', 'tariff', tariff.id, f'Tarif {data["tariff_type"]} erstellt')
    return jsonify(tariff.to_dict()), 201


@tariffs_bp.route('/api/properties/<int:pid>/tariffs/bulk', methods=['POST'])
@jwt_required()
def create_tariffs_bulk(pid):
    user = User.query.get(int(get_jwt_identity()))
    if not check_property_access(user, pid):
        return jsonify({'error': 'Kein Zugriff'}), 403
    data = request.get_json()
    valid_from = date.fromisoformat(data['valid_from'])
    valid_to = date.fromisoformat(data['valid_to']) if data.get('valid_to') else None
    tariffs_data = data.get('tariffs', [])
    created = []
    for t in tariffs_data:
        if t.get('tariff_type') not in VALID_TARIFF_TYPES:
            continue
        if t.get('price_per_unit') is None:
            continue
        tariff = Tariff(
            property_id=pid,
            tariff_type=t['tariff_type'],
            price_per_unit=t['price_per_unit'],
            base_cost_monthly=t.get('base_cost_monthly', 0.0),
            valid_from=valid_from,
            valid_to=valid_to,
        )
        db.session.add(tariff)
        created.append(tariff)
    db.session.commit()
    log_activity(user.id, 'create', 'tariff', None, f'{len(created)} Tarife erstellt')
    return jsonify([t.to_dict() for t in created]), 201


@tariffs_bp.route('/api/tariffs/<int:tid>', methods=['PUT'])
@jwt_required()
def update_tariff(tid):
    tariff = Tariff.query.get_or_404(tid)
    user = User.query.get(int(get_jwt_identity()))
    if not check_property_access(user, tariff.property_id):
        return jsonify({'error': 'Kein Zugriff'}), 403
    data = request.get_json()
    if 'tariff_type' in data and data['tariff_type'] in VALID_TARIFF_TYPES:
        tariff.tariff_type = data['tariff_type']
    if 'price_per_unit' in data:
        tariff.price_per_unit = data['price_per_unit']
    if 'base_cost_monthly' in data:
        tariff.base_cost_monthly = data['base_cost_monthly']
    if 'valid_from' in data:
        tariff.valid_from = date.fromisoformat(data['valid_from'])
    if 'valid_to' in data:
        tariff.valid_to = date.fromisoformat(data['valid_to']) if data['valid_to'] else None
    db.session.commit()
    log_activity(user.id, 'update', 'tariff', tid, 'Tarif aktualisiert')
    return jsonify(tariff.to_dict())


@tariffs_bp.route('/api/tariffs/<int:tid>', methods=['DELETE'])
@jwt_required()
def delete_tariff(tid):
    tariff = Tariff.query.get_or_404(tid)
    user = User.query.get(int(get_jwt_identity()))
    if not check_property_access(user, tariff.property_id):
        return jsonify({'error': 'Kein Zugriff'}), 403
    db.session.delete(tariff)
    db.session.commit()
    log_activity(user.id, 'delete', 'tariff', tid, 'Tarif gelöscht')
    return jsonify({'message': 'Gelöscht'})
