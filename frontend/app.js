// ── Orquestrador principal do DisputaApp ─────────────────────────────────────────
import { getUsuario, getToken, clearAuth, setAuth, setCampeonatoAtual, getCampeonatoAtual } from "./store.js";
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
import { notificar }                                                    from "./components/ui.js";

// ── Navegação ─────────────────────────────────────────────────────────────────
let _telaAtual = "dashboard";
let _transitioning = false;

const _LABEL = {
  dashboard:      "Dashboard",
  campeonatos:    "Campeonatos",
  planos:         "Planos",
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
  sobre:          "Sobre o DisputaApp",
};

function _carregarTela(id) {
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
    case "configuracoes": _syncConfig(); break;
    case "sobre":         break;  // estático
    case "planos":        _loadPlanos(); break;
  }
}

function _aplicarTela(id) {
  document.querySelectorAll(".tela").forEach(t => {
    t.classList.remove("ativa", "tela-saindo");
  });
  document.getElementById(id)?.classList.add("ativa");
  document.querySelectorAll(".nav-item, .bottom-nav-item").forEach(n => n.classList.remove("ativo"));
  document.querySelectorAll(`[data-tela="${id}"]`).forEach(n => n.classList.add("ativo"));
  const title = document.getElementById("topbar-title");
  if (title) title.textContent = _LABEL[id] ?? id;
  _telaAtual = id;
  _transitioning = false;
  _carregarTela(id);
}

function mudarTela(id) {
  if (_telaAtual === id) { _carregarTela(id); return; }
  if (_transitioning) return;

  const atual = document.querySelector(".tela.ativa");
  if (atual) {
    _transitioning = true;
    atual.classList.add("tela-saindo");
    setTimeout(() => _aplicarTela(id), 140);
  } else {
    _aplicarTela(id);
  }
}

// ── Contexto de campeonato ────────────────────────────────────────────────────
function abrirContextoCampeonato(campeonato) {
  setCampeonatoAtual(campeonato);

  // Sidebar mobile
  document.getElementById("menu-geral").style.display      = "none";
  document.getElementById("menu-campeonato").style.display = "flex";

  // Sidebar desktop
  document.getElementById("ds-menu-geral").style.display   = "none";
  document.getElementById("ds-menu-camp").style.display    = "flex";

  const nomEl   = document.getElementById("sidebar-ctx-nome");
  const modEl   = document.getElementById("sidebar-ctx-modalidade");
  const dsNomEl = document.getElementById("ds-ctx-nome");
  const dsModEl = document.getElementById("ds-ctx-modalidade");
  if (nomEl)   nomEl.textContent   = campeonato.nome;
  if (modEl)   modEl.textContent   = campeonato.modalidade || "Geral";
  if (dsNomEl) dsNomEl.textContent = campeonato.nome;
  if (dsModEl) dsModEl.textContent = campeonato.modalidade || "Geral";

  document.getElementById("bottom-nav")?.classList.replace("ctx-geral", "ctx-camp");
  const btnBack = document.getElementById("btn-topbar-voltar");
  if (btnBack) btnBack.style.display = "";

  mudarTela("overview");
}

