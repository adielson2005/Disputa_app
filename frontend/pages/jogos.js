// ── Página: Jogos ─────────────────────────────────────────────────────────────
import { getJogos, gerarJogos } from "../services/api.js";
import { getCampeonatoId } from "../store.js";
import { abrir as abrirModal, sincronizarSeAberto, statusLabel } from "../components/modal.js";

const STATUS_CARD_CLS = {
  nao_iniciado:   "",
  primeiro_tempo: "live",
  intervalo:      "intervalo",
  segundo_tempo:  "live",
  encerrado:      "encerrado",
};

let _initialized = false;
let _jogos = [];

export function init() {
  if (_initialized) return;
  _initialized = true;
  _el("btn-gerar-jogos").addEventListener("click", _handleGerar);
  _el("jogos-list").addEventListener("click", e => {
    const card = e.target.closest(".jogo-card");
    if (!card) return;
    const jogo = _jogos.find(j => j.id === parseInt(card.dataset.id));
    if (jogo) abrirModal(jogo);
  });
}

export async function load()    { await refresh(); }
export async function refresh() {
  const id = _getCampeonatoId();
  if (!id) return;
  try {
    _jogos = await getJogos(id);
    _render();
    sincronizarSeAberto(_jogos);
  } catch (e) { console.error("Erro ao listar jogos", e); }
}

// ── Internos ──────────────────────────────────────────────────────────────────

function _render() {
  const el = _el("jogos-list");
  if (!el) return;

  if (!_jogos.length) {
    el.innerHTML = `
      <div class="aviso-empty">
        <i class="bi bi-calendar2-x"></i>
        <p>Nenhum jogo gerado ainda</p>
        <sub>Clique em "Gerar Jogos" para criar a grade de partidas.</sub>
      </div>`;
    return;
  }

  // Agrupar por rodada
  const rodadas = {};
  _jogos.forEach(j => {
    const r = j.rodada ?? 0;
    if (!rodadas[r]) rodadas[r] = [];
    rodadas[r].push(j);
  });

  const keys = Object.keys(rodadas).sort((a, b) => +a - +b);

  el.innerHTML = keys.map(r => {
    const jogosRodada = rodadas[r];
    const header = r > 0 ? `<div class="jogos-rodada-header">Rodada ${r}</div>` : "";
    const cards = jogosRodada.map(j => {
      const liveCls  = STATUS_CARD_CLS[j.status] || "";
      const placarA  = j.placar_a ?? 0;
      const placarB  = j.placar_b ?? 0;
      const winA = j.status === "encerrado" && placarA > placarB;
      const winB = j.status === "encerrado" && placarB > placarA;
      const isPlayed = j.status !== "nao_iniciado";
      return `
        <div class="jogo-card ${liveCls}" data-id="${j.id}">
          <div class="jogo-card-team">
            <span class="jogo-card-team-name${winA ? " winner" : ""}">${_esc(j.time_a)}</span>
          </div>
          <div class="jogo-card-score-area">
            ${isPlayed
              ? `<div class="jogo-card-score">
                  <span>${placarA}</span>
                  <span class="jogo-card-score-sep">–</span>
                  <span>${placarB}</span>
                 </div>`
              : `<div class="jogo-card-score-vs">VS</div>`}
            <span class="jogo-status-badge status-${j.status}">${statusLabel(j.status)}</span>
          </div>
          <div class="jogo-card-team">
            <span class="jogo-card-team-name${winB ? " winner" : ""}">${_esc(j.time_b)}</span>
          </div>
        </div>`;
    }).join("");
    return header + `<div class="jogos-list">${cards}</div>`;
  }).join("");
}

async function _handleGerar() {
  const id = _getCampeonatoId();
  if (!id) return;
  try {
    await gerarJogos(id);
    await refresh();
  } catch (e) { console.error("Erro ao gerar jogos", e); }
}

function _getCampeonatoId() { return getCampeonatoId(); }
function _el(id) { return document.getElementById(id); }
function _esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
