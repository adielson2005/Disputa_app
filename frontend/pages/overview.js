// ── Página: Visão Geral do Campeonato ────────────────────────────────────────
import { getTimes, getJogos, getClassificacao } from "../services/api.js";
import { getCampeonatoId, getCampeonatoAtual } from "../store.js";
import { abrir as abrirModal } from "../components/modal.js";

const SPORT_EMOJI = {
  futebol: "⚽", futsal: "⚽", basquete: "🏀",
  "vôlei": "🏐", volei: "🏐",
  handebol: "🤾", hóquei: "🏒", hoquei: "🏒",
};
const SPORT_ICON = {
  futebol: "bi-dribbble", futsal: "bi-dribbble", basquete: "bi-basket",
  "vôlei": "bi-disc", volei: "bi-disc",
  handebol: "bi-hand-index-thumb", hóquei: "bi-activity", hoquei: "bi-activity",
};

let _jogos = [];

export async function load()    { _skeleton(); await refresh(); }
export async function refresh() {
  const camp = getCampeonatoAtual();
  const id   = camp?.id;
  if (!id) return;

  try {
    const [times, jogos, classif] = await Promise.all([
      getTimes(id),
      getJogos(id),
      getClassificacao(id),
    ]);
    _jogos = jogos;

    _renderHero(camp, jogos);
    _renderStats(times, jogos);
    _renderProximos(jogos);
    _renderResultados(jogos);
    _renderClassifMini(classif);

  } catch (e) {
    console.error("Overview refresh error", e);
  }
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function _renderHero(camp, jogos) {
  const modKey = (camp.modalidade || "").toLowerCase();
  const emoji  = SPORT_EMOJI[modKey] || "🏆";

  // Watermark icon
  const heroEl = document.getElementById("camp-hero");
  if (heroEl) heroEl.dataset.sportIcon = emoji;

  // Status badge
  const enc   = jogos.filter(j => j.status === "encerrado").length;
  const total = jogos.length;
  const live  = jogos.filter(j =>
    ["primeiro_tempo","segundo_tempo","intervalo"].includes(j.status)).length;

  let cls, txt;
  if (live > 0) {
    cls = "camp-hero-badge--andamento"; txt = "Ao vivo";
  } else if (total === 0) {
    cls = "camp-hero-badge--nao-iniciado"; txt = "Não iniciado";
  } else if (enc === total) {
    cls = "camp-hero-badge--finalizado"; txt = "Finalizado";
  } else {
    cls = "camp-hero-badge--andamento"; txt = "Em andamento";
  }
  const badge = document.getElementById("camp-hero-badge");
  if (badge) { badge.className = `camp-hero-badge ${cls}`; badge.textContent = txt; }

  // Nome
  const nomeEl = document.getElementById("camp-hero-nome");
  if (nomeEl) nomeEl.textContent = camp.nome;

  // Meta row
  const metaEl = document.getElementById("camp-hero-meta");
  if (metaEl) {
    const parts = [
      camp.modalidade && `<span class="camp-hero-meta-tag">
        <i class="bi ${SPORT_ICON[modKey] || "bi-trophy"}"></i>${camp.modalidade}</span>`,
      camp.formato    && `<span class="camp-hero-meta-tag">${camp.formato}</span>`,
      camp.categoria && camp.categoria !== "Livre" &&
        `<span class="camp-hero-meta-tag">${camp.categoria}</span>`,
    ].filter(Boolean);
    metaEl.innerHTML = parts.join(`<span class="camp-hero-meta-sep">·</span>`);
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function _renderStats(times, jogos) {
  const el = document.getElementById("ov-stats-row");
  if (!el) return;

  const enc  = jogos.filter(j => j.status === "encerrado").length;
  const prox = jogos.filter(j => j.status === "aguardando").length;
  const live = jogos.filter(j =>
    ["primeiro_tempo","segundo_tempo","intervalo"].includes(j.status)).length;

  const pct = jogos.length > 0 ? Math.round(enc / jogos.length * 100) : 0;

  el.innerHTML = `
    <div class="ov-stat">
      <div class="ov-stat-label">Times</div>
      <div class="ov-stat-val">${times.length}</div>
    </div>
    <div class="ov-stat">
      <div class="ov-stat-label">Jogos</div>
      <div class="ov-stat-val">${jogos.length}</div>
    </div>
    <div class="ov-stat ov-stat--accent">
      <div class="ov-stat-label">Encerrados</div>
      <div class="ov-stat-val">${enc}</div>
    </div>
    <div class="ov-stat ${live > 0 ? "ov-stat--warn" : ""}">
      <div class="ov-stat-label">${live > 0 ? "Ao vivo" : "Aguardando"}</div>
      <div class="ov-stat-val">${live > 0 ? live : prox}</div>
    </div>`;
}

// ── Próximos jogos ────────────────────────────────────────────────────────────

function _renderProximos(jogos) {
  const el = document.getElementById("ov-proximos");
  if (!el) return;

  const prox = jogos.filter(j => j.status === "aguardando").slice(0, 5);
  if (!prox.length) {
    el.innerHTML = `<p class="ov-empty">Nenhum jogo pendente.</p>`;
    return;
  }
  el.innerHTML = prox.map(j => `
    <div class="ov-match" data-id="${j.id}" role="button" tabindex="0">
      <div class="ov-match-teams">
        <span class="ov-match-team">${_esc(j.time_a)}</span>
        <div class="ov-match-score ov-match-score--vs"><span>vs</span></div>
        <span class="ov-match-team" style="text-align:right">${_esc(j.time_b)}</span>
      </div>
    </div>`).join("");
}

// ── Últimos resultados ────────────────────────────────────────────────────────

function _renderResultados(jogos) {
  const el = document.getElementById("ov-resultados");
  if (!el) return;

  const enc = [...jogos].filter(j => j.status === "encerrado").reverse().slice(0, 5);
  if (!enc.length) {
    el.innerHTML = `<p class="ov-empty">Nenhum resultado ainda.</p>`;
    return;
  }
  el.innerHTML = enc.map(j => {
    const aVenceu = j.placar_a > j.placar_b;
    const bVenceu = j.placar_b > j.placar_a;
    return `
    <div class="ov-match" data-id="${j.id}" role="button" tabindex="0">
      <div class="ov-match-teams">
        <span class="ov-match-team ${aVenceu ? "ov-match-team--winner" : ""}">${_esc(j.time_a)}</span>
        <div class="ov-match-score">
          <span>${j.placar_a}</span>
          <span class="ov-match-score-sep">&ndash;</span>
          <span>${j.placar_b}</span>
        </div>
        <span class="ov-match-team ${bVenceu ? "ov-match-team--winner" : ""}"
              style="text-align:right">${_esc(j.time_b)}</span>
      </div>
    </div>`;
  }).join("");
}

// ── Classificação mini ────────────────────────────────────────────────────────

function _renderClassifMini(classif) {
  const el = document.getElementById("ov-classif-mini");
  if (!el) return;

  if (!classif.length) {
    el.innerHTML = `<p class="ov-empty">Sem dados ainda.</p>`;
    return;
  }

  const top = classif.slice(0, 8);
  el.innerHTML = `
    <div class="ov-standings">
      <div class="ov-standings-header">
        <span>#</span><span>Time</span>
        <span>J</span><span>V</span><span>D</span><span>Pts</span>
      </div>
      ${top.map((t, i) => `
        <div class="ov-standing-row">
          <span class="ov-standing-pos ${i < 3 ? "ov-standing-pos--top" : ""}">${i + 1}</span>
          <span class="ov-standing-name" title="${_esc(t.nome)}">${_esc(t.nome)}</span>
          <span class="ov-standing-num">${t.jogos}</span>
          <span class="ov-standing-num">${t.vitorias}</span>
          <span class="ov-standing-num">${t.derrotas}</span>
          <span class="ov-standing-pts">${t.pontos}</span>
        </div>`).join("")}
    </div>
    <div class="ov-standings-footer">
      <button class="ov-standings-link" id="ov-classif-btn">
        Ver classificação completa →
      </button>
    </div>`;

  document.getElementById("ov-classif-btn")?.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("golapp:navegar", { detail: "classificacao" }));
  });
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function _skeleton() {
  const el = document.getElementById("ov-stats-row");
  if (el) el.innerHTML = [0,1,2,3].map(() => `
    <div class="ov-stat">
      <div class="skel skel-line" style="width:48%;margin-bottom:8px"></div>
      <div class="skel skel-val"></div>
    </div>`).join("");
}

// ── Delegação de cliques nos match cards ──────────────────────────────────────

document.addEventListener("click", e => {
  const m = e.target.closest(".ov-match[data-id]");
  if (!m) return;
  const jogo = _jogos.find(j => j.id === parseInt(m.dataset.id));
  if (jogo) abrirModal(jogo);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function _esc(s) {
  return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