function voltarContextoGeral() {
  setCampeonatoAtual(null);

  // Sidebar mobile
  document.getElementById("menu-campeonato").style.display = "none";
  document.getElementById("menu-geral").style.display      = "flex";

  // Sidebar desktop
  document.getElementById("ds-menu-camp").style.display    = "none";
  document.getElementById("ds-menu-geral").style.display   = "flex";

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

// ── Planos ───────────────────────────────────────────────────────────────────
function _loadPlanos() {
  const u = getUsuario();
  _renderPlanoBanner(u);
  _atualizarBotoesPlano(u);
}

function _renderPlanoBanner(u) {
  const banner = document.getElementById("plano-ativo-banner");
  if (!banner) return;
  if (!u?.plano_ativo) { banner.classList.add("hidden"); return; }
  banner.classList.remove("hidden");
  const titulo = document.getElementById("plano-ativo-banner-title");
  const sub    = document.getElementById("plano-ativo-banner-sub");
  if (titulo) titulo.textContent = u.plano_tipo === "anual" ? "Plano Anual ativo 🎉" : "Plano Mensal ativo";
  if (sub && u.plano_validade) {
    const d = new Date(u.plano_validade);
    sub.textContent = `Válido até ${d.toLocaleDateString("pt-BR")} · Renova automaticamente`;
  }
}

function _atualizarBotoesPlano(u) {
  const btnMensal = document.getElementById("btn-assinar-mensal");
  const btnAnual  = document.getElementById("btn-assinar-anual");
  const ativoMensal = u?.plano_ativo && u?.plano_tipo === "mensal";
  const ativoAnual  = u?.plano_ativo && u?.plano_tipo === "anual";
  if (btnMensal) {
    btnMensal.textContent = ativoMensal ? "Plano atual" : "Assinar mensal";
    btnMensal.className = ativoMensal
      ? "plano-btn plano-btn--active"
      : "plano-btn plano-btn--outline";
    btnMensal.disabled = ativoMensal;
  }
  if (btnAnual) {
    btnAnual.textContent = ativoAnual ? "Plano atual" : "Assinar anual";
    btnAnual.className = ativoAnual
      ? "plano-btn plano-btn--active"
      : "plano-btn plano-btn--primary";
    btnAnual.disabled = ativoAnual;
  }
}

async function _assinarPlano(tipo) {
  try {
    const resp = await fetch("/api/planos/assinar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ tipo }),
    });
    const data = await resp.json();
    if (!resp.ok) throw data;
    const { setAuth } = await import("./store.js");
    const novo = { ...getUsuario(), ...data };
    setAuth(novo, getToken());
    _renderPlanoBanner(novo);
    _atualizarBotoesPlano(novo);
    notificar(`Plano ${tipo} ativado com sucesso!`, "sucesso");
  } catch (e) {
    notificar(e?.erro || "Erro ao assinar plano");
  }
}

async function _cancelarPlano() {
  try {
    const resp = await fetch("/api/planos/cancelar", {
      method: "POST",
      headers: { "Authorization": `Bearer ${getToken()}` },
    });
    const data = await resp.json();
    if (!resp.ok) throw data;
    const { setAuth } = await import("./store.js");
    const novo = { ...getUsuario(), plano_ativo: false, plano_tipo: null, plano_validade: null };
    setAuth(novo, getToken());
    _renderPlanoBanner(novo);
    _atualizarBotoesPlano(novo);
    notificar("Assinatura cancelada.", "sucesso");
  } catch (e) {
    notificar(e?.erro || "Erro ao cancelar assinatura");
  }
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
      a.href = url; a.download = "disputaapp-campeonatos.json"; a.click();
      URL.revokeObjectURL(url);
    } catch { /* silencioso */ }
  });
}

// ── Tema claro / escuro ───────────────────────────────────────────────────────
function toggleTema() {
  const atual = document.documentElement.getAttribute("data-theme");
  const novo  = atual === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", novo);
  localStorage.setItem("disputaapp-theme", novo);
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
  // Sincroniza toggle da tela de configurações (item removido, mantido por compatibilidade)
  const toggle = document.getElementById("config-tema-toggle");
  if (toggle) toggle.classList.toggle("ativo", isDark);
}

