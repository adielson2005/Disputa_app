// ── Modal de partida ──────────────────────────────────────────────────────────
import { mudarStatus, registrarGol, registrarCartao } from "../services/api.js";

let _jogo    = null;
let _timer   = null;

const STATUS_LABELS = {
  aguardando:     "Aguardando",
  primeiro_tempo: "1º Tempo",
  intervalo:      "Intervalo",
  segundo_tempo:  "2º Tempo",
  encerrado:      "Encerrado",
};

export const statusLabel = (s) => STATUS_LABELS[s] || s;

// ── API pública ───────────────────────────────────────────────────────────────

export function abrir(jogo) {
  _jogo = jogo;
  _el("modal-time-a").textContent  = jogo.time_a;
  _el("modal-time-b").textContent  = jogo.time_b;
  _el("modal-score-a").textContent = jogo.placar_a;
  _el("modal-score-b").textContent = jogo.placar_b;
  _syncCartoes(jogo);
  _syncDuracao(jogo.duracao);
  _syncBotoes(jogo.status);
  _el("modal-jogo").classList.add("open");
  clearInterval(_timer);
  _timer = setInterval(_tick, 1000);
  _tick();
}

export function fechar() {
  clearInterval(_timer);
  _timer = null;
  _jogo  = null;
  _el("modal-jogo").classList.remove("open");
}

export async function gol(lado, delta) {
  if (!_jogo) return;
  try {
    const d = await registrarGol(_jogo.id, lado, delta);
    _el("modal-score-a").textContent = d.placar_a;
    _el("modal-score-b").textContent = d.placar_b;
    _jogo.placar_a = d.placar_a;
    _jogo.placar_b = d.placar_b;
  } catch (e) { console.error("Erro ao registrar gol", e); }
}

export async function cartao(lado, tipo, delta) {
  if (!_jogo) return;
  try {
    const d = await registrarCartao(_jogo.id, lado, tipo, delta);
    _jogo.amarelos_a  = d.amarelos_a;
    _jogo.amarelos_b  = d.amarelos_b;
    _jogo.vermelhos_a = d.vermelhos_a;
    _jogo.vermelhos_b = d.vermelhos_b;
    _syncCartoes(_jogo);
  } catch (e) { console.error("Erro ao registrar cartão", e); }
}

export async function avancarStatus(acao) {
  if (!_jogo) return;
  const duracao = _getDuracao();
  try {
    const d = await mudarStatus(_jogo.id, acao, duracao);
    _jogo = { ..._jogo, ...d, duracao };
    _syncBotoes(d.status);
  } catch (e) { console.error("Erro ao mudar status", e); }
}

/** Atualiza o modal com dados novos vindos do polling, se estiver aberto. */
export function sincronizarSeAberto(jogos) {
  if (!_jogo) return;
  const novo = jogos.find(j => j.id === _jogo.id);
  if (!novo) return;
  _jogo = novo;
  _el("modal-score-a").textContent = novo.placar_a;
  _el("modal-score-b").textContent = novo.placar_b;
  _syncCartoes(novo);
  _syncBotoes(novo.status);
}

// ── Internos ──────────────────────────────────────────────────────────────────

function _getDuracao() {
  const sel = _el("modalDuracaoSelect");
  return sel.value === "custom"
    ? parseInt(_el("duracaoCustom").value) || 45
    : parseInt(sel.value);
}

function _tick() {
  if (!_jogo) return;
  let elapsed = _jogo.tempo_acumulado || 0;
  if (
    (_jogo.status === "primeiro_tempo" || _jogo.status === "segundo_tempo") &&
    _jogo.tempo_inicio
  ) {
    elapsed += Math.floor(Date.now() / 1000 - _jogo.tempo_inicio);
  }
  const min = Math.floor(elapsed / 60);
  const sec = elapsed % 60;
  const disp = _el("timer-display");
  disp.textContent = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  const duracao = _getDuracao();
  disp.classList.toggle("timer-overtime", duracao > 0 && min >= duracao);
}

function _syncDuracao(duracao) {
  const sel    = _el("modalDuracaoSelect");
  const custom = _el("duracaoCustom");
  const known  = ["45", "20", "10", "30", "25"];
  if (known.includes(String(duracao))) {
    sel.value            = String(duracao);
    custom.style.display = "none";
  } else {
    sel.value            = "custom";
    custom.style.display = "";
    custom.value         = duracao;
  }
}

function _syncBotoes(status) {
  const badge = _el("modal-status-badge");
  badge.textContent = STATUS_LABELS[status] || status;
  badge.className   = "status-badge-modal";
  if (status === "primeiro_tempo" || status === "segundo_tempo")
    badge.classList.add("ativo");
  else if (status === "intervalo")  badge.classList.add("intervalo-st");
  else if (status === "encerrado")  badge.classList.add("encerrado-st");

  _el("btn-iniciar").disabled   = status !== "aguardando";
  _el("btn-intervalo").disabled = status !== "primeiro_tempo";
  _el("btn-segundo").disabled   = status !== "intervalo";
  _el("btn-encerrar").disabled  =
    status !== "segundo_tempo" && status !== "primeiro_tempo";

  const activeMap = {
    primeiro_tempo: "btn-iniciar",
    intervalo:      "btn-intervalo",
    segundo_tempo:  "btn-segundo",
    encerrado:      "btn-encerrar",
  };
  ["btn-iniciar", "btn-intervalo", "btn-segundo", "btn-encerrar"].forEach(id =>
    _el(id).classList.remove("btn-ativo")
  );
  if (activeMap[status]) _el(activeMap[status]).classList.add("btn-ativo");
}

function _el(id) { return document.getElementById(id); }

function _syncCartoes(jogo) {
  _el("modal-am-a").textContent  = jogo.amarelos_a  || 0;
  _el("modal-am-b").textContent  = jogo.amarelos_b  || 0;
  _el("modal-verm-a").textContent = jogo.vermelhos_a || 0;
  _el("modal-verm-b").textContent = jogo.vermelhos_b || 0;
}
