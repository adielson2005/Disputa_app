// ── Página: Dashboard ─────────────────────────────────────────────────────────
import { getCampeonatos } from "../services/api.js";
import { getUsuario } from "../store.js";

const SPORT_ICONS = {
  futebol: "bi-dribbble", futsal: "bi-dribbble", fut7: "bi-dribbble",
  basquete: "bi-basket", "vôlei": "bi-disc", volei: "bi-disc",
  handebol: "bi-hand-index-thumb", hóquei: "bi-activity", hoquei: "bi-activity",
};

const STATUS_COLORS = {
  nao_iniciado: { cls: "camp-status-aguardando", label: "Aguardando" },
  em_andamento: { cls: "camp-status-ativo",      label: "Em andamento" },
  finalizado:   { cls: "camp-status-enc",         label: "Finalizado" },
};

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
      document.dispatchEvent(new CustomEvent("disputaapp:abrir-campeonato", { detail: camp }));
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
  if (h < 5)  return "Boa noite";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function _sportIcon(modalidade) {
  const key = (modalidade || "").toLowerCase();
  return SPORT_ICONS[key] || "bi-trophy-fill";
}

function _renderHero() {
  const hero = document.getElementById("dash-hero");
  if (!hero) return;
  const usuario = getUsuario();
  const nome = usuario?.email?.split("@")[0] || "Treinador";
  const total = _campeonatos.length;
  const ativos = _campeonatos.filter(c => c.status === "em_andamento").length;
  const modalidades = [...new Set(_campeonatos.map(c => c.modalidade).filter(Boolean))];

  hero.innerHTML = `
    <div class="dash-hero-greeting">${_saudacao()},<br><span class="dash-hero-nome">${_esc(nome)}</span> <span class="dash-hero-wave">👋</span></div>
    <div class="dash-hero-chips">
      ${total === 0
        ? `<div class="dash-hero-chip"><i class="bi bi-plus-circle"></i> Crie seu primeiro campeonato</div>`
        : `<div class="dash-hero-chip"><i class="bi bi-trophy-fill"></i> ${total} campeonato${total !== 1 ? "s" : ""}</div>
           ${ativos > 0 ? `<div class="dash-hero-chip chip-live"><span class="chip-live-dot"></span> ${ativos} em andamento</div>` : ""}
           ${modalidades.length > 0 ? `<div class="dash-hero-chip"><i class="bi bi-tag-fill"></i> ${modalidades.slice(0, 2).join(" · ")}</div>` : ""}`
      }
    </div>`;
}

function _renderStats() {
  const total   = _campeonatos.length;
  const ativos  = _campeonatos.filter(c => c.status === "em_andamento").length;
  const enc     = _campeonatos.filter(c => c.status === "finalizado").length;
  const modais  = new Set(_campeonatos.map(c => (c.modalidade || "").toLowerCase()).filter(Boolean)).size;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set("dash-stat-camps",  total  || "0");
  set("dash-stat-ativos", ativos || "0");
  set("dash-stat-enc",    enc    || "0");
  set("dash-stat-modal",  modais || "0");
}

function _render() {
  const el = document.getElementById("dash-lista-campeonatos");
  if (!el) return;
  _renderStats();
  _renderHero();

  if (!_campeonatos.length) {
    el.innerHTML = `
      <div class="dash-empty">
        <div class="dash-empty-icon"><i class="bi bi-trophy"></i></div>
        <h3>Nenhum campeonato ainda</h3>
        <p>Vá em Campeonatos para criar o seu primeiro.</p>
      </div>`;
    return;
  }

  el.innerHTML = _campeonatos.map(c => {
    const statusMeta = STATUS_COLORS[c.status] || STATUS_COLORS.nao_iniciado;
    const icon = _sportIcon(c.modalidade);
    return `
      <div class="dash-camp-card" data-id="${c.id}">
        <div class="dash-camp-icon"><i class="bi ${icon}"></i></div>
        <div class="dash-camp-info">
          <div class="dash-camp-nome">${_esc(c.nome)}</div>
          <div class="dash-camp-meta">${_esc(c.modalidade || "Geral")}${c.categoria && c.categoria !== "Livre" ? " · " + _esc(c.categoria) : ""}</div>
        </div>
        <span class="camp-status-badge ${statusMeta.cls}">${statusMeta.label}</span>
        <i class="bi bi-chevron-right dash-camp-arrow"></i>
      </div>`;
  }).join("");
}

function _esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