// ── Autenticação ──────────────────────────────────────────────────────────────
function _onAuth(usuario) {
  document.getElementById("login-overlay").style.display = "none";
  document.getElementById("user-email").textContent      = usuario.email;
  document.getElementById("user-strip").style.display    = "flex";

  // Avatar dinâmico com inicial do e-mail
  const inicial = (usuario.email || "?")[0].toUpperCase();
  const avatarTop  = document.getElementById("topbar-avatar");
  const avatarSide = document.getElementById("sidebar-avatar");
  if (avatarTop)  { avatarTop.textContent  = inicial; avatarTop.title  = usuario.email; }
  if (avatarSide) { avatarSide.textContent = inicial; }

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

// ── Perfil do usuário ─────────────────────────────────────────────────────────

/** Atualiza o mini-thumb e o avatar grande com URL ou inicial */
function _renderAvatar(url, inicial, thumbEl, lgEl) {
  if (url) {
    const img = `<img src="${url}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    if (thumbEl) thumbEl.innerHTML = img;
    if (lgEl)    lgEl.innerHTML    = img;
  } else {
    if (thumbEl) thumbEl.textContent = inicial;
    if (lgEl)    lgEl.textContent    = inicial;
  }
}

// ── Visualizador de foto ───────────────────────────────────────────────────────
function _openFotoViewer(url) {
  if (!url) return;
  const overlay = document.getElementById("foto-viewer");
  const img     = document.getElementById("foto-viewer-img");
  if (!overlay || !img) return;
  img.src = url;
  overlay.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function _closeFotoViewer() {
  const overlay = document.getElementById("foto-viewer");
  if (!overlay || overlay.style.display === "none") return;
  overlay.style.display = "none";
  document.body.style.overflow = "";
  const img = document.getElementById("foto-viewer-img");
  if (img) img.src = "";
}

function _abrirPerfil() {
  const u = getUsuario();
  if (!u) return;

  const inicial = (u.nome || u.email || "?")[0].toUpperCase();

  // ── Hero ──────────────────────────────────────────────────────────────────
  const avLg    = document.getElementById("perfil-avatar-lg");
  const thumbEl = document.getElementById("perfil-foto-thumb");
  _renderAvatar(u.foto_url, inicial, thumbEl, avLg);

  document.getElementById("perfil-hero-nome").textContent  = u.nome  || u.email || "—";
  document.getElementById("perfil-hero-email").textContent = u.email || "—";

  const provEl = document.getElementById("perfil-provider-badge");
  if (provEl) {
    provEl.textContent      = u.auth_provider === "google" ? "Google" : "Email";
    provEl.dataset.provider = u.auth_provider || "email";
  }
  const planoEl = document.getElementById("perfil-plano-badge");
  if (planoEl) {
    const isGratuito = !u.plano_ativo;
    planoEl.textContent  = isGratuito ? "Free" : (u.plano_tipo === "anual" ? "Anual" : "Mensal");
    planoEl.dataset.free = isGratuito ? "true" : "false";
  }

  // ── Tab Perfil ─────────────────────────────────────────────────────────────
  const inputNome = document.getElementById("perfil-input-nome");
  const inputFoto = document.getElementById("perfil-input-foto");
  if (inputNome) inputNome.value = u.nome     || "";
  if (inputFoto) inputFoto.value = u.foto_url || "";

  const dispEmail = document.getElementById("perfil-disp-email");
  if (dispEmail) dispEmail.textContent = u.email || "—";

  const membroEl = document.getElementById("perfil-membro-desde");
  if (membroEl && u.created_at) {
    membroEl.textContent = new Date(u.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });
  }

  const tipoEl = document.getElementById("perfil-tipo-conta");
  if (tipoEl) tipoEl.textContent = u.auth_provider === "google" ? "Google OAuth" : "Email e senha";

  const idEl = document.getElementById("perfil-id-conta");
  if (idEl) idEl.textContent = u.id ? `#${u.id}` : "—";

  // Ocultar seção de foto ao abrir e reinicializar estado
  const fotoSection = document.getElementById("perfil-foto-section");
  if (fotoSection) fotoSection.style.display = "none";
  const removerBtnInit = document.getElementById("btn-remover-foto-perfil");
  if (removerBtnInit) removerBtnInit.style.display = u.foto_url ? "" : "none";
  const fotoNomeInit = document.getElementById("perfil-foto-nome");
  if (fotoNomeInit) { fotoNomeInit.textContent = ""; fotoNomeInit.style.display = "none"; }

  const erroEl = document.getElementById("perfil-erro");
  if (erroEl) { erroEl.textContent = ""; erroEl.style.display = "none"; }

  // ── Tab Segurança ──────────────────────────────────────────────────────────
  const isGoogle = u.auth_provider === "google";
  document.getElementById("sec-email-section").style.display  = isGoogle ? "none" : "";
  document.getElementById("sec-google-section").style.display = isGoogle ? ""     : "none";
  ["senha-atual","senha-nova","senha-confirma"].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = "";
  });
  ["senha-erro","senha-ok"].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = "none";
  });

  // ── Tab Conta — tema toggle ─────────────────────────────────────────────────
  _syncPerfilTema();

  // ── Voltar para a 1ª tab ───────────────────────────────────────────────────
  _mudarTabPerfil("tab-dados");

  const modalEl = document.getElementById("modalPerfil");
  (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)).show();
}

