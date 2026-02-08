import os
from flask import Blueprint, send_from_directory, abort

uploads_bp = Blueprint('uploads', __name__)

UPLOAD_BASE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
CATEGORIES = ['meters', 'expenses', 'recurring_costs']


def init_upload_dirs():
    for cat in CATEGORIES:
        os.makedirs(os.path.join(UPLOAD_BASE, cat), exist_ok=True)


@uploads_bp.route('/api/uploads/<category>/<filename>', methods=['GET'])
def serve_upload(category, filename):
    if category not in CATEGORIES:
        abort(404)
    directory = os.path.join(UPLOAD_BASE, category)
    filepath = os.path.join(directory, filename)
    if not os.path.exists(filepath):
        abort(404)
    return send_from_directory(directory, filename)
