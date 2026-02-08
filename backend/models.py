from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date

db = SQLAlchemy()

user_property = db.Table(
    'user_property',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('property_id', db.Integer, db.ForeignKey('property.id'), primary_key=True),
)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='user')
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    properties = db.relationship('Property', secondary=user_property, backref='users')
    creator = db.relationship('User', remote_side='User.id', foreign_keys=[created_by])

    @property
    def is_admin(self):
        return self.role == 'admin'

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'role': self.role,
            'is_admin': self.is_admin,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat(),
            'property_ids': [p.id for p in self.properties],
        }


class Property(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    address = db.Column(db.String(500))
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    meter_readings = db.relationship('MeterReading', backref='property', cascade='all, delete-orphan')
    tariffs = db.relationship('Tariff', backref='property', cascade='all, delete-orphan')
    expenses = db.relationship('Expense', backref='property', cascade='all, delete-orphan')
    recurring_costs = db.relationship('RecurringCost', backref='property', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'address': self.address,
            'description': self.description,
            'created_at': self.created_at.isoformat(),
        }


class MeterReading(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('property.id'), nullable=False)
    meter_type = db.Column(db.String(50), nullable=False)
    reading_value = db.Column(db.Float, nullable=False)
    reading_date = db.Column(db.Date, nullable=False)
    notes = db.Column(db.Text)
    photo_filename = db.Column(db.String(500), nullable=True)

    def to_dict(self):
        d = {
            'id': self.id,
            'property_id': self.property_id,
            'meter_type': self.meter_type,
            'reading_value': self.reading_value,
            'reading_date': self.reading_date.isoformat(),
            'notes': self.notes,
        }
        if self.photo_filename:
            d['photo_url'] = f'/api/uploads/meters/{self.photo_filename}'
        return d


class Tariff(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('property.id'), nullable=False)
    tariff_type = db.Column(db.String(50), nullable=False)
    price_per_unit = db.Column(db.Float, nullable=False)
    base_cost_monthly = db.Column(db.Float, default=0.0)
    valid_from = db.Column(db.Date, nullable=False)
    valid_to = db.Column(db.Date, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'tariff_type': self.tariff_type,
            'price_per_unit': self.price_per_unit,
            'base_cost_monthly': self.base_cost_monthly,
            'valid_from': self.valid_from.isoformat(),
            'valid_to': self.valid_to.isoformat() if self.valid_to else None,
        }


class Contact(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    company = db.Column(db.String(200))
    address = db.Column(db.String(500))
    phone = db.Column(db.String(50))
    email = db.Column(db.String(200))
    website = db.Column(db.String(300))
    tax_id = db.Column(db.String(50))
    notes = db.Column(db.Text)
    photo_filename = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        d = {
            'id': self.id,
            'name': self.name,
            'company': self.company,
            'address': self.address,
            'phone': self.phone,
            'email': self.email,
            'website': self.website,
            'tax_id': self.tax_id,
            'notes': self.notes,
            'created_at': self.created_at.isoformat(),
        }
        if self.photo_filename:
            d['photo_url'] = f'/api/uploads/contacts/{self.photo_filename}'
        return d


class Expense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('property.id'), nullable=False)
    contact_id = db.Column(db.Integer, db.ForeignKey('contact.id'), nullable=True)
    contact = db.relationship('Contact', backref='expenses')
    vendor = db.Column(db.String(200), nullable=False)
    invoice_date = db.Column(db.Date, nullable=False)
    invoice_number = db.Column(db.String(100))
    net_amount = db.Column(db.Float, nullable=False)
    vat_rate = db.Column(db.Float, default=19.0)
    vat_amount = db.Column(db.Float)
    gross_amount = db.Column(db.Float)
    description = db.Column(db.Text)
    category = db.Column(db.String(100))

    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'contact_id': self.contact_id,
            'contact_name': self.contact.name if self.contact else None,
            'vendor': self.vendor,
            'invoice_date': self.invoice_date.isoformat(),
            'invoice_number': self.invoice_number,
            'net_amount': self.net_amount,
            'vat_rate': self.vat_rate,
            'vat_amount': self.vat_amount,
            'gross_amount': self.gross_amount,
            'description': self.description,
            'category': self.category,
        }


class RecurringCost(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('property.id'), nullable=False)
    contact_id = db.Column(db.Integer, db.ForeignKey('contact.id'), nullable=True)
    contact = db.relationship('Contact', backref='recurring_costs')
    description = db.Column(db.Text, nullable=False)
    vendor = db.Column(db.String(200))
    monthly_amount = db.Column(db.Float, nullable=False)
    vat_rate = db.Column(db.Float, default=19.0)
    net_amount = db.Column(db.Float)
    gross_amount = db.Column(db.Float)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=True)
    category = db.Column(db.String(100))

    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'contact_id': self.contact_id,
            'contact_name': self.contact.name if self.contact else None,
            'description': self.description,
            'vendor': self.vendor,
            'monthly_amount': self.monthly_amount,
            'vat_rate': self.vat_rate,
            'net_amount': self.net_amount,
            'gross_amount': self.gross_amount,
            'start_date': self.start_date.isoformat(),
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'category': self.category,
        }


class FileAttachment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    entity_type = db.Column(db.String(50), nullable=False)  # 'expense' or 'recurring_cost'
    entity_id = db.Column(db.Integer, nullable=False)
    original_filename = db.Column(db.String(500), nullable=False)
    stored_filename = db.Column(db.String(500), nullable=False)
    file_type = db.Column(db.String(20), nullable=False)  # 'image' or 'pdf'
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        folder = 'expenses' if self.entity_type == 'expense' else 'recurring_costs'
        return {
            'id': self.id,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'original_filename': self.original_filename,
            'stored_filename': self.stored_filename,
            'file_type': self.file_type,
            'uploaded_at': self.uploaded_at.isoformat(),
            'url': f'/api/uploads/{folder}/{self.stored_filename}',
        }


class ActivityLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    username = db.Column(db.String(80), nullable=False)
    action = db.Column(db.String(50), nullable=False)
    entity_type = db.Column(db.String(50), nullable=False)
    entity_id = db.Column(db.Integer, nullable=True)
    details = db.Column(db.Text, default='')
    ip_address = db.Column(db.String(45), default='')
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.username,
            'action': self.action,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'details': self.details,
            'ip_address': self.ip_address,
            'timestamp': self.timestamp.isoformat(),
        }
