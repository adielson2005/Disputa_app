// ── Orquestrador principal do GolApp ─────────────────────────────────────────
import { getUsuario, getToken, clearAuth, setCampeonatoAtual, getCampeonatoAtual } from "./store.js";
import { init as initAuth, mostrar as mostrarAuth }                   from "./pages/auth.js";
import { init as initDashboard, load as loadDashboard,
         refresh as refreshDashboard }                                from "./pages/dashboard.js";
import { init as initCampeonatos, load as loadCampeonatos }           from "./pages/campeonatos.js";
import { init as initTimes,    load as loadTimes,
         refresh as refreshTimes }                                    from "./pages/times.js";
import { init as initJogos,    load as loadJogos,
         refresh as refreshJogos }                                    from "./pages/jogos.js";
import { load as loadClassificacao,
         refresh as refreshClassificacao }                            from "./pages/classificacao.js";
import { load as loadOverview,  refresh as refreshOverview }          from "./pages/overview.js";
import { load as loadEstatisticas }                                   from "./pages/estatisticas.js";
import { fechar as fecharModal, gol, cartao, avancarStatus }          from "./components/modal.js";

// ── Navegação ─────────────────────────────────────────────────────────────────
let _telaAtual = "dashboard";

const _LABEL = {
  dashboard:      "Dashboard",
  campeonatos:    "Campeonatos",
  overview:       "Vis\u00e3o Geral",
  times:          "Times",
  jogos:          "Jogos",
  classificacao:  "Classifica\u00e7\u00e3o",
  artilharia:     "Artilharia",
  estatisticas:   "Estat\u00edsticas",
  avisos:         "Avisos",
  regulamento:    "Regulamento",
  "config-camp":  "Configura\u00e7\u00f5es",
  configuracoes:  "Configura\u00e7\u00f5es",
  sobre:          "Sobre o GolApp",
};

function mudarTela(id) {
  document.querySelectorAll(".tela").forEach(t => t.classList.remove("ativa"));
  document.getElementById(id)?.classList.add("ativa");
  document.querySelectorAll(".nav-item, .bottom-nav-item").forEach(n => n.classList.remove("ativo"));
  document.querySelectorAll(`[data-tela="${id}"]`).forEach(n => n.classList.add("ativo"));
  const title = document.getElementById("topbar-title");
  if (title) title.textContent = _LABEL[id] ?? id;
  _telaAtual = id;
  switch (id) {
    case "dashboard":     loadDashboard(); break;
    case "campeonatos":   loadCampeonatos(); break;
    case "overview":      loadOverview(); break;
    case "times":         loadTimes(); break;
    case "jogos":         loadJogos(); break;
    case "classificacao": loadClassificacao(); break;
    case "artilharia":    _loadArtilharia(); break;
    case "estatisticas":  loadEstatisticas(); break;
    case "avisos":        break;  // estático
    case "regulamento":   _loadRegulamento(); break;
    case "config-camp":   _loadConfigCamp(); break;
    case "configuracoes":  _syncConfig();      break;
    case "sobre":          break;  // página estática
  }
}

// ── Contexto de campeonato ────────────────────────────────────────────────────
function abrirContextoCampeonato(campeonato) {
  setCampeonatoAtual(campeonato);

  document.getElementById("menu-geral").style.display      = "none";
  document.getElementById("menu-campeonato").style.display = "flex";

  const nomEl = document.getElementById("sidebar-ctx-nome");
  const modEl = document.getElementById("sidebar-ctx-modalidade");
  if (nomEl) nomEl.textContent = campeonato.nome;
  if (modEl) modEl.textContent = campeonato.modalidade || "Geral";

  document.getElementById("bottom-nav")?.classList.replace("ctx-geral", "ctx-camp");
  const btnBack = document.getElementById("btn-topbar-voltar");
  if (btnBack) btnBack.style.display = "";

  mudarTela("overview");
}

