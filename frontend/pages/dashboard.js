// -- P�gina: Dashboard (contexto geral) ----------------------------------------
import { getCampeonatos } from "../services/api.js";
import { getUsuario } from "../store.js";

let _campeonatos = [];
let _initialized = false;

export function init() {
  if (_initialized) return;
  _initialized = true;
  document.getElementById("dash-lista-campeonatos")?.addEventListener("click", e => {
    const card = e.target.closest(".dash-camp-card[data-id]");
    if (!card) return;
    const camp = _campeonatos.find(c => c.id === parseInt(card.dataset.id));
    if (camp)
      document.dispatchEvent(new CustomEvent("golapp:abrir-campeonato", { detail: camp }));
  });
}

export async function load()    { await refresh(); }
export async function refresh() {
  if (!getUsuario()) return;
  try {
    _campeonatos = await getCampeonatos();
    _render();
  } catch (e) {
    if (e?.status !== 401) console.error("Dashboard load error", e);
  }
}

function _saudacao() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function _renderHero() {
  const hero = document.getElementById("dash-hero");
  if (!hero) return;
  const usuario = getUsuario();
  const nome = usuario?.email?.split("@")[0] || "Treinador";
  const total = _campeonatos.length;
  const modalidades = [...new Set(_campeonatos.map(c => c.modalidade).filter(Boolean))];

  const chipsHtml = total === 0
    ? `<div class="dash-hero-chip"><i class="bi bi-info-circle"></i> Nenhum campeonato ainda</div>`
    : [
        `<div class="dash-hero-chip"><i class="bi bi-trophy-fill"></i> ${total} campeonato${total !== 1 ? "s" : ""}</div>`,
        modalidades.length > 0
          ? `<div class="dash-hero-chip"><i class="bi bi-tag-fill"></i> ${modalidades.slice(0, 2).join(" · ")}</div>`
          : "",
      ].join("");

  hero.innerHTML = `
    <div class="dash-hero-greeting">${_saudacao()}, <span class="dash-hero-nome">${nome}</span></div>
    <div class="dash-hero-chips">${chipsHtml}</div>`;
}

function _render() {
  const el = document.getElementById("dash-lista-campeonatos");
  if (!el) return;
  _renderHero();
  if (!_campeonatos.length) {
    el.innerHTML = `
      <div class="dash-empty">
        <i class="bi bi-trophy" style="font-size:32px;color:var(--faint);display:block;margin-bottom:10px"></i>
        <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px">Nenhum campeonato ainda</div>
        <div style="font-size:12px;color:var(--muted)">Va em Campeonatos para criar o seu primeiro.</div>
      </div>`;
    return;
  }
  el.innerHTML = _campeonatos.map(c => `
    <div class="dash-camp-card" data-id="${c.id}">
      <div class="dash-camp-icon"><i class="bi bi-trophy-fill"></i></div>
      <div class="dash-camp-info">
        <div class="dash-camp-nome">${c.nome}</div>
        <div class="dash-camp-meta">${c.modalidade || "Geral"}</div>
      </div>
      <i class="bi bi-chevron-right dash-camp-arrow"></i>
    </div>`).join("");
}
