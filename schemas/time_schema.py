from marshmallow import Schema, fields, validate


class TimeSchema(Schema):
    nome = fields.String(
        required=True,
        validate=validate.Length(min=1, max=100, error="Nome deve ter entre 1 e 100 caracteres"),
    )
    campeonato_id = fields.Integer(
        required=True,
        strict=True,
        validate=validate.Range(min=1, error="campeonato_id inválido"),
    )
