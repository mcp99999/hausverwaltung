import os
import uuid
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date
from models import db, RecurringCost, User, FileAttachment, Contact
from activity_logger import log_activity

recurring_costs_bp = Blueprint('recurring_costs', __name__)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'recurring_costs')


def check_property_access(user, pid):
    if user.role == 'admin':
        return True
    return any(p.id == pid for p in user.properties)


@recurring_costs_bp.route('/api/properties/<int:pid>/recurring-costs', methods=['GET'])
@jwt_required()
def list_recurring(pid):
    user = User.query.get(int(get_jwt_identity()))
    if not check_property_access(user, pid):
        return jsonify({'error': 'Kein Zugriff'}), 403
    costs = RecurringCost.query.filter_by(property_id=pid).order_by(RecurringCost.start_date.desc()).all()
    result = []
    for c in costs:
        d = c.to_dict()
        d['attachment_count'] = FileAttachment.query.filter_by(entity_type='recurring_cost', entity_id=c.id).count()
        result.append(d)
    return jsonify(result)


@recurring_costs_bp.route('/api/properties/<int:pid>/recurring-costs', methods=['POST'])
@jwt_required()
def create_recurring(pid):
    user = User.query.get(int(get_jwt_identity()))
    if not check_property_access(user, pid):
        return jsonify({'error': 'Kein Zugriff'}), 403

    if request.content_type and 'multipart' in request.content_type:
        description = request.form.get('description')
        vendor = request.form.get('vendor', '')
        monthly = float(request.form.get('monthly_amount'))
        vat_rate = float(request.form.get('vat_rate', '19'))
        start_date_str = request.form.get('start_date')
        end_date_str = request.form.get('end_date')
        category = request.form.get('category', '')
        contact_id = request.form.get('contact_id') or None
        files = request.files.getlist('files')
    else:
        data = request.get_json()
        description = data['description']
        vendor = data.get('vendor', '')
        monthly = data['monthly_amount']
        vat_rate = data.get('vat_rate', 19.0)
        start_date_str = data['start_date']
        end_date_str = data.get('end_date')
        category = data.get('category', '')
        contact_id = data.get('contact_id') or None
        files = []

    if contact_id:
        contact_id = int(contact_id)

    net = round(monthly / (1 + vat_rate / 100), 2)
    cost = RecurringCost(
        property_id=pid,
        contact_id=contact_id,
        description=description,
        vendor=vendor,
        monthly_amount=monthly,
        vat_rate=vat_rate,
        net_amount=net,
        gross_amount=monthly,
        start_date=date.fromisoformat(start_date_str),
        end_date=date.fromisoformat(end_date_str) if end_date_str else None,
        category=category,
    )
    db.session.add(cost)
    db.session.flush()

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    for f in files:
        ext = os.path.splitext(f.filename)[1].lower()
        stored = f'{uuid.uuid4().hex}{ext}'
        f.save(os.path.join(UPLOAD_DIR, stored))
        ftype = 'pdf' if ext == '.pdf' else 'image'
        att = FileAttachment(
            entity_type='recurring_cost', entity_id=cost.id,
            original_filename=f.filename, stored_filename=stored, file_type=ftype,
        )
        db.session.add(att)

    db.session.commit()
    log_activity(user.id, 'create', 'recurring_cost', cost.id, f'Lfd. Kosten: {description}')
    return jsonify(cost.to_dict()), 201


@recurring_costs_bp.route('/api/recurring-costs/scan', methods=['POST'])
@jwt_required()
def scan_contract():
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'Keine Datei hochgeladen'}), 400
    image_bytes = file.read()
    ext = os.path.splitext(file.filename)[1].lower()
    file_type = 'pdf' if ext == '.pdf' else 'image'
    try:
        from ai_service import scan_contract as ai_scan
        result = ai_scan(image_bytes, file_type)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': f'KI-Analyse fehlgeschlagen: {str(e)}'}), 500


