const API = "";

let usuario = null;
let token = null;
let modalJogoAtual = null;
let timerInterval = null;

// ── Helpers ────────────────────────────────────────────────

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
}

// ── Navegação lateral ──────────────────────────────────────

function mudarTela(id, el) {
  document.querySelectorAll(".tela").forEach(t => t.classList.remove("ativa"));
  document.getElementById(id).classList.add("ativa");
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("ativo"));
  if (el) el.classList.add("ativo");
  const title = document.getElementById("topbar-title");
  if (title) title.textContent = el ? el.textContent.trim() : id;

  // Atualiza listas ao mudar de tela
  if (id === "times")          listarTimes();
  if (id === "jogos")          listarJogos();
  if (id === "classificacao")  carregarClassificacao();
  if (id === "campeonatos")    listarCampeonatosLista();
}

// ── Autenticação ───────────────────────────────────────────

function mostrarTelaAuth(tela) {
  document.getElementById("tela-login").style.display    = tela === "login"    ? "" : "none";
  document.getElementById("tela-register").style.display = tela === "register" ? "" : "none";
  document.getElementById("login-erro").textContent    = "";
  document.getElementById("register-erro").textContent = "";
}

async function login() {
  const email = document.getElementById("loginEmail").value.trim();
  const senha  = document.getElementById("loginSenha").value;
  const erroEl = document.getElementById("login-erro");

  if (!email || !senha) { erroEl.textContent = "Preencha email e senha"; return; }

  const res  = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha })
  });
  const data = await res.json();

  if (!res.ok) { erroEl.textContent = data.erro || "Credenciais inválidas"; return; }
  _aposAutenticar(data);
}

