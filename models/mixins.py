"""
Mixins compartilhados pelos models do GolApp.

TimestampMixin  — created_at / updated_at em UTC
SoftDeleteMixin — deletado (boolean) em vez de DELETE físico
"""
from datetime import datetime, timezone

from extensions import db


def _now() -> datetime:
    return datetime.now(timezone.utc)


class TimestampMixin:
    """Adiciona created_at e updated_at em UTC a qualquer model."""

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=_now,
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=True,
        default=None,
        onupdate=_now,
    )


class SoftDeleteMixin:
    """Marca registros como deletados em vez de removê-los do banco."""

    deletado = db.Column(db.Boolean, nullable=False, default=False)
