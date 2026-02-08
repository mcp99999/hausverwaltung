from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash
from models import db, User, Property
from activity_logger import log_activity

users_bp = Blueprint('users', __name__)


@users_bp.route('/api/users', methods=['GET'])
@jwt_required()
def list_users():
    current = User.query.get(int(get_jwt_identity()))
    if current.role == 'admin':
        users = User.query.all()
    elif current.role == 'manager':
        users = User.query.filter(
            db.or_(User.id == current.id, User.created_by == current.id)
        ).all()
    else:
        return jsonify({'error': 'Nicht berechtigt'}), 403
    return jsonify([u.to_dict() for u in users])


@users_bp.route('/api/users', methods=['POST'])
@jwt_required()
def create_user():
    current = User.query.get(int(get_jwt_identity()))
    if current.role not in ('admin', 'manager'):
        return jsonify({'error': 'Nicht berechtigt'}), 403
    data = request.get_json()
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Benutzername existiert bereits'}), 400

    role = data.get('role', 'user')
    # Manager can only create users with 'user' role
    if current.role == 'manager' and role != 'user':
        return jsonify({'error': 'Manager können nur Benutzer mit Rolle "user" erstellen'}), 403

    user = User(
        username=data['username'],
        password_hash=generate_password_hash(data['password']),
        role=role,
        created_by=current.id,
    )
    if data.get('property_ids'):
        props = Property.query.filter(Property.id.in_(data['property_ids'])).all()
        user.properties = props
    db.session.add(user)
    db.session.commit()
    log_activity(current.id, 'create', 'user', user.id, f'Benutzer "{user.username}" erstellt (Rolle: {role})')
    return jsonify(user.to_dict()), 201


@users_bp.route('/api/users/<int:uid>', methods=['PUT'])
@jwt_required()
def update_user(uid):
    current = User.query.get(int(get_jwt_identity()))
    if current.role not in ('admin', 'manager'):
        return jsonify({'error': 'Nicht berechtigt'}), 403
    user = User.query.get_or_404(uid)
    # Manager can only edit users they created
    if current.role == 'manager' and user.created_by != current.id:
        return jsonify({'error': 'Keine Berechtigung'}), 403
    data = request.get_json()
    if 'username' in data:
        user.username = data['username']
    if 'password' in data and data['password']:
        user.password_hash = generate_password_hash(data['password'])
    if 'role' in data:
        # Manager cannot assign admin or manager role
        if current.role == 'manager' and data['role'] != 'user':
            return jsonify({'error': 'Manager können nur die Rolle "user" vergeben'}), 403
        user.role = data['role']
    if 'property_ids' in data:
        props = Property.query.filter(Property.id.in_(data['property_ids'])).all()
        user.properties = props
    db.session.commit()
    log_activity(current.id, 'update', 'user', user.id, f'Benutzer "{user.username}" aktualisiert')
    return jsonify(user.to_dict())


@users_bp.route('/api/users/<int:uid>', methods=['DELETE'])
@jwt_required()
def delete_user(uid):
    current = User.query.get(int(get_jwt_identity()))
    if current.role not in ('admin', 'manager'):
        return jsonify({'error': 'Nicht berechtigt'}), 403
    user = User.query.get_or_404(uid)
    if current.role == 'manager' and user.created_by != current.id:
        return jsonify({'error': 'Keine Berechtigung'}), 403
    username = user.username
    db.session.delete(user)
    db.session.commit()
    log_activity(current.id, 'delete', 'user', uid, f'Benutzer "{username}" gelöscht')
    return jsonify({'message': 'Gelöscht'})
