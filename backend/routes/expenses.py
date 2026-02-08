import os
import uuid
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date
from models import db, Expense, User, FileAttachment, Contact
from activity_logger import log_activity

expenses_bp = Blueprint('expenses', __name__)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'expenses')


def check_property_access(user, pid):
    if user.role == 'admin':
        return True
    return any(p.id == pid for p in user.properties)


@expenses_bp.route('/api/properties/<int:pid>/expenses', methods=['GET'])
@jwt_required()
def list_expenses(pid):
    user = User.query.get(int(get_jwt_identity()))
    if not check_property_access(user, pid):
        return jsonify({'error': 'Kein Zugriff'}), 403
    category = request.args.get('category')
    q = Expense.query.filter_by(property_id=pid)
    if category:
        q = q.filter_by(category=category)
    expenses = q.order_by(Expense.invoice_date.desc()).all()
    result = []
    for e in expenses:
        d = e.to_dict()
        d['attachment_count'] = FileAttachment.query.filter_by(entity_type='expense', entity_id=e.id).count()
        result.append(d)
    return jsonify(result)


@expenses_bp.route('/api/properties/<int:pid>/expenses', methods=['POST'])
@jwt_required()
def create_expense(pid):
    user = User.query.get(int(get_jwt_identity()))
    if not check_property_access(user, pid):
        return jsonify({'error': 'Kein Zugriff'}), 403

    if request.content_type and 'multipart' in request.content_type:
        vendor = request.form.get('vendor')
        invoice_date_str = request.form.get('invoice_date')
        invoice_number = request.form.get('invoice_number', '')
        net = float(request.form.get('net_amount'))
        vat_rate = float(request.form.get('vat_rate', '19'))
        description = request.form.get('description', '')
        category = request.form.get('category', '')
        contact_id = request.form.get('contact_id') or None
        files = request.files.getlist('files')
    else:
        data = request.get_json()
        vendor = data['vendor']
        invoice_date_str = data['invoice_date']
        invoice_number = data.get('invoice_number', '')
        net = data['net_amount']
        vat_rate = data.get('vat_rate', 19.0)
        description = data.get('description', '')
        category = data.get('category', '')
        contact_id = data.get('contact_id') or None
        files = []

    if contact_id:
        contact_id = int(contact_id)

    vat_amount = round(net * vat_rate / 100, 2)
    gross = round(net + vat_amount, 2)
    expense = Expense(
        property_id=pid,
        contact_id=contact_id,
        vendor=vendor,
        invoice_date=date.fromisoformat(invoice_date_str),
        invoice_number=invoice_number,
        net_amount=net,
        vat_rate=vat_rate,
        vat_amount=vat_amount,
        gross_amount=gross,
        description=description,
        category=category,
    )
    db.session.add(expense)
    db.session.flush()

    # Save file attachments
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    for f in files:
        ext = os.path.splitext(f.filename)[1].lower()
        stored = f'{uuid.uuid4().hex}{ext}'
        f.save(os.path.join(UPLOAD_DIR, stored))
        ftype = 'pdf' if ext == '.pdf' else 'image'
        att = FileAttachment(
            entity_type='expense', entity_id=expense.id,
            original_filename=f.filename, stored_filename=stored, file_type=ftype,
        )
        db.session.add(att)

    db.session.commit()
    log_activity(user.id, 'create', 'expense', expense.id, f'Ausgabe {vendor}: {gross}€')
    return jsonify(expense.to_dict()), 201


@expenses_bp.route('/api/expenses/scan', methods=['POST'])
@jwt_required()
def scan_invoice():
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'Keine Datei hochgeladen'}), 400
    image_bytes = file.read()
    ext = os.path.splitext(file.filename)[1].lower()
    file_type = 'pdf' if ext == '.pdf' else 'image'
    try:
        from ai_service import scan_invoice as ai_scan
        result = ai_scan(image_bytes, file_type)

        # Auto-create or find contact from scan data
        vendor_name = result.get('vendor')
        if vendor_name:
            contact = Contact.query.filter(
                db.func.lower(Contact.name) == vendor_name.lower()
            ).first()
            if contact:
                # Update missing fields
                if not contact.phone and result.get('contact_phone'):
                    contact.phone = result['contact_phone']
                if not contact.email and result.get('contact_email'):
                    contact.email = result['contact_email']
                if not contact.address and result.get('contact_address'):
                    contact.address = result['contact_address']
                db.session.commit()
            else:
                contact = Contact(
                    name=vendor_name,
                    phone=result.get('contact_phone') or '',
                    email=result.get('contact_email') or '',
                    address=result.get('contact_address') or '',
                )
                db.session.add(contact)
                db.session.commit()
            result['contact_id'] = contact.id
            result['contact_name'] = contact.name

        return jsonify(result)
    except Exception as e:
        return jsonify({'error': f'KI-Analyse fehlgeschlagen: {str(e)}'}), 500


