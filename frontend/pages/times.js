// ── Página: Times ─────────────────────────────────────────────────────────────
import { getTimes, createTime } from "../services/api.js";
import { getCampeonatoId } from "../store.js";

let _initialized = false;

export function init() {
  if (_initialized) return;
  _initialized = true;
  _el("btn-criar-time").addEventListener("click", _handleCriar);
  _el("nomeTime").addEventListener("keydown", e => {
    if (e.key === "Enter") _handleCriar();
  });
}

export async function load()    { await refresh(); }
export async function refresh() {
  const id = _getCampeonatoId();
  if (!id) return;
  try {
    const times = await getTimes(id);
    const el    = _el("lista-times-tela");
    if (!el) return;
    el.innerHTML = times.length
      ? times.map(t => `<div class="time-card">${t.nome}</div>`).join("")
      : '<span style="color:var(--faint);font-size:12px">Nenhum time cadastrado.</span>';
  } catch (e) { console.error("Erro ao listar times", e); }
}

// ── Internos ──────────────────────────────────────────────────────────────────

async function _handleCriar() {
  const nome = _el("nomeTime").value.trim();
  const id   = _getCampeonatoId();
  if (!nome || !id) return;
  try {
    await createTime({ nome, campeonato_id: id });
    _el("nomeTime").value = "";
    await refresh();
  } catch (e) { console.error("Erro ao criar time", e); }
}

function _getCampeonatoId() {
  return getCampeonatoId();
}

function _el(id) { return document.getElementById(id); }
