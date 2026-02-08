import json
import base64
import os
from datetime import datetime, date
from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash
from models import db, User, Property, MeterReading, Tariff, Expense, RecurringCost, ActivityLog, FileAttachment, user_property
from activity_logger import log_activity

backup_bp = Blueprint('backup', __name__)

UPLOAD_BASE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')


def get_accessible_property_ids(user):
    if user.role == 'admin':
        return [p.id for p in Property.query.all()]
    return [p.id for p in user.properties]


class BackupEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)


@backup_bp.route('/api/backup/info', methods=['GET'])
@jwt_required()
def backup_info():
    user = User.query.get(int(get_jwt_identity()))
    if user.role == 'user':
        return jsonify({'error': 'Nicht berechtigt'}), 403

    prop_ids = get_accessible_property_ids(user)

    info = {
        'properties': len(prop_ids),
        'meter_readings': MeterReading.query.filter(MeterReading.property_id.in_(prop_ids)).count(),
        'tariffs': Tariff.query.filter(Tariff.property_id.in_(prop_ids)).count(),
        'expenses': Expense.query.filter(Expense.property_id.in_(prop_ids)).count(),
        'recurring_costs': RecurringCost.query.filter(RecurringCost.property_id.in_(prop_ids)).count(),
        'attachments': 0,
    }
    if user.role == 'admin':
        info['users'] = User.query.count()
        info['activity_logs'] = ActivityLog.query.count()
    else:
        info['users'] = User.query.filter(
            db.or_(User.id == user.id, User.created_by == user.id)
        ).count()

    # Count attachments
    expense_ids = [e.id for e in Expense.query.filter(Expense.property_id.in_(prop_ids)).all()]
    rc_ids = [c.id for c in RecurringCost.query.filter(RecurringCost.property_id.in_(prop_ids)).all()]
    att_count = 0
    if expense_ids:
        att_count += FileAttachment.query.filter(
            FileAttachment.entity_type == 'expense',
            FileAttachment.entity_id.in_(expense_ids)
        ).count()
    if rc_ids:
        att_count += FileAttachment.query.filter(
            FileAttachment.entity_type == 'recurring_cost',
            FileAttachment.entity_id.in_(rc_ids)
        ).count()
    # Meter photos
    att_count += MeterReading.query.filter(
        MeterReading.property_id.in_(prop_ids),
        MeterReading.photo_filename.isnot(None)
    ).count()
    info['attachments'] = att_count

    return jsonify(info)


