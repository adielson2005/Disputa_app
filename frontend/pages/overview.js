// ── Página: Visão Geral do Campeonato ────────────────────────────────────────
import { getTimes, getJogos, getClassificacao, updateCampeonatoImagem } from "../services/api.js";
import { getCampeonatoAtual, setCampeonatoAtual } from "../store.js";
import { abrir as abrirModal } from "../components/modal.js";
import { notificar } from "../components/ui.js";

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

// ── Inicialização (uma vez) ────────────────────────────────────────────────────

let _listenersOk = false;
function _initListeners() {
  if (_listenersOk) return;
  _listenersOk = true;

  // Botão "Editar capa" → abre input file
  document.getElementById("btn-trocar-capa")?.addEventListener("click", () => {
    document.getElementById("input-capa")?.click();
  });

  // Botão "Trocar logo" → abre input file
  document.getElementById("btn-trocar-logo")?.addEventListener("click", () => {
    document.getElementById("input-logo")?.click();
  });

  // Mudança de arquivo: capa
  document.getElementById("input-capa")?.addEventListener("change", e => {
    const file = e.target.files?.[0];
    if (file) _handleImageUpload(file, "capa");
    e.target.value = "";
  });

  // Mudança de arquivo: logo
  document.getElementById("input-logo")?.addEventListener("change", e => {
    const file = e.target.files?.[0];
    if (file) _handleImageUpload(file, "logo");
    e.target.value = "";
  });

  // Logo → clicar para visualizar em tela cheia
  document.getElementById("ov-avatar")?.addEventListener("click", e => {
    if (e.target.closest("#btn-trocar-logo")) return;
    const img = document.getElementById("ov-avatar-img");
    if (img && !img.classList.contains("hidden") && img.src) {
      document.dispatchEvent(new CustomEvent("disputaapp:view-foto", { detail: { url: img.src } }));
    }
  });

  // Capa → clicar para visualizar em tela cheia (exceto botão de editar)
  document.getElementById("ov-cover")?.addEventListener("click", e => {
    if (e.target.closest("#btn-trocar-capa")) return;
    const camp = getCampeonatoAtual();
    if (camp?.capa_url) {
      document.dispatchEvent(new CustomEvent("disputaapp:view-foto", { detail: { url: camp.capa_url } }));
    }
  });

  // Clique nos match cards → abre modal do jogo
  document.addEventListener("click", e => {
    const m = e.target.closest(".ov-match[data-id]");
    if (!m) return;
    const jogo = _jogos.find(j => j.id === parseInt(m.dataset.id));
    if (jogo) abrirModal(jogo);
  });
}

// ── Upload de imagem ──────────────────────────────────────────────────────────

async function _handleImageUpload(file, tipo) {
  if (!file.type.startsWith("image/")) return;
  if (file.size > 3 * 1024 * 1024) {
    notificar("Imagem muito grande. Máximo 3 MB.");
    return;
  }

  const reader = new FileReader();
  reader.onload = async (ev) => {
    const base64 = ev.target.result;
    const camp   = getCampeonatoAtual();
    if (!camp?.id) return;

    // Aplica visualmente de imediato (otimista)
    _applyImage(tipo, base64, camp);

    // Persiste no servidor
    try {
      await updateCampeonatoImagem(camp.id, tipo, base64);
      // Atualiza o store local
      const updated = { ...camp };
      if (tipo === "capa") updated.capa_url = base64;
      else                 updated.logo_url = base64;
      setCampeonatoAtual(updated);
      notificar(tipo === "capa" ? "Capa atualizada!" : "Logo atualizado!", "sucesso");
    } catch (err) {
      console.error("Erro ao salvar imagem:", err);
      // Reverte visual em caso de erro
      _applyImage(tipo, tipo === "capa" ? (camp.capa_url || null) : (camp.logo_url || null), camp);
      notificar("Não foi possível salvar a imagem. Tente novamente.");
    }
  };
  reader.readAsDataURL(file);
}

function _applyImage(tipo, url, camp) {
  if (tipo === "capa") {
    const cover = document.getElementById("ov-cover");
    if (cover) {
      cover.style.backgroundImage = `url("${url}")`;
      cover.classList.add("foto-viewer-trigger");
    }
  } else {
    const img     = document.getElementById("ov-avatar-img");
    const emoji   = document.getElementById("ov-avatar-emoji");
    const wrapper = document.getElementById("ov-avatar");
    if (img && emoji) {
      img.src = url;
      img.classList.remove("hidden");
      emoji.classList.add("hidden");
      wrapper?.classList.add("foto-viewer-trigger");
    }
  }
}

// ── Exports públicos ──────────────────────────────────────────────────────────

export async function load() {
  _initListeners();
  _skeleton();
  await refresh();
}

export async function refresh() {
  const camp = getCampeonatoAtual();
  if (!camp?.id) return;

  try {
    const [times, jogos, classif] = await Promise.all([
      getTimes(camp.id),
      getJogos(camp.id),
      getClassificacao(camp.id),
    ]);
    _jogos = jogos;

    _renderProfile(camp, jogos);
    _renderStats(times, jogos);
    _renderProximos(jogos);
    _renderResultados(jogos);
    _renderClassifMini(classif);
  } catch (e) {
    console.error("Overview refresh error", e);
  }
}

// ── Profile (capa + avatar + nome) ───────────────────────────────────────────