/** Sincroniza o pill de tema dentro do modal de perfil */
function _syncPerfilTema() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const pill   = document.getElementById("perfil-theme-pill");
  const icon   = document.getElementById("perfil-theme-icon");
  const sub    = document.getElementById("perfil-theme-sub");
  if (pill) pill.classList.toggle("ativo", isDark);
  if (icon) icon.className  = isDark ? "bi bi-moon-stars-fill" : "bi bi-sun-fill";
  if (sub)  sub.textContent = isDark ? "Modo escuro ativo"     : "Modo claro ativo";
}

function _mudarTabPerfil(tabId) {
  document.querySelectorAll(".perfil-tab").forEach(btn => {
    btn.classList.toggle("ativo", btn.dataset.tab === tabId);
  });
  document.querySelectorAll(".perfil-pane").forEach(pane => {
    pane.style.display = pane.id === tabId ? "" : "none";
  });
  if (tabId === "tab-conta") _carregarStatsConta();
}

async function _carregarStatsConta() {
  const u = getUsuario();

  // Plano info
  const planoTituloEl = document.getElementById("perfil-plano-titulo");
  const planoSubEl    = document.getElementById("perfil-plano-sub");
  if (planoTituloEl) {
    if (u?.plano_ativo) {
      planoTituloEl.textContent = u.plano_tipo === "anual" ? "Plano Anual ativo 🎉" : "Plano Mensal ativo";
      if (planoSubEl && u.plano_validade) {
        planoSubEl.textContent = `Válido até ${new Date(u.plano_validade).toLocaleDateString("pt-BR")}`;
      } else if (planoSubEl) { planoSubEl.textContent = ""; }
    } else {
      planoTituloEl.textContent = "Plano gratuito";
      if (planoSubEl) planoSubEl.textContent = "Acesso básico ao app";
    }
  }

  // Dias no app
  const diasEl = document.getElementById("pstat-dias");
  if (diasEl && u?.created_at) {
    const diff = Math.floor((Date.now() - new Date(u.created_at)) / 86400000);
    diasEl.textContent = diff < 1 ? "<1" : diff;
  }

  // Campeonatos / times / jogos — lazy (só carrega uma vez)
  const campsEl  = document.getElementById("pstat-camps");
  const timesEl  = document.getElementById("pstat-times");
  const jogosEl  = document.getElementById("pstat-jogos");

  if (campsEl && campsEl.textContent === "—") {
    try {
      const { getCampeonatos, getTimes, getJogos } = await import("./services/api.js");
      const camps = await getCampeonatos();
      if (campsEl) campsEl.textContent = camps.length;

      let totalTimes = 0, totalJogos = 0;
      await Promise.all(camps.map(async c => {
        try {
          const [ts, js] = await Promise.all([getTimes(c.id), getJogos(c.id)]);
          totalTimes += ts.length;
          totalJogos += js.length;
        } catch { /* ignora erro de campeonato individual */ }
      }));
      if (timesEl) timesEl.textContent = totalTimes;
      if (jogosEl) jogosEl.textContent = totalJogos;
    } catch {
      if (campsEl) campsEl.textContent = "–";
      if (timesEl) timesEl.textContent = "–";
      if (jogosEl) jogosEl.textContent = "–";
    }
  }
}