@backup_bp.route('/api/backup', methods=['GET'])
@jwt_required()
def create_backup():
    user = User.query.get(int(get_jwt_identity()))
    if user.role == 'user':
        return jsonify({'error': 'Nicht berechtigt'}), 403

    prop_ids = get_accessible_property_ids(user)

    backup = {
        'version': '1.0',
        'created_at': datetime.utcnow().isoformat(),
        'created_by': user.username,
        'properties': [p.to_dict() for p in Property.query.filter(Property.id.in_(prop_ids)).all()],
        'meter_readings': [r.to_dict() for r in MeterReading.query.filter(MeterReading.property_id.in_(prop_ids)).all()],
        'tariffs': [t.to_dict() for t in Tariff.query.filter(Tariff.property_id.in_(prop_ids)).all()],
        'expenses': [e.to_dict() for e in Expense.query.filter(Expense.property_id.in_(prop_ids)).all()],
        'recurring_costs': [c.to_dict() for c in RecurringCost.query.filter(RecurringCost.property_id.in_(prop_ids)).all()],
    }

    # Users
    if user.role == 'admin':
        backup['users'] = [u.to_dict() for u in User.query.all()]
        # User-property assignments
        assignments = db.session.execute(
            user_property.select().where(user_property.c.property_id.in_(prop_ids))
        ).fetchall()
        backup['user_property'] = [{'user_id': a.user_id, 'property_id': a.property_id} for a in assignments]
    else:
        users = User.query.filter(db.or_(User.id == user.id, User.created_by == user.id)).all()
        backup['users'] = [u.to_dict() for u in users]
        user_ids = [u.id for u in users]
        assignments = db.session.execute(
            user_property.select().where(
                user_property.c.user_id.in_(user_ids),
                user_property.c.property_id.in_(prop_ids)
            )
        ).fetchall()
        backup['user_property'] = [{'user_id': a.user_id, 'property_id': a.property_id} for a in assignments]

    # File attachments with base64 data
    attachments = []
    expense_ids = [e['id'] for e in backup['expenses']]
    rc_ids = [c['id'] for c in backup['recurring_costs']]

    att_query_parts = []
    if expense_ids:
        att_query_parts.extend(
            FileAttachment.query.filter(FileAttachment.entity_type == 'expense', FileAttachment.entity_id.in_(expense_ids)).all()
        )
    if rc_ids:
        att_query_parts.extend(
            FileAttachment.query.filter(FileAttachment.entity_type == 'recurring_cost', FileAttachment.entity_id.in_(rc_ids)).all()
        )

    for att in att_query_parts:
        d = att.to_dict()
        folder = 'expenses' if att.entity_type == 'expense' else 'recurring_costs'
        filepath = os.path.join(UPLOAD_BASE, folder, att.stored_filename)
        if os.path.exists(filepath):
            with open(filepath, 'rb') as f:
                d['file_data'] = base64.b64encode(f.read()).decode('utf-8')
        attachments.append(d)
    backup['attachments'] = attachments

    # Meter photos as base64
    meter_photos = []
    for r in backup['meter_readings']:
        reading = MeterReading.query.get(r['id'])
        if reading and reading.photo_filename:
            filepath = os.path.join(UPLOAD_BASE, 'meters', reading.photo_filename)
            if os.path.exists(filepath):
                with open(filepath, 'rb') as f:
                    meter_photos.append({
                        'reading_id': r['id'],
                        'filename': reading.photo_filename,
                        'data': base64.b64encode(f.read()).decode('utf-8'),
                    })
    backup['meter_photos'] = meter_photos

    log_activity(user.id, 'export', 'backup', None, 'Backup erstellt')

    output = json.dumps(backup, cls=BackupEncoder, ensure_ascii=False, indent=2)
    return Response(
        output,
        mimetype='application/json',
        headers={'Content-Disposition': f'attachment; filename=hausverwaltung_backup_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.json'}
    )