async function register() {
  const email    = document.getElementById("registerEmail").value.trim();
  const senha    = document.getElementById("registerSenha").value;
  const confirma = document.getElementById("registerConfirma").value;
  const erroEl   = document.getElementById("register-erro");

  if (!email || !senha)   { erroEl.textContent = "Preencha email e senha"; return; }
  if (senha !== confirma) { erroEl.textContent = "As senhas não coincidem"; return; }
  if (senha.length < 4)   { erroEl.textContent = "Senha deve ter no mínimo 4 caracteres"; return; }

  const res  = await fetch(`${API}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha })
  });
  const data = await res.json();

  if (!res.ok) { erroEl.textContent = data.erro || "Erro ao criar conta"; return; }
  _aposAutenticar(data);
}

function _aposAutenticar(data) {
  usuario = data;
  token   = data.token;
  document.getElementById("login-erro").textContent    = "";
  document.getElementById("login-overlay").style.display = "none";
  document.getElementById("user-email").textContent   = usuario.email;
  document.getElementById("user-strip").style.display = "flex";
  carregarCampeonatos();
}

function logout() {
  usuario = null;
  token   = null;
  document.getElementById("login-overlay").style.display = "flex";
  document.getElementById("user-strip").style.display    = "none";
  ["campeonatoSelect", "campeonatoSelectTimes", "campeonatoSelectJogos"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
  });
  ["lista-times-tela", "jogos-list", "jogos-dashboard", "lista-campeonatos"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
  });
  const tabela = document.getElementById("tabela");
  if (tabela) tabela.innerHTML = "";
  mostrarTelaAuth("login");
}

// ── Campeonatos ────────────────────────────────────────────

async function carregarCampeonatos() {
  if (!usuario) return;

  const res  = await fetch(`${API}/campeonatos?user_id=${usuario.id}`);
  const data = await res.json();

  const ids = ["campeonatoSelect", "campeonatoSelectTimes", "campeonatoSelectJogos"];
  ids.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = "";
    data.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.nome;
      sel.appendChild(opt);
    });
    // Mantém seleção anterior se ainda existir
    if (current && [...sel.options].some(o => o.value === current)) sel.value = current;
  });

  onCampeonatoChange();
}

async function criarCampeonato() {
  const nome       = document.getElementById("nomeCampeonato").value.trim();
  const modalidade = document.getElementById("modalidadeCampeonato").value.trim();
  if (!nome || !modalidade) return;

  await fetch(`${API}/campeonatos`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ nome, modalidade, user_id: usuario ? usuario.id : null })
  });

  document.getElementById("nomeCampeonato").value       = "";
  document.getElementById("modalidadeCampeonato").value = "";
  await carregarCampeonatos();
  listarCampeonatosLista();
}

async function listarCampeonatosLista() {
  if (!usuario) return;
  const res  = await fetch(`${API}/campeonatos?user_id=${usuario.id}`);
  const data = await res.json();
  const el   = document.getElementById("lista-campeonatos");
  if (!el) return;

  if (!data.length) { el.innerHTML = '<p style="color:#94a3b8;font-size:13px">Nenhum campeonato criado.</p>'; return; }

  el.innerHTML = data.map(c => `
    <div class="campeonato-item">
      <strong>${c.nome}</strong>
      <span class="campeonato-modalidade">${c.modalidade}</span>
    </div>
  `).join("");
}

// Chamado quando o select principal muda
function onCampeonatoChange() {
  const val = document.getElementById("campeonatoSelect").value;
  // Sincroniza os outros selects
  ["campeonatoSelectTimes", "campeonatoSelectJogos"].forEach(id => {
    const sel = document.getElementById(id);
    if (sel && val) sel.value = val;
  });
  atualizarDashboard();
  listarJogos();
  listarTimes();
  carregarClassificacao();
}

// ── Dashboard ──────────────────────────────────────────────

async function atualizarDashboard() {
  const sel = document.getElementById("campeonatoSelect");
  if (!sel || !sel.value) return;

  const campeonato_id = sel.value;
  const nomeEl = sel.options[sel.selectedIndex];

  const dashNome = document.getElementById("dash-campeonato-nome");
  if (dashNome && nomeEl) dashNome.textContent = nomeEl.textContent;

  // Times
  try {
    const resT = await fetch(`${API}/times/${campeonato_id}`);
    const times = await resT.json();
    const dashT = document.getElementById("dash-times");
    if (dashT) dashT.textContent = times.length;
  } catch (_) {}

  // Jogos
  try {
    const resJ = await fetch(`${API}/jogos/${campeonato_id}`);
    const jogos = await resJ.json();
    const dashJ = document.getElementById("dash-jogos");
    const dashE = document.getElementById("dash-encerrados");
    if (dashJ) dashJ.textContent = jogos.length;
    if (dashE) dashE.textContent = jogos.filter(j => j.status === "encerrado").length;
  } catch (_) {}
}

// ── Times ──────────────────────────────────────────────────

async function criarTime() {
  const nome           = document.getElementById("nomeTime").value.trim();
  const campeonato_id  = document.getElementById("campeonatoSelectTimes").value;
  if (!nome || !campeonato_id) return;

  await fetch(`${API}/times`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ nome, campeonato_id })
  });

  document.getElementById("nomeTime").value = "";
  listarTimes();
}

async function listarTimes() {
  const campeonato_id = document.getElementById("campeonatoSelectTimes")?.value
                     || document.getElementById("campeonatoSelect")?.value;
  if (!campeonato_id) return;

  const res  = await fetch(`${API}/times/${campeonato_id}`);
  const data = await res.json();

  const el = document.getElementById("lista-times-tela");
  if (!el) return;
  el.innerHTML = "";

  if (!data.length) {
    el.innerHTML = '<span style="color:#94a3b8;font-size:13px">Nenhum time cadastrado.</span>';
    return;
  }

  data.forEach(t => {
    const div = document.createElement("div");
    div.className = "time-card";
    div.textContent = t.nome;
    el.appendChild(div);
  });
}

// ── Jogos ──────────────────────────────────────────────────

async function gerarJogos() {
  const campeonato_id = document.getElementById("campeonatoSelectJogos").value;
  if (!campeonato_id) return;

  await fetch(`${API}/gerar-jogos/${campeonato_id}`, { method: "POST", headers: authHeaders() });
  listarJogos();
}

async function listarJogos() {
  const campeonato_id = document.getElementById("campeonatoSelect")?.value;
  if (!campeonato_id) return;

  const res  = await fetch(`${API}/jogos/${campeonato_id}`);
  const data = await res.json();

  // Atualiza modal se aberto
  if (modalJogoAtual) {
    const updated = data.find(j => j.id === modalJogoAtual.id);
    if (updated) {
      modalJogoAtual = updated;
      document.getElementById("modal-score-a").textContent = updated.placar_a;
      document.getElementById("modal-score-b").textContent = updated.placar_b;
      atualizarStatusBotoes(updated.status);
    }
  }

  const html = data.length
    ? data.map(j => jogoCardHTML(j)).join("")
    : '<p style="color:#94a3b8;font-size:13px">Nenhum jogo gerado.</p>';

  // Tela Jogos
  const listEl = document.getElementById("jogos-list");
  if (listEl) {
    listEl.innerHTML = html;
    listEl.querySelectorAll(".jogo-card").forEach((card, i) => {
      card.addEventListener("click", () => abrirModal(data[i]));
    });
  }

  // Dashboard — apenas 5 mais recentes
  const dashEl = document.getElementById("jogos-dashboard");
  if (dashEl) {
    const recentes = [...data].slice(-5).reverse();
    dashEl.innerHTML = recentes.length
      ? recentes.map(j => jogoCardHTML(j)).join("")
      : '<p style="color:#94a3b8;font-size:13px">Nenhum jogo ainda.</p>';
    dashEl.querySelectorAll(".jogo-card").forEach((card, i) => {
      card.addEventListener("click", () => abrirModal(recentes[i]));
    });
  }
}

function jogoCardHTML(j) {
  return `
    <div class="jogo-card">
      <strong>${j.time_a}</strong>
      <span class="placar-display">${j.placar_a} – ${j.placar_b}</span>
      <strong>${j.time_b}</strong>
      <span class="jogo-status-badge status-${j.status}">${statusLabel(j.status)}</span>
    </div>`;
}

// ── Classificação ──────────────────────────────────────────

async function carregarClassificacao() {
  const campeonato_id = document.getElementById("campeonatoSelect")?.value;
  if (!campeonato_id) return;

  const res  = await fetch(`${API}/classificacao/${campeonato_id}`);
  const data = await res.json();

  const tabela = document.getElementById("tabela");
  if (!tabela) return;

  tabela.innerHTML = `
    <thead>
      <tr>
        <th>Time</th><th>Pts</th><th>V</th><th>E</th><th>D</th><th>SG</th>
      </tr>
    </thead>
    <tbody>
      ${data.map(t => `
        <tr>
          <td>${t.nome}</td>
          <td><strong>${t.pontos}</strong></td>
          <td>${t.vitorias}</td>
          <td>${t.empates}</td>
          <td>${t.derrotas}</td>
          <td>${t.saldo}</td>
        </tr>
      `).join("")}
    </tbody>`;

  if (!data.length) {
    tabela.innerHTML += '<caption style="caption-side:bottom;color:#94a3b8;font-size:12px;padding:12px">Nenhum jogo encerrado ainda.</caption>';
  }
}

// ── Polling ────────────────────────────────────────────────

setInterval(() => {
  if (!usuario) return;
  const id = document.getElementById("campeonatoSelect")?.value;
  if (!id || isNaN(id)) return;
  listarJogos();
  carregarClassificacao();
  atualizarDashboard();
}, 2000);

// ── Modal de partida ───────────────────────────────────────

function statusLabel(status) {
  const map = {
    aguardando:     "Aguardando",
    primeiro_tempo: "1º Tempo",
    intervalo:      "Intervalo",
    segundo_tempo:  "2º Tempo",
    encerrado:      "Encerrado"
  };
  return map[status] || status;
}

function abrirModal(jogo) {
  modalJogoAtual = jogo;

  document.getElementById("modal-time-a").textContent   = jogo.time_a;
  document.getElementById("modal-time-b").textContent   = jogo.time_b;
  document.getElementById("modal-score-a").textContent  = jogo.placar_a;
  document.getElementById("modal-score-b").textContent  = jogo.placar_b;

  const sel         = document.getElementById("modalDuracaoSelect");
  const customInput = document.getElementById("duracaoCustom");
  const known       = ["45", "20", "10", "30", "25"];
  if (known.includes(String(jogo.duracao))) {
    sel.value                 = String(jogo.duracao);
    customInput.style.display = "none";
  } else {
    sel.value                 = "custom";
    customInput.style.display = "";
    customInput.value         = jogo.duracao;
  }

  atualizarStatusBotoes(jogo.status);
  document.getElementById("modal-jogo").classList.add("open");

  clearInterval(timerInterval);
  timerInterval = setInterval(tickTimer, 1000);
  tickTimer();
}

function fecharModal() {
  clearInterval(timerInterval);
  timerInterval  = null;
  modalJogoAtual = null;
  document.getElementById("modal-jogo").classList.remove("open");
}

function tickTimer() {
  if (!modalJogoAtual) return;
  const j = modalJogoAtual;
  let elapsed = j.tempo_acumulado || 0;

  if ((j.status === "primeiro_tempo" || j.status === "segundo_tempo") && j.tempo_inicio) {
    elapsed += Math.floor(Date.now() / 1000 - j.tempo_inicio);
  }

  const min     = Math.floor(elapsed / 60);
  const sec     = elapsed % 60;
  const display = document.getElementById("timer-display");
  display.textContent = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;

  const sel         = document.getElementById("modalDuracaoSelect");
  const customInput = document.getElementById("duracaoCustom");
  const duracao     = sel.value === "custom" ? parseInt(customInput.value) || 0 : parseInt(sel.value);
  display.classList.toggle("timer-overtime", duracao > 0 && min >= duracao);
}

function atualizarStatusBotoes(status) {
  const badge = document.getElementById("modal-status-badge");
  badge.textContent = statusLabel(status);
  badge.className   = "status-badge-modal";
  if (status === "primeiro_tempo" || status === "segundo_tempo") badge.classList.add("ativo");
  else if (status === "intervalo") badge.classList.add("intervalo-st");
  else if (status === "encerrado") badge.classList.add("encerrado-st");

  document.getElementById("btn-iniciar").disabled  = status !== "aguardando";
  document.getElementById("btn-intervalo").disabled = status !== "primeiro_tempo";
  document.getElementById("btn-segundo").disabled   = status !== "intervalo";
  document.getElementById("btn-encerrar").disabled  = status !== "segundo_tempo" && status !== "primeiro_tempo";

  const activeMap = {
    primeiro_tempo: "btn-iniciar",
    intervalo:      "btn-intervalo",
    segundo_tempo:  "btn-segundo",
    encerrado:      "btn-encerrar"
  };
  ["btn-iniciar", "btn-intervalo", "btn-segundo", "btn-encerrar"].forEach(id => {
    document.getElementById(id).classList.remove("btn-ativo");
  });
  if (activeMap[status]) document.getElementById(activeMap[status]).classList.add("btn-ativo");
}

function onDuracaoChange() {
  const sel         = document.getElementById("modalDuracaoSelect");
  const customInput = document.getElementById("duracaoCustom");
  customInput.style.display = sel.value === "custom" ? "" : "none";
}

async function gol(lado, delta) {
  if (!modalJogoAtual) return;
  const res  = await fetch(`${API}/jogos/${modalJogoAtual.id}/gol`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ lado, delta })
  });
  const data = await res.json();
  document.getElementById("modal-score-a").textContent = data.placar_a;
  document.getElementById("modal-score-b").textContent = data.placar_b;
  modalJogoAtual.placar_a = data.placar_a;
  modalJogoAtual.placar_b = data.placar_b;
}

async function mudarStatus(acao) {
  if (!modalJogoAtual) return;
  const sel         = document.getElementById("modalDuracaoSelect");
  const customInput = document.getElementById("duracaoCustom");
  const duracao     = sel.value === "custom" ? parseInt(customInput.value) : parseInt(sel.value);

  const res  = await fetch(`${API}/jogos/${modalJogoAtual.id}/status`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ acao, duracao })
  });
  const data = await res.json();
  modalJogoAtual.status          = data.status;
  modalJogoAtual.tempo_inicio    = data.tempo_inicio;
  modalJogoAtual.tempo_acumulado = data.tempo_acumulado;
  modalJogoAtual.duracao         = duracao;
  atualizarStatusBotoes(data.status);
}

