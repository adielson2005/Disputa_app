// ── Gerenciamento de estado global da aplicação ──────────────────────────────
// Token e usuário são persistidos no localStorage para restauração de sessão.

const _s = {
  usuario: JSON.parse(localStorage.getItem("golapp_usuario") || "null"),
  token:   localStorage.getItem("golapp_token") || null,
  campeonatoAtual: null, // { id, nome, modalidade }
};

export const getUsuario        = () => _s.usuario;
export const getToken          = () => _s.token;
export const getCampeonatoId   = () => _s.campeonatoAtual?.id ?? null;
export const getCampeonatoAtual = () => _s.campeonatoAtual;

export function setAuth(usuario, token) {
  _s.usuario = usuario;
  _s.token   = token;
  localStorage.setItem("golapp_token",   token);
  localStorage.setItem("golapp_usuario", JSON.stringify(usuario));
}

export function clearAuth() {
  _s.usuario = null;
  _s.token   = null;
  localStorage.removeItem("golapp_token");
  localStorage.removeItem("golapp_usuario");
}

export function setCampeonatoAtual(campeonato) {
  _s.campeonatoAtual = campeonato ?? null;
}

// Alias de compatibilidade (usado por módulos que importam setCampeonatoId)
export function setCampeonatoId(id) {
  if (_s.campeonatoAtual) _s.campeonatoAtual = { ..._s.campeonatoAtual, id };
  else _s.campeonatoAtual = id ? { id, nome: "", modalidade: "" } : null;
}
