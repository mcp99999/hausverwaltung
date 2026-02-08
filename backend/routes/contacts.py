import os
import uuid
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Contact, User
from activity_logger import log_activity

contacts_bp = Blueprint('contacts', __name__)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'contacts')


@contacts_bp.route('/api/contacts', methods=['GET'])
@jwt_required()
def list_contacts():
    q = request.args.get('q', '').strip()
    query = Contact.query
    if q:
        like = f'%{q}%'
        query = query.filter(
            db.or_(
                Contact.name.ilike(like),
                Contact.company.ilike(like),
                Contact.email.ilike(like),
                Contact.phone.ilike(like),
            )
        )
    contacts = query.order_by(Contact.name).all()
    return jsonify([c.to_dict() for c in contacts])


@contacts_bp.route('/api/contacts/<int:cid>', methods=['GET'])
@jwt_required()
def get_contact(cid):
    contact = Contact.query.get_or_404(cid)
    return jsonify(contact.to_dict())


@contacts_bp.route('/api/contacts', methods=['POST'])
@jwt_required()
def create_contact():
    user = User.query.get(int(get_jwt_identity()))
    data = request.get_json()
    contact = Contact(
        name=data['name'],
        company=data.get('company', ''),
        address=data.get('address', ''),
        phone=data.get('phone', ''),
        email=data.get('email', ''),
        website=data.get('website', ''),
        tax_id=data.get('tax_id', ''),
        notes=data.get('notes', ''),
    )
    db.session.add(contact)
    db.session.commit()
    log_activity(user.id, 'create', 'contact', contact.id, f'Kontakt: {contact.name}')
    return jsonify(contact.to_dict()), 201


@contacts_bp.route('/api/contacts/<int:cid>', methods=['PUT'])
@jwt_required()
def update_contact(cid):
    user = User.query.get(int(get_jwt_identity()))
    contact = Contact.query.get_or_404(cid)
    data = request.get_json()
    for field in ['name', 'company', 'address', 'phone', 'email', 'website', 'tax_id', 'notes']:
        if field in data:
            setattr(contact, field, data[field])
    db.session.commit()
    log_activity(user.id, 'update', 'contact', cid, 'Kontakt aktualisiert')
    return jsonify(contact.to_dict())


@contacts_bp.route('/api/contacts/<int:cid>', methods=['DELETE'])
@jwt_required()
def delete_contact(cid):
    user = User.query.get(int(get_jwt_identity()))
    contact = Contact.query.get_or_404(cid)
    # Remove photo if exists
    if contact.photo_filename:
        filepath = os.path.join(UPLOAD_DIR, contact.photo_filename)
        if os.path.exists(filepath):
            os.remove(filepath)
    db.session.delete(contact)
    db.session.commit()
    log_activity(user.id, 'delete', 'contact', cid, f'Kontakt gelöscht: {contact.name}')
    return jsonify({'message': 'Gelöscht'})


@contacts_bp.route('/api/contacts/scan', methods=['POST'])
@jwt_required()
def scan_business_card():
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'Keine Datei hochgeladen'}), 400
    image_bytes = file.read()
    try:
        from ai_service import scan_business_card as ai_scan
        result = ai_scan(image_bytes)

        # Save photo
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        ext = os.path.splitext(file.filename)[1].lower() or '.jpg'
        stored = f'{uuid.uuid4().hex}{ext}'
        with open(os.path.join(UPLOAD_DIR, stored), 'wb') as f:
            f.write(image_bytes)

        result['photo_filename'] = stored
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': f'KI-Analyse fehlgeschlagen: {str(e)}'}), 500