function _renderProfile(camp, jogos) {
  const modKey = (camp.modalidade || "").toLowerCase();
  const emoji  = SPORT_EMOJI[modKey] || "🏆";

  // Capa de fundo
  const cover = document.getElementById("ov-cover");
  if (cover) {
    if (camp.capa_url) {
      cover.style.backgroundImage = `url("${camp.capa_url}")`;
      cover.classList.add("foto-viewer-trigger");
    } else {
      cover.style.backgroundImage = "";
      cover.classList.remove("foto-viewer-trigger");
    }
  }

  // Avatar / logo
  const avatarImg   = document.getElementById("ov-avatar-img");
  const avatarEmoji = document.getElementById("ov-avatar-emoji");
  const avatarWrap  = document.getElementById("ov-avatar");
  if (avatarImg && avatarEmoji) {
    if (camp.logo_url) {
      avatarImg.src = camp.logo_url;
      avatarImg.classList.remove("hidden");
      avatarEmoji.classList.add("hidden");
      avatarWrap?.classList.add("foto-viewer-trigger");
    } else {
      avatarImg.classList.add("hidden");
      avatarEmoji.classList.remove("hidden");
      avatarEmoji.textContent = emoji;
      avatarWrap?.classList.remove("foto-viewer-trigger");
    }
  }

  // Nome
  const nomeEl = document.getElementById("camp-hero-nome");
  if (nomeEl) nomeEl.textContent = camp.nome;

  // Meta pills
  const metaEl = document.getElementById("camp-hero-meta");
  if (metaEl) {
    const parts = [
      camp.modalidade && `<span class="camp-hero-meta-tag"><i class="bi ${SPORT_ICON[modKey] || "bi-trophy"}"></i>${_esc(camp.modalidade)}</span>`,
      camp.formato    && `<span class="camp-hero-meta-tag"><i class="bi bi-grid-3x3-gap"></i>${_esc(camp.formato)}</span>`,
      camp.categoria && camp.categoria !== "Livre"
        ? `<span class="camp-hero-meta-tag"><i class="bi bi-tag"></i>${_esc(camp.categoria)}</span>`
        : null,
    ].filter(Boolean);
    metaEl.innerHTML = parts.join("");
  }

  // Status badge
  const enc   = jogos.filter(j => j.status === "encerrado").length;
  const total = jogos.length;
  const live  = jogos.filter(j =>
    ["primeiro_tempo", "segundo_tempo", "intervalo"].includes(j.status)).length;

  let cls, txt;
  if (live > 0) {
    cls = "camp-hero-badge--andamento"; txt = "Ao vivo";
  } else if (total === 0) {
    cls = "camp-hero-badge--nao-iniciado"; txt = "Não iniciado";
  } else if (enc === total && total > 0) {
    cls = "camp-hero-badge--finalizado"; txt = "Finalizado";
  } else {
    cls = "camp-hero-badge--andamento"; txt = "Em andamento";
  }
  const badge = document.getElementById("camp-hero-badge");
  if (badge) { badge.className = `camp-hero-badge ${cls}`; badge.textContent = txt; }

  // Barra de progresso
  const pct  = total > 0 ? Math.round(enc / total * 100) : 0;
  const fill = document.getElementById("ov-progress-fill");
  requestAnimationFrame(() => {
    if (fill) fill.style.width = pct + "%";
  });
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function _renderStats(times, jogos) {
  const el = document.getElementById("ov-stats-row");
  if (!el) return;

  const enc  = jogos.filter(j => j.status === "encerrado").length;
  const prox = jogos.filter(j => j.status === "aguardando").length;
  const live = jogos.filter(j =>
    ["primeiro_tempo", "segundo_tempo", "intervalo"].includes(j.status)).length;

  el.innerHTML = `
    <div class="ov-stat">
      <i class="bi bi-people ov-stat-icon"></i>
      <div class="ov-stat-label">Times</div>
      <div class="ov-stat-val">${times.length}</div>
    </div>
    <div class="ov-stat">
      <i class="bi bi-calendar3 ov-stat-icon"></i>
      <div class="ov-stat-label">Jogos</div>
      <div class="ov-stat-val">${jogos.length}</div>
    </div>
    <div class="ov-stat ov-stat--accent">
      <i class="bi bi-check2-circle ov-stat-icon"></i>
      <div class="ov-stat-label">Encerrados</div>
      <div class="ov-stat-val">${enc}</div>
    </div>
    <div class="ov-stat ${live > 0 ? "ov-stat--warn" : ""}">
      <i class="bi bi-${live > 0 ? "broadcast" : "clock"} ov-stat-icon"></i>
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
        <span>J</span><span>V</span><span>Pts</span>
      </div>
      ${top.map((t, i) => `
        <div class="ov-standing-row">
          <span class="ov-standing-pos ov-standing-pos--${i + 1}">${i + 1}</span>
          <span class="ov-standing-name" title="${_esc(t.nome)}">${_esc(t.nome)}</span>
          <span class="ov-standing-num">${t.jogos}</span>
          <span class="ov-standing-num">${t.vitorias}</span>
          <span class="ov-standing-pts">${t.pontos}</span>
        </div>`).join("")}
    </div>
    <div class="ov-standings-footer">
      <button class="ov-standings-link" id="ov-classif-btn">Ver classificação completa</button>
    </div>`;

  document.getElementById("ov-classif-btn")?.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("disputaapp:navegar", { detail: "classificacao" }));
  });
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function _skeleton() {
  const el = document.getElementById("ov-stats-row");
  if (el) el.innerHTML = [0, 1, 2, 3].map(() => `
    <div class="ov-stat">
      <div class="skel skel-line" style="width:40%;margin-bottom:10px"></div>
      <div class="skel skel-val"></div>
    </div>`).join("");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