@backup_bp.route('/api/restore', methods=['POST'])
@jwt_required()
def restore_backup():
    user = User.query.get(int(get_jwt_identity()))
    if user.role == 'user':
        return jsonify({'error': 'Nicht berechtigt'}), 403

    file = request.files.get('file')
    if not file:
        data = request.get_json()
    else:
        data = json.loads(file.read().decode('utf-8'))

    if not data:
        return jsonify({'error': 'Keine Backup-Daten'}), 400

    # ID mapping: old_id -> new_id
    prop_map = {}
    user_map = {}
    expense_map = {}
    rc_map = {}
    reading_map = {}

    try:
        # Restore properties
        for p in data.get('properties', []):
            existing = Property.query.filter_by(name=p['name']).first()
            if existing:
                prop_map[p['id']] = existing.id
                continue
            new_prop = Property(name=p['name'], address=p.get('address', ''), description=p.get('description', ''))
            db.session.add(new_prop)
            db.session.flush()
            prop_map[p['id']] = new_prop.id
            # Auto-assign to manager
            if user.role == 'manager':
                user.properties.append(new_prop)

        # Restore users (admin only for non-self users)
        for u in data.get('users', []):
            if u['username'] == user.username:
                user_map[u['id']] = user.id
                continue
            existing = User.query.filter_by(username=u['username']).first()
            if existing:
                user_map[u['id']] = existing.id
                continue
            if user.role == 'admin' or (user.role == 'manager' and u.get('role', 'user') == 'user'):
                new_user = User(
                    username=u['username'],
                    password_hash=generate_password_hash('changeme'),
                    role=u.get('role', 'user'),
                    created_by=user.id,
                )
                db.session.add(new_user)
                db.session.flush()
                user_map[u['id']] = new_user.id

        # Restore user-property assignments
        for up in data.get('user_property', []):
            new_uid = user_map.get(up['user_id'])
            new_pid = prop_map.get(up['property_id'])
            if new_uid and new_pid:
                u_obj = User.query.get(new_uid)
                p_obj = Property.query.get(new_pid)
                if u_obj and p_obj and p_obj not in u_obj.properties:
                    u_obj.properties.append(p_obj)

        # Restore meter readings
        for r in data.get('meter_readings', []):
            new_pid = prop_map.get(r['property_id'])
            if not new_pid:
                continue
            reading = MeterReading(
                property_id=new_pid,
                meter_type=r['meter_type'],
                reading_value=r['reading_value'],
                reading_date=date.fromisoformat(r['reading_date']),
                notes=r.get('notes', ''),
            )
            db.session.add(reading)
            db.session.flush()
            reading_map[r['id']] = reading.id

        # Restore tariffs
        for t in data.get('tariffs', []):
            new_pid = prop_map.get(t['property_id'])
            if not new_pid:
                continue
            tariff = Tariff(
                property_id=new_pid,
                tariff_type=t['tariff_type'],
                price_per_unit=t['price_per_unit'],
                base_cost_monthly=t.get('base_cost_monthly', 0.0),
                valid_from=date.fromisoformat(t['valid_from']),
                valid_to=date.fromisoformat(t['valid_to']) if t.get('valid_to') else None,
            )
            db.session.add(tariff)

        # Restore expenses
        for e in data.get('expenses', []):
            new_pid = prop_map.get(e['property_id'])
            if not new_pid:
                continue
            expense = Expense(
                property_id=new_pid,
                vendor=e['vendor'],
                invoice_date=date.fromisoformat(e['invoice_date']),
                invoice_number=e.get('invoice_number', ''),
                net_amount=e['net_amount'],
                vat_rate=e.get('vat_rate', 19.0),
                vat_amount=e.get('vat_amount'),
                gross_amount=e.get('gross_amount'),
                description=e.get('description', ''),
                category=e.get('category', ''),
            )
            db.session.add(expense)
            db.session.flush()
            expense_map[e['id']] = expense.id

        # Restore recurring costs
        for c in data.get('recurring_costs', []):
            new_pid = prop_map.get(c['property_id'])
            if not new_pid:
                continue
            cost = RecurringCost(
                property_id=new_pid,
                description=c['description'],
                vendor=c.get('vendor', ''),
                monthly_amount=c['monthly_amount'],
                vat_rate=c.get('vat_rate', 19.0),
                net_amount=c.get('net_amount'),
                gross_amount=c.get('gross_amount'),
                start_date=date.fromisoformat(c['start_date']),
                end_date=date.fromisoformat(c['end_date']) if c.get('end_date') else None,
                category=c.get('category', ''),
            )
            db.session.add(cost)
            db.session.flush()
            rc_map[c['id']] = cost.id

        # Restore file attachments
        for att in data.get('attachments', []):
            entity_id = None
            if att['entity_type'] == 'expense':
                entity_id = expense_map.get(att['entity_id'])
                folder = 'expenses'
            elif att['entity_type'] == 'recurring_cost':
                entity_id = rc_map.get(att['entity_id'])
                folder = 'recurring_costs'
            if not entity_id:
                continue
            new_att = FileAttachment(
                entity_type=att['entity_type'],
                entity_id=entity_id,
                original_filename=att['original_filename'],
                stored_filename=att['stored_filename'],
                file_type=att['file_type'],
            )
            db.session.add(new_att)
            # Save file data
            if att.get('file_data'):
                filepath = os.path.join(UPLOAD_BASE, folder, att['stored_filename'])
                os.makedirs(os.path.dirname(filepath), exist_ok=True)
                with open(filepath, 'wb') as f:
                    f.write(base64.b64decode(att['file_data']))

        # Restore meter photos
        for mp in data.get('meter_photos', []):
            new_rid = reading_map.get(mp['reading_id'])
            if new_rid:
                reading = MeterReading.query.get(new_rid)
                if reading:
                    reading.photo_filename = mp['filename']
                    filepath = os.path.join(UPLOAD_BASE, 'meters', mp['filename'])
                    os.makedirs(os.path.dirname(filepath), exist_ok=True)
                    with open(filepath, 'wb') as f:
                        f.write(base64.b64decode(mp['data']))

        db.session.commit()
        log_activity(user.id, 'import', 'backup', None, 'Backup wiederhergestellt')

        return jsonify({
            'message': 'Backup erfolgreich wiederhergestellt',
            'imported': {
                'properties': len(prop_map),
                'users': len(user_map),
                'meter_readings': len(reading_map),
                'expenses': len(expense_map),
                'recurring_costs': len(rc_map),
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Wiederherstellung fehlgeschlagen: {str(e)}'}), 500