@expenses_bp.route('/api/expenses/<int:eid>/attachments', methods=['GET'])
@jwt_required()
def list_attachments(eid):
    expense = Expense.query.get_or_404(eid)
    user = User.query.get(int(get_jwt_identity()))
    if not check_property_access(user, expense.property_id):
        return jsonify({'error': 'Kein Zugriff'}), 403
    atts = FileAttachment.query.filter_by(entity_type='expense', entity_id=eid).all()
    return jsonify([a.to_dict() for a in atts])


@expenses_bp.route('/api/expenses/<int:eid>/attachments', methods=['POST'])
@jwt_required()
def add_attachment(eid):
    expense = Expense.query.get_or_404(eid)
    user = User.query.get(int(get_jwt_identity()))
    if not check_property_access(user, expense.property_id):
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
        entity_type='expense', entity_id=eid,
        original_filename=file.filename, stored_filename=stored, file_type=ftype,
    )
    db.session.add(att)
    db.session.commit()
    log_activity(user.id, 'create', 'attachment', att.id, f'Anhang zu Ausgabe #{eid}')
    return jsonify(att.to_dict()), 201


@expenses_bp.route('/api/attachments/<int:aid>', methods=['DELETE'])
@jwt_required()
def delete_attachment(aid):
    att = FileAttachment.query.get_or_404(aid)
    user = User.query.get(int(get_jwt_identity()))
    # Determine property access based on entity
    if att.entity_type == 'expense':
        expense = Expense.query.get(att.entity_id)
        if expense and not check_property_access(user, expense.property_id):
            return jsonify({'error': 'Kein Zugriff'}), 403
    folder = 'expenses' if att.entity_type == 'expense' else 'recurring_costs'
    filepath = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', folder, att.stored_filename)
    if os.path.exists(filepath):
        os.remove(filepath)
    db.session.delete(att)
    db.session.commit()
    log_activity(user.id, 'delete', 'attachment', aid, 'Anhang gelöscht')
    return jsonify({'message': 'Gelöscht'})


@expenses_bp.route('/api/expenses/<int:eid>', methods=['PUT'])
@jwt_required()
def update_expense(eid):
    expense = Expense.query.get_or_404(eid)
    user = User.query.get(int(get_jwt_identity()))
    if not check_property_access(user, expense.property_id):
        return jsonify({'error': 'Kein Zugriff'}), 403
    data = request.get_json()
    if 'vendor' in data:
        expense.vendor = data['vendor']
    if 'invoice_date' in data:
        expense.invoice_date = date.fromisoformat(data['invoice_date'])
    if 'invoice_number' in data:
        expense.invoice_number = data['invoice_number']
    if 'net_amount' in data:
        expense.net_amount = data['net_amount']
    if 'vat_rate' in data:
        expense.vat_rate = data['vat_rate']
    if 'description' in data:
        expense.description = data['description']
    if 'category' in data:
        expense.category = data['category']
    if 'contact_id' in data:
        expense.contact_id = data['contact_id'] or None
    expense.vat_amount = round(expense.net_amount * expense.vat_rate / 100, 2)
    expense.gross_amount = round(expense.net_amount + expense.vat_amount, 2)
    db.session.commit()
    log_activity(user.id, 'update', 'expense', eid, 'Ausgabe aktualisiert')
    return jsonify(expense.to_dict())


@expenses_bp.route('/api/expenses/<int:eid>', methods=['DELETE'])
@jwt_required()
def delete_expense(eid):
    expense = Expense.query.get_or_404(eid)
    user = User.query.get(int(get_jwt_identity()))
    if not check_property_access(user, expense.property_id):
        return jsonify({'error': 'Kein Zugriff'}), 403
    # Delete attachments
    atts = FileAttachment.query.filter_by(entity_type='expense', entity_id=eid).all()
    for att in atts:
        filepath = os.path.join(UPLOAD_DIR, att.stored_filename)
        if os.path.exists(filepath):
            os.remove(filepath)
        db.session.delete(att)
    db.session.delete(expense)
    db.session.commit()
    log_activity(user.id, 'delete', 'expense', eid, 'Ausgabe gelöscht')
    return jsonify({'message': 'Gelöscht'})
