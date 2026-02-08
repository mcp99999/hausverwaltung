from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Property, User
from activity_logger import log_activity

properties_bp = Blueprint('properties', __name__)


def get_user_properties(user):
    if user.role == 'admin':
        return Property.query.all()
    return user.properties


def user_can_access_property(user, property_id):
    if user.role == 'admin':
        return True
    return any(p.id == property_id for p in user.properties)


@properties_bp.route('/api/properties', methods=['GET'])
@jwt_required()
def list_properties():
    user = User.query.get(int(get_jwt_identity()))
    props = get_user_properties(user)
    return jsonify([p.to_dict() for p in props])


@properties_bp.route('/api/properties', methods=['POST'])
@jwt_required()
def create_property():
    user = User.query.get(int(get_jwt_identity()))
    if user.role not in ('admin', 'manager'):
        return jsonify({'error': 'Keine Berechtigung'}), 403
    data = request.get_json()
    prop = Property(
        name=data['name'],
        address=data.get('address', ''),
        description=data.get('description', ''),
    )
    db.session.add(prop)
    db.session.flush()
    # Manager: auto-assign to themselves
    if user.role == 'manager':
        user.properties.append(prop)
    db.session.commit()
    log_activity(user.id, 'create', 'property', prop.id, f'Immobilie "{prop.name}" erstellt')
    return jsonify(prop.to_dict()), 201


@properties_bp.route('/api/properties/<int:pid>', methods=['GET'])
@jwt_required()
def get_property(pid):
    user = User.query.get(int(get_jwt_identity()))
    if not user_can_access_property(user, pid):
        return jsonify({'error': 'Kein Zugriff'}), 403
    prop = Property.query.get_or_404(pid)
    return jsonify(prop.to_dict())


@properties_bp.route('/api/properties/<int:pid>', methods=['PUT'])
@jwt_required()
def update_property(pid):
    user = User.query.get(int(get_jwt_identity()))
    if user.role not in ('admin', 'manager') or not user_can_access_property(user, pid):
        return jsonify({'error': 'Keine Berechtigung'}), 403
    prop = Property.query.get_or_404(pid)
    data = request.get_json()
    prop.name = data.get('name', prop.name)
    prop.address = data.get('address', prop.address)
    prop.description = data.get('description', prop.description)
    db.session.commit()
    log_activity(user.id, 'update', 'property', prop.id, f'Immobilie "{prop.name}" aktualisiert')
    return jsonify(prop.to_dict())


@properties_bp.route('/api/properties/<int:pid>', methods=['DELETE'])
@jwt_required()
def delete_property(pid):
    user = User.query.get(int(get_jwt_identity()))
    if not user.is_admin:
        return jsonify({'error': 'Nur Admins können Immobilien löschen'}), 403
    prop = Property.query.get_or_404(pid)
    name = prop.name
    db.session.delete(prop)
    db.session.commit()
    log_activity(user.id, 'delete', 'property', pid, f'Immobilie "{name}" gelöscht')
    return jsonify({'message': 'Gelöscht'})
