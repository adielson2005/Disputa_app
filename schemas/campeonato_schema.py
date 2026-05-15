from marshmallow import Schema, fields, validate, validates, ValidationError


class CampeonatoSchema(Schema):
    nome = fields.String(
        required=True,
        validate=validate.Length(min=3, max=100, error="Nome deve ter entre 3 e 100 caracteres"),
    )
    modalidade = fields.String(
        required=True,
        validate=validate.Length(min=2, max=50, error="Modalidade inválida"),
    )
    descricao = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=255))
    duracao_padrao = fields.Integer(
        load_default=45,
        validate=validate.Range(min=1, max=300, error="Duração deve ser entre 1 e 300 minutos"),
    )
    pontos_vitoria = fields.Integer(
        load_default=3,
        validate=validate.Range(min=1, max=10, error="Pontos por vitória deve ser entre 1 e 10"),
    )
    ida_volta  = fields.Boolean(load_default=False)
    formato    = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=50))
    categoria  = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=50))
    sub_formato = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=50))
    fase_inicial = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=50))
