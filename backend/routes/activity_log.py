from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, ActivityLog, User

activity_log_bp = Blueprint('activity_log', __name__)


@activity_log_bp.route('/api/activity-log', methods=['GET'])
@jwt_required()
def list_activity():
    user = User.query.get(int(get_jwt_identity()))
    if user.role not in ('admin', 'manager'):
        return jsonify({'error': 'Nicht berechtigt'}), 403

    q = ActivityLog.query

    # Filters
    action = request.args.get('action')
    entity_type = request.args.get('entity_type')
    user_id = request.args.get('user_id')
    if action:
        q = q.filter_by(action=action)
    if entity_type:
        q = q.filter_by(entity_type=entity_type)
    if user_id:
        q = q.filter_by(user_id=int(user_id))

    limit = int(request.args.get('limit', 100))
    offset = int(request.args.get('offset', 0))

    total = q.count()
    entries = q.order_by(ActivityLog.timestamp.desc()).offset(offset).limit(limit).all()
    return jsonify({
        'total': total,
        'entries': [e.to_dict() for e in entries],
    })