async function _salvarPerfil(e) {
  e.preventDefault();
  const btn     = document.getElementById("perfil-btn-salvar");
  const erroEl  = document.getElementById("perfil-erro");
  const nome    = (document.getElementById("perfil-input-nome")?.value || "").trim();
  const fotoUrl = (document.getElementById("perfil-input-foto")?.value || "").trim();

  erroEl.style.display = "none";
  btn.disabled  = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Salvando…';

  try {
    const { updateUser } = await import("./services/api.js");
    const res = await updateUser({ nome, foto_url: fotoUrl || null });

    const novoUsuario = { ...getUsuario(), nome: res.nome, foto_url: res.foto_url ?? (fotoUrl || null) };
    setAuth(novoUsuario, getToken());

    const novaInicial = (res.nome || res.email || "?")[0].toUpperCase();
    const avatarTop   = document.getElementById("topbar-avatar");
    const avatarSide  = document.getElementById("sidebar-avatar");
    const avLg        = document.getElementById("perfil-avatar-lg");
    const thumbEl     = document.getElementById("perfil-foto-thumb");
    _renderAvatar(novoUsuario.foto_url, novaInicial, thumbEl, avLg);
    _renderAvatar(novoUsuario.foto_url, novaInicial, avatarSide, avatarTop);
    if (avatarTop && !novoUsuario.foto_url) avatarTop.title = res.email;

    document.getElementById("perfil-hero-nome").textContent = res.nome || res.email;
    const sideEmail = document.getElementById("user-email");
    if (sideEmail) sideEmail.textContent = res.email;

    bootstrap.Modal.getInstance(document.getElementById("modalPerfil"))?.hide();
    notificar("Perfil atualizado!", "sucesso");
  } catch (err) {
    erroEl.textContent   = err?.erro || "Erro ao salvar. Tente novamente.";
    erroEl.style.display = "block";
  } finally {
    btn.disabled  = false;
    btn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Salvar alterações';
  }
}

