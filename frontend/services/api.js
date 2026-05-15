// ── Camada de comunicação com a API ──────────────────────────────────────────
// Todos os endpoints estão sob /api (prefixo definido nos blueprints Flask).

const BASE = "/api";

function _authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${localStorage.getItem("disputaapp_token") || ""}`,
  };
}

async function _req(method, path, body = null, auth = false) {
  const headers = auth ? _authHeaders() : { "Content-Type": "application/json" };
  const opts    = { method, headers };
  if (body !== null) opts.body = JSON.stringify(body);
  const res  = await fetch(BASE + path, opts);
  const data = await res.json();
  if (!res.ok) {
    // Token expirado/inválido → notifica o app para fazer logout
    if (res.status === 401 && auth) {
      document.dispatchEvent(new CustomEvent("disputaapp:unauthorized"));
    }
    throw { status: res.status, ...data };
  }
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login         = (email, senha) => _req("POST",   "/login",    { email, senha });
export const register      = (email, senha) => _req("POST",   "/register", { email, senha });
export const loginGoogle   = (credential)   => _req("POST",   "/auth/google", { credential });
export const deleteAccount = ()             => _req("DELETE", "/user",     null, true);

// ── Campeonatos ───────────────────────────────────────────────────────────────
// Sem user_id na URL — o backend usa o token JWT para identificar o usuário
export const getCampeonatos   = ()     => _req("GET",    "/campeonatos",       null, true);
export const createCampeonato = (data) => _req("POST",   "/campeonatos",       data, true);
export const deleteCampeonato = (id)   => _req("DELETE", `/campeonatos/${id}`, null, true);
export const updateCampeonatoImagem = (id, tipo, url) =>
  _req("PATCH", `/campeonatos/${id}/imagem`, { tipo, url }, true);

// ── Times ─────────────────────────────────────────────────────────────────────
export const getTimes   = (campeonatoId) => _req("GET",  `/times/${campeonatoId}`,   null, true);
export const createTime = (data)         => _req("POST", "/times",                   data, true);

// ── Jogos ─────────────────────────────────────────────────────────────────────
export const getJogos   = (campeonatoId) => _req("GET",  `/jogos/${campeonatoId}`,          null, true);
export const gerarJogos = (campeonatoId) => _req("POST", `/gerar-jogos/${campeonatoId}`,    null, true);
export const mudarStatus  = (id, acao, duracao) =>
  _req("POST", `/jogos/${id}/status`, { acao, duracao }, true);
export const registrarGol = (id, lado, delta) =>
  _req("POST", `/jogos/${id}/gol`, { lado, delta }, true);
export const registrarCartao = (id, lado, tipo, delta) =>
  _req("POST", `/jogos/${id}/cartao`, { lado, tipo, delta }, true);

// ── Classificação ──────────────────────────────────────────────────────────────
export const getClassificacao = (campeonatoId) =>
  _req("GET", `/classificacao/${campeonatoId}`, null, true);
