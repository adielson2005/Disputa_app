// ── Página: Jogos ─────────────────────────────────────────────────────────────
import { getJogos, gerarJogos } from "../services/api.js";
import { getCampeonatoId } from "../store.js";
import { abrir as abrirModal, sincronizarSeAberto, statusLabel } from "../components/modal.js";

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
  el.innerHTML = _jogos.length
    ? _jogos.map(j => `
        <div class="jogo-card" data-id="${j.id}">
          <strong>${j.time_a}</strong>
          <span class="placar-display">${j.placar_a} \u2013 ${j.placar_b}</span>
          <strong>${j.time_b}</strong>
          <span class="jogo-status-badge status-${j.status}">${statusLabel(j.status)}</span>
        </div>`).join("")
    : '<p style="color:var(--faint);font-size:12px">Nenhum jogo gerado.</p>';
}

async function _handleGerar() {
  const id = _getCampeonatoId();
  if (!id) return;
  try {
    await gerarJogos(id);
    await refresh();
  } catch (e) { console.error("Erro ao gerar jogos", e); }
}

function _getCampeonatoId() {
  return getCampeonatoId();
}

function _el(id) { return document.getElementById(id); }
