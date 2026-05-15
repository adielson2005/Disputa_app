from marshmallow import Schema, fields, validate

_ACOES_VALIDAS = ["iniciar", "intervalo", "retomar", "encerrar"]
_LADOS_VALIDOS = ["a", "b"]
_TIPOS_CARTAO  = ["amarelo", "vermelho"]


class JogoStatusSchema(Schema):
    acao = fields.String(
        required=True,
        validate=validate.OneOf(_ACOES_VALIDAS, error=f"acao deve ser um de: {_ACOES_VALIDAS}"),
    )
    duracao = fields.Integer(
        load_default=None,
        allow_none=True,
        validate=validate.Range(min=1, max=300, error="Duração deve ser entre 1 e 300 minutos"),
    )


class GolSchema(Schema):
    lado = fields.String(
        required=True,
        validate=validate.OneOf(_LADOS_VALIDOS, error="lado deve ser 'a' ou 'b'"),
    )
    delta = fields.Integer(
        load_default=1,
        validate=validate.Range(min=-10, max=10, error="delta deve ser entre -10 e 10"),
    )


class CartaoSchema(Schema):
    lado = fields.String(
        required=True,
        validate=validate.OneOf(_LADOS_VALIDOS, error="lado deve ser 'a' ou 'b'"),
    )
    tipo = fields.String(
        required=True,
        validate=validate.OneOf(_TIPOS_CARTAO, error="tipo deve ser 'amarelo' ou 'vermelho'"),
    )
    delta = fields.Integer(
        load_default=1,
        validate=validate.Range(min=-10, max=10, error="delta deve ser entre -10 e 10"),
    )
