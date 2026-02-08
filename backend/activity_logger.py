from flask import request
from models import db, ActivityLog, User


def log_activity(user_id, action, entity_type, entity_id=None, details=''):
    user = User.query.get(user_id)
    if not user:
        return
    entry = ActivityLog(
        user_id=user_id,
        username=user.username,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
        ip_address=request.remote_addr or '',
    )
    db.session.add(entry)
    db.session.commit()