@recurring_costs_bp.route('/api/recurring-costs/<int:cid>/attachments', methods=['GET'])
@jwt_required()
def list_attachments(cid):
    cost = RecurringCost.query.get_or_404(cid)
    user = User.query.get(int(get_jwt_identity()))
    if not check_property_access(user, cost.property_id):
        return jsonify({'error': 'Kein Zugriff'}), 403
    atts = FileAttachment.query.filter_by(entity_type='recurring_cost', entity_id=cid).all()
    return jsonify([a.to_dict() for a in atts])


@recurring_costs_bp.route('/api/recurring-costs/<int:cid>/attachments', methods=['POST'])
@jwt_required()
def add_attachment(cid):
    cost = RecurringCost.query.get_or_404(cid)
    user = User.query.get(int(get_jwt_identity()))
    if not check_property_access(user, cost.property_id):
        return jsonify({'error': 'Kein Zugriff'}), 403
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'Keine Datei'}), 400
    ext = os.path.splitext(file.filename)[1].lower()
    stored = f'{uuid.uuid4().hex}{ext}'
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file.save(os.path.join(UPLOAD_DIR, stored))
    ftype = 'pdf' if ext == '.pdf' else 'image'
    att = FileAttachment(
        entity_type='recurring_cost', entity_id=cid,
        original_filename=file.filename, stored_filename=stored, file_type=ftype,
    )
    db.session.add(att)
    db.session.commit()
    log_activity(user.id, 'create', 'attachment', att.id, f'Anhang zu lfd. Kosten #{cid}')
    return jsonify(att.to_dict()), 201


@recurring_costs_bp.route('/api/recurring-costs/<int:cid>', methods=['PUT'])
@jwt_required()
def update_recurring(cid):
    cost = RecurringCost.query.get_or_404(cid)
    user = User.query.get(int(get_jwt_identity()))
    if not check_property_access(user, cost.property_id):
        return jsonify({'error': 'Kein Zugriff'}), 403
    data = request.get_json()
    if 'description' in data:
        cost.description = data['description']
    if 'vendor' in data:
        cost.vendor = data['vendor']
    if 'monthly_amount' in data:
        cost.monthly_amount = data['monthly_amount']
    if 'vat_rate' in data:
        cost.vat_rate = data['vat_rate']
    if 'start_date' in data:
        cost.start_date = date.fromisoformat(data['start_date'])
    if 'end_date' in data:
        cost.end_date = date.fromisoformat(data['end_date']) if data['end_date'] else None
    if 'category' in data:
        cost.category = data['category']
    if 'contact_id' in data:
        cost.contact_id = data['contact_id'] or None
    cost.net_amount = round(cost.monthly_amount / (1 + cost.vat_rate / 100), 2)
    cost.gross_amount = cost.monthly_amount
    db.session.commit()
    log_activity(user.id, 'update', 'recurring_cost', cid, 'Lfd. Kosten aktualisiert')
    return jsonify(cost.to_dict())


@recurring_costs_bp.route('/api/recurring-costs/<int:cid>', methods=['DELETE'])
@jwt_required()
def delete_recurring(cid):
    cost = RecurringCost.query.get_or_404(cid)
    user = User.query.get(int(get_jwt_identity()))
    if not check_property_access(user, cost.property_id):
        return jsonify({'error': 'Kein Zugriff'}), 403
    atts = FileAttachment.query.filter_by(entity_type='recurring_cost', entity_id=cid).all()
    for att in atts:
        filepath = os.path.join(UPLOAD_DIR, att.stored_filename)
        if os.path.exists(filepath):
            os.remove(filepath)
        db.session.delete(att)
    db.session.delete(cost)
    db.session.commit()
    log_activity(user.id, 'delete', 'recurring_cost', cid, 'Lfd. Kosten gelöscht')
    return jsonify({'message': 'Gelöscht'})