function voltarContextoGeral() {
  setCampeonatoAtual(null);

  document.getElementById("menu-campeonato").style.display = "none";
  document.getElementById("menu-geral").style.display      = "flex";

  document.getElementById("bottom-nav")?.classList.replace("ctx-camp", "ctx-geral");
  const btnBack = document.getElementById("btn-topbar-voltar");
  if (btnBack) btnBack.style.display = "none";

  mudarTela("dashboard");
}

// ── Páginas do contexto de campeonato ────────────────────────────────────────────
function _esc(s) {
  return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

async function _loadArtilharia() {
  const el = document.getElementById("art-lista");
  if (!el) return;
  const camp = getCampeonatoAtual();
  if (!camp) return;

  el.innerHTML = '<p style="padding:16px 0;color:var(--text-3)">Carregando...</p>';
  try {
    const { getJogos } = await import("./services/api.js");
    const jogos = await getJogos(camp.id);
    const encerrados = jogos.filter(j => j.status === "encerrado");

    // Soma gols por time
    const gols = {};
    for (const j of encerrados) {
      const a = j.time_a_nome || "–"; const b = j.time_b_nome || "–";
      const ga = j.placar_a ?? 0;     const gb = j.placar_b ?? 0;
      gols[a] = (gols[a] || 0) + ga;
      gols[b] = (gols[b] || 0) + gb;
    }
    const lista = Object.entries(gols).sort((x,y) => y[1] - x[1]);
    if (!lista.length) {
      el.innerHTML = '<p style="padding:16px 0;color:var(--text-3)">Nenhum gol registrado.</p>';
      return;
    }
    const medals = ["🥇","🥈","🥉"];
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:2px">
        ${lista.map(([nome, g], i) => `
          <div class="art-row">
            <span class="art-rank">${medals[i] ?? `<span style="font-size:.9rem;font-weight:700;color:var(--text-3)">${i+1}</span>`}</span>
            <div class="art-info"><span class="art-name">${_esc(nome)}</span></div>
            <div class="art-gols-wrap"><span class="art-gols">${g}</span><span style="font-size:.7rem;color:var(--text-3);margin-left:4px">${g===1?"gol":"gols"}</span></div>
          </div>`).join("")}
      </div>`;
  } catch (e) {
    el.innerHTML = '<p style="padding:16px 0;color:var(--danger)">Erro ao carregar artilharia.</p>';
  }
}

function _loadRegulamento() {
  const camp = getCampeonatoAtual();
  const descEl = document.getElementById("reg-desc");
  const cfgEl  = document.getElementById("reg-config");
  if (descEl) descEl.textContent = camp?.descricao || "Nenhuma descrição cadastrada.";
  if (cfgEl)  cfgEl.innerHTML   = _campConfigRows(camp);
}

function _loadConfigCamp() {
  const camp = getCampeonatoAtual();
  const el = document.getElementById("config-camp-info");
  if (el) el.innerHTML = _campConfigRows(camp);
}

function _campConfigRows(camp) {
  if (!camp) return '<p style="color:var(--text-3);padding:8px 0">Sem dados.</p>';
  const rows = [
    ["Modalidade",  camp.modalidade  || "—"],
    ["Formato",     camp.formato     || "—"],
    ["Categoria",   camp.categoria   || "—"],
    ["Duração/jogo",camp.duracao_padrao != null ? `${camp.duracao_padrao} min` : "—"],
    ["Pts por vitória", camp.pontos_vitoria ?? "—"],
    ["Ida e volta", camp.ida_volta ? "Sim" : "Não"],
  ];
  return rows.map(([k,v]) => `
    <div class="camp-config-row">
      <span class="camp-config-key">${_esc(String(k))}</span>
      <span class="camp-config-val">${_esc(String(v))}</span>
    </div>`).join("");
}

// ── Toggle de visibilidade de senha ──────────────────────────────────────────────
function _initPasswordToggles() {
  document.querySelectorAll(".btn-show-pass").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      btn.querySelector("i").className = visible ? "bi bi-eye" : "bi bi-eye-slash";
      btn.classList.toggle("active", !visible);
      btn.setAttribute("aria-label", visible ? "Mostrar senha" : "Ocultar senha");
    });
  });
}

// ── Tela de Configurações ────────────────────────────────────────────────────
function _syncConfig() {
  // Email
  const emailEl = document.getElementById("config-user-email");
  const usuario = getUsuario();
  if (emailEl) emailEl.textContent = usuario?.email ?? "—";

  // Toggle tema
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const toggle = document.getElementById("config-tema-toggle");
  if (toggle) toggle.classList.toggle("ativo", isDark);
}

function _initConfigHandlers() {
  // Exportar campeonatos
  document.getElementById("config-btn-exportar")?.addEventListener("click", async () => {
    try {
      const { getCampeonatos } = await import("./services/api.js");
      const lista = await getCampeonatos();
      const blob  = new Blob([JSON.stringify(lista, null, 2)], { type: "application/json" });
      const url   = URL.createObjectURL(blob);
      const a     = document.createElement("a");
      a.href = url; a.download = "golapp-campeonatos.json"; a.click();
      URL.revokeObjectURL(url);
    } catch { /* silencioso */ }
  });
}

// ── Tema claro / escuro ───────────────────────────────────────────────────────
function toggleTema() {
  const atual = document.documentElement.getAttribute("data-theme");
  const novo  = atual === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", novo);
  localStorage.setItem("golapp-theme", novo);
  _syncTema(novo);
}

function _syncTema(tema) {
  const icon    = document.getElementById("theme-icon");
  const label   = document.getElementById("theme-label");
  const iconTop = document.getElementById("theme-icon-topbar");
  const isDark  = tema === "dark";
  if (icon)    icon.className    = isDark ? "bi bi-sun-fill" : "bi bi-moon-stars-fill";
  if (label)   label.textContent = isDark ? "Modo claro"    : "Modo escuro";
  if (iconTop) iconTop.className = isDark ? "bi bi-sun-fill" : "bi bi-moon-stars-fill";
  // Sincroniza toggle da tela de configurações
  const toggle = document.getElementById("config-tema-toggle");
  if (toggle) toggle.classList.toggle("ativo", isDark);
}

// ── Autenticação ──────────────────────────────────────────────────────────────
function _onAuth(usuario) {
  document.getElementById("login-overlay").style.display = "none";
  document.getElementById("user-email").textContent      = usuario.email;
  document.getElementById("user-strip").style.display    = "flex";
  initDashboard();
  initCampeonatos();
  initTimes();
  initJogos();
  _initConfigHandlers();
  loadDashboard();
  _startPolling();
}

function logout() {
  clearAuth();
  _stopPolling();
  voltarContextoGeral();
  document.getElementById("user-strip").style.display    = "none";
  document.getElementById("login-overlay").style.display = "flex";
  ["lista-times-tela", "jogos-list", "ov-jogos-recentes",
   "lista-campeonatos", "dash-lista-campeonatos"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
  });
  const tabela = document.getElementById("tabela");
  if (tabela) tabela.innerHTML = "";
  mostrarAuth("login");
}

function _onCampeonatoChange(id) {
  refreshTimes();
  refreshJogos();
  refreshClassificacao();
}

// ── Polling ───────────────────────────────────────────────────────────────────
let _pollTimer = null;

function _startPolling() {
  if (_pollTimer) return;
  _pollTimer = setInterval(() => {
    if (!getToken()) return;
    if (getCampeonatoAtual()) {
      refreshJogos();
      refreshClassificacao();
      if (_telaAtual === "overview")     refreshOverview();
    } else {
      if (_telaAtual === "dashboard")    refreshDashboard();
    }
  }, 20000);
}

function _stopPolling() {
  clearInterval(_pollTimer);
  _pollTimer = null;
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
(function init() {
  // Tema (sem flash — o atributo data-theme já foi definido no <head>)
  const tema = localStorage.getItem("golapp-theme") || "light";
  _syncTema(tema);

  // Remover service worker legado
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs =>
      regs.forEach(r => r.unregister())
    );
  }

  // Navegação por sidebar
  document.querySelectorAll(".nav-item[data-tela]").forEach(el => {
    el.addEventListener("click", () => mudarTela(el.dataset.tela));
  });

  // Navegação por bottom nav
  document.querySelectorAll(".bottom-nav-item[data-tela]").forEach(el => {
    el.addEventListener("click", () => mudarTela(el.dataset.tela));
  });

  // Contexto de campeonato
  document.addEventListener("golapp:abrir-campeonato", e => abrirContextoCampeonato(e.detail));
  document.getElementById("btn-voltar-geral")?.addEventListener("click", voltarContextoGeral);
  document.getElementById("btn-topbar-voltar")?.addEventListener("click", voltarContextoGeral);

  // Navegação interna (disparada por sub-componentes)
  document.addEventListener("golapp:navegar", e => mudarTela(e.detail));

  // Toggle de visibilidade de senha
  _initPasswordToggles();

  // Tema
  document.getElementById("theme-btn")?.addEventListener("click", toggleTema);
  document.getElementById("theme-btn-topbar")?.addEventListener("click", toggleTema);

  // Logout
  document.getElementById("btn-logout")?.addEventListener("click", logout);
  document.getElementById("btn-logout-mobile")?.addEventListener("click", logout);
  document.getElementById("config-btn-logout")?.addEventListener("click", logout);

  // Configurações → ir para tela Sobre
  document.getElementById("config-btn-sobre")?.addEventListener("click", () => mudarTela("sobre"));

  // Toggle de tema na tela de Configurações
  document.getElementById("config-tema-row")?.addEventListener("click", toggleTema);

  // Modal — fechar (delegação: clique no fundo ou no botão ×)
  const modalEl = document.getElementById("modal-jogo");
  modalEl?.addEventListener("click", e => {
    if (e.target === modalEl || e.target.closest(".modal-close")) fecharModal();
  });

  // Modal — botões de status
  document.getElementById("btn-iniciar")?.addEventListener("click",
    () => avancarStatus("iniciar"));
  document.getElementById("btn-intervalo")?.addEventListener("click",
    () => avancarStatus("intervalo"));
  document.getElementById("btn-segundo")?.addEventListener("click",
    () => avancarStatus("segundo_tempo"));
  document.getElementById("btn-encerrar")?.addEventListener("click",
    () => avancarStatus("encerrar"));

  // Modal — botões de gol (data-gol="a+|a-|b+|b-")
  document.querySelectorAll("[data-gol]").forEach(btn => {
    btn.addEventListener("click", () => {
      const [lado, sinal] = btn.dataset.gol.split("");
      gol(lado, sinal === "+" ? 1 : -1);
    });
  });

  // Modal — botões de cartão (data-cartao="a|b" data-tipo="amarelo|vermelho" data-delta="1|-1")
  document.querySelectorAll("[data-cartao]").forEach(btn => {
    btn.addEventListener("click", () => {
      cartao(btn.dataset.cartao, btn.dataset.tipo, parseInt(btn.dataset.delta));
    });
  });

  // Modal — select de duração
  document.getElementById("modalDuracaoSelect")?.addEventListener("change", () => {
    const custom = document.getElementById("duracaoCustom");
    if (custom)
      custom.style.display =
        document.getElementById("modalDuracaoSelect").value === "custom" ? "" : "none";
  });

  // Escutar evento de campeonatos criados (disparado por campeonatos.js)
  document.addEventListener("golapp:campeonatos-updated", () => loadDashboard());

  // Token expirado ou inválido → logout automático
  document.addEventListener("golapp:unauthorized", () => {
    if (getToken()) logout();
  });

  // Auth
  initAuth(_onAuth);

  // Restaurar sessão
  const usuario = getUsuario();
  const token   = getToken();
  if (usuario && token) {
    _onAuth(usuario);
  } else {
    document.getElementById("login-overlay").style.display = "flex";
  }
})();