async function _trocarSenha(e) {
  e.preventDefault();
  const btn        = document.getElementById("senha-btn-salvar");
  const erroEl     = document.getElementById("senha-erro");
  const okEl       = document.getElementById("senha-ok");
  const senhaAtual = document.getElementById("senha-atual")?.value || "";
  const senhaNova  = document.getElementById("senha-nova")?.value  || "";
  const senhaConf  = document.getElementById("senha-confirma")?.value || "";

  erroEl.style.display = "none";
  okEl.style.display   = "none";

  if (senhaNova !== senhaConf) {
    erroEl.textContent   = "A nova senha e a confirmação não coincidem.";
    erroEl.style.display = "block";
    return;
  }

  btn.disabled  = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Alterando…';

  try {
    const { changePassword } = await import("./services/api.js");
    await changePassword({ senha_atual: senhaAtual, senha_nova: senhaNova });
    document.getElementById("formSenha").reset();
    okEl.style.display = "block";
    notificar("Senha alterada com sucesso!", "sucesso");
  } catch (err) {
    erroEl.textContent   = err?.erro || "Erro ao alterar senha.";
    erroEl.style.display = "block";
  } finally {
    btn.disabled  = false;
    btn.innerHTML = '<i class="bi bi-lock-fill me-1"></i>Alterar senha';
  }
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
  const tema = localStorage.getItem("disputaapp-theme") || "light";
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

  // Avatar → abre modal de perfil
  document.getElementById("topbar-avatar")?.addEventListener("click", _abrirPerfil);

  // Avatar grande do perfil → visualizar foto (se houver imagem)
  document.getElementById("perfil-avatar-lg")?.addEventListener("click", () => {
    const imgEl = document.getElementById("perfil-avatar-lg")?.querySelector("img");
    if (imgEl?.src) _openFotoViewer(imgEl.src);
  });

  // Visualizador de foto — fechar ao clicar no overlay ou no botão X
  document.getElementById("foto-viewer")?.addEventListener("click", e => {
    if (e.target === e.currentTarget) _closeFotoViewer();
  });
  document.getElementById("foto-viewer-close")?.addEventListener("click", _closeFotoViewer);

  // Fechar visualizador com Escape (não propaga para modais Bootstrap)
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      const overlay = document.getElementById("foto-viewer");
      if (overlay && overlay.style.display !== "none") {
        _closeFotoViewer();
        e.stopImmediatePropagation();
      }
    }
  }, { capture: true });

  // Escutar evento de foto de campeonato (disparado por overview.js)
  document.addEventListener("disputaapp:view-foto", e => {
    if (e.detail?.url) _openFotoViewer(e.detail.url);
  });

  // Botão lápis no avatar do perfil → toggle seção de foto
  document.getElementById("perfil-avatar-edit-btn")?.addEventListener("click", () => {
    const sec = document.getElementById("perfil-foto-section");
    if (!sec) return;
    sec.style.display = sec.style.display === "none" ? "" : "none";
  });

  // Botão "Escolher arquivo" → abre file picker
  document.getElementById("btn-escolher-foto-perfil")?.addEventListener("click", () => {
    document.getElementById("perfil-input-foto-file")?.click();
  });

  // Arquivo selecionado → converte para base64 e mostra preview
  document.getElementById("perfil-input-foto-file")?.addEventListener("change", e => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notificar("Formato inválido. Use JPG, PNG ou WebP.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      notificar("Imagem muito grande. Máx. 3 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const base64  = ev.target.result;
      const hidden  = document.getElementById("perfil-input-foto");
      if (hidden) hidden.value = base64;
      const u       = getUsuario();
      const inicial = (u?.nome || u?.email || "?")[0].toUpperCase();
      _renderAvatar(base64, inicial,
        document.getElementById("perfil-foto-thumb"),
        document.getElementById("perfil-avatar-lg"));
      const nomeEl = document.getElementById("perfil-foto-nome");
      if (nomeEl) { nomeEl.textContent = file.name; nomeEl.style.display = ""; }
      const removerBtn = document.getElementById("btn-remover-foto-perfil");
      if (removerBtn) removerBtn.style.display = "";
    };
    reader.readAsDataURL(file);
  });

  // Botão "Remover foto" → limpa seleção
  document.getElementById("btn-remover-foto-perfil")?.addEventListener("click", () => {
    const hidden = document.getElementById("perfil-input-foto");
    if (hidden) hidden.value = "";
    const u       = getUsuario();
    const inicial = (u?.nome || u?.email || "?")[0].toUpperCase();
    _renderAvatar(null, inicial,
      document.getElementById("perfil-foto-thumb"),
      document.getElementById("perfil-avatar-lg"));
    const nomeEl = document.getElementById("perfil-foto-nome");
    if (nomeEl) { nomeEl.textContent = ""; nomeEl.style.display = "none"; }
    const removerBtn = document.getElementById("btn-remover-foto-perfil");
    if (removerBtn) removerBtn.style.display = "none";
  });

  // Toggle de tema dentro do modal de perfil
  document.getElementById("perfil-theme-row")?.addEventListener("click", () => {
    toggleTema();
    _syncPerfilTema();
  });

  // Tabs do modal de perfil
  document.querySelectorAll(".perfil-tab").forEach(btn => {
    btn.addEventListener("click", () => _mudarTabPerfil(btn.dataset.tab));
  });

  // Formulário de perfil → salvar
  document.getElementById("formPerfil")?.addEventListener("submit", _salvarPerfil);

  // Formulário de senha → trocar
  document.getElementById("formSenha")?.addEventListener("submit", _trocarSenha);

  // Botão excluir conta (modal perfil)
  document.getElementById("perfil-btn-excluir")?.addEventListener("click", async () => {
    const ok = confirm(
      "Tem certeza que deseja excluir sua conta?\n\nEsta ação é permanente e irá remover todos os seus campeonatos e dados."
    );
    if (!ok) return;
    try {
      const { deleteAccount } = await import("./services/api.js");
      await deleteAccount();
      bootstrap.Modal.getInstance(document.getElementById("modalPerfil"))?.hide();
      logout();
    } catch {
      notificar("Não foi possível excluir a conta. Tente novamente.");
    }
  });

  // Mais sheet (mobile — contexto campeonato)
  const maisBackdrop = document.getElementById("mais-sheet-backdrop");
  document.getElementById("btn-mais-camp")?.addEventListener("click", () => {
    maisBackdrop?.classList.add("open");
    maisBackdrop?.removeAttribute("aria-hidden");
  });
  maisBackdrop?.addEventListener("click", e => {
    if (e.target === maisBackdrop) {
      maisBackdrop.classList.remove("open");
      maisBackdrop.setAttribute("aria-hidden", "true");
    }
  });
  document.querySelectorAll(".mais-sheet-item[data-tela]").forEach(el => {
    el.addEventListener("click", () => {
      maisBackdrop?.classList.remove("open");
      maisBackdrop?.setAttribute("aria-hidden", "true");
      mudarTela(el.dataset.tela);
    });
  });

  // Contexto de campeonato
  document.addEventListener("disputaapp:abrir-campeonato", e => abrirContextoCampeonato(e.detail));
  document.getElementById("btn-voltar-geral")?.addEventListener("click", voltarContextoGeral);
  document.getElementById("ds-btn-voltar-geral")?.addEventListener("click", voltarContextoGeral);
  document.getElementById("btn-topbar-voltar")?.addEventListener("click", voltarContextoGeral);

  // Botões "Mais" na sidebar mobile e desktop → abrem mais-sheet
  const _openMaisSheet = () => {
    maisBackdrop?.classList.add("open");
    maisBackdrop?.removeAttribute("aria-hidden");
  };
  document.getElementById("sb-btn-mais-camp")?.addEventListener("click", () => {
    closeSidebar();
    _openMaisSheet();
  });
  document.getElementById("ds-btn-mais-camp")?.addEventListener("click", _openMaisSheet);

  // Navegação interna (disparada por sub-componentes)
  document.addEventListener("disputaapp:navegar", e => mudarTela(e.detail));

  // Toggle de visibilidade de senha
  _initPasswordToggles();

  // Sidebar mobile toggle
  const sidebar      = document.querySelector(".sidebar");
  const sidebarOverlay = document.getElementById("sidebar-overlay");
  function openSidebar() {
    sidebar?.classList.add("open");
    sidebarOverlay?.classList.add("open");
    sidebarOverlay?.removeAttribute("aria-hidden");
  }
  function closeSidebar() {
    sidebar?.classList.remove("open");
    sidebarOverlay?.classList.remove("open");
    sidebarOverlay?.setAttribute("aria-hidden", "true");
  }
  document.getElementById("btn-sidebar-toggle")?.addEventListener("click", openSidebar);
  sidebarOverlay?.addEventListener("click", closeSidebar);
  // Fecha a sidebar ao navegar em mobile
  document.querySelectorAll(".nav-item[data-tela], .bottom-nav-item[data-tela]").forEach(el => {
    el.addEventListener("click", () => {
      if (window.innerWidth <= 768) closeSidebar();
    });
  });

  // Logout
  document.getElementById("btn-logout")?.addEventListener("click", logout);
  document.getElementById("btn-logout-mobile")?.addEventListener("click", logout);
  document.getElementById("config-btn-logout")?.addEventListener("click", logout);

  // Configurações → ir para tela Sobre
  document.getElementById("config-btn-sobre")?.addEventListener("click", () => mudarTela("sobre"));

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

  // Planos — assinar e cancelar
  document.getElementById("btn-assinar-mensal")?.addEventListener("click", () => _assinarPlano("mensal"));
  document.getElementById("btn-assinar-anual")?.addEventListener("click",  () => _assinarPlano("anual"));
  document.getElementById("btn-cancelar-plano")?.addEventListener("click", _cancelarPlano);

  // Escutar evento de campeonatos criados (disparado por campeonatos.js)
  document.addEventListener("disputaapp:campeonatos-updated", () => loadDashboard());

  // Token expirado ou inválido → toast + logout automático
  document.addEventListener("disputaapp:unauthorized", () => {
    if (getToken()) {
      notificar("Sessão expirada. Faça login novamente.");
      setTimeout(logout, 1500);
    }
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
