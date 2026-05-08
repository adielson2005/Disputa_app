// ── Página: Autenticação (Login / Registro) ───────────────────────────────────
import { login as apiLogin, register as apiRegister, loginGoogle as apiLoginGoogle } from "../services/api.js";
import { setAuth } from "../store.js";

let _onSuccess  = null;
let _initialized = false;

export function init(onSuccess) {
  _onSuccess = onSuccess;
  if (_initialized) return;
  _initialized = true;

  _el("btn-login").addEventListener("click", _handleLogin);
  _el("btn-register").addEventListener("click", _handleRegister);
  _el("link-to-register").addEventListener("click", e => { e.preventDefault(); mostrar("register"); });
  _el("link-to-login").addEventListener("click",    e => { e.preventDefault(); mostrar("login"); });
  _el("loginSenha").addEventListener("keydown",       e => { if (e.key === "Enter") _handleLogin(); });
  _el("registerConfirma").addEventListener("keydown", e => { if (e.key === "Enter") _handleRegister(); });

  // Botões Google
  _el("btn-google-login")?.addEventListener("click",    () => _handleGoogle("login-erro"));
  _el("btn-google-register")?.addEventListener("click", () => _handleGoogle("register-erro"));
}

export function mostrar(tela) {
  _el("tela-login").style.display    = tela === "login"    ? "" : "none";
  _el("tela-register").style.display = tela === "register" ? "" : "none";
  _el("login-erro").textContent    = "";
  _el("register-erro").textContent = "";
}

// ── Google OAuth ──────────────────────────────────────────────────────────────

async function _handleGoogle(erroId) {
  const clientId = window.__GOOGLE_CLIENT_ID__;
  if (!clientId) {
    _el(erroId).textContent = "Login com Google não configurado";
    return;
  }

  try {
    const credential = await _googlePopup(clientId);
    const data = await apiLoginGoogle(credential);
    _success(data);
  } catch (e) {
    if (e === "popup_closed") return; // usuário fechou — silencioso
    _el(erroId).textContent = e?.erro || "Erro ao entrar com Google";
  }
}

function _googlePopup(clientId) {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.id) {
      reject({ erro: "SDK do Google não carregado" }); return;
    }
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (resp) => {
        if (resp.credential) resolve(resp.credential);
        else reject("popup_closed");
      },
      cancel_on_tap_outside: true,
    });
    window.google.accounts.id.prompt((notification) => {
      // Se o popup foi bloqueado ou suprimido, tenta renderizar o botão One Tap
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        reject("popup_closed");
      }
    });
  });
}

// ── Email/senha ───────────────────────────────────────────────────────────────

async function _handleLogin() {
  const email = _el("loginEmail").value.trim();
  const senha = _el("loginSenha").value;
  if (!email || !senha) { _el("login-erro").textContent = "Preencha email e senha"; return; }
  try {
    _success(await apiLogin(email, senha));
  } catch (e) {
    _el("login-erro").textContent = e.erro || "Credenciais inválidas";
  }
}

async function _handleRegister() {
  const email    = _el("registerEmail").value.trim();
  const senha    = _el("registerSenha").value;
  const confirma = _el("registerConfirma").value;
  if (!email || !senha)   { _el("register-erro").textContent = "Preencha email e senha"; return; }
  if (senha !== confirma) { _el("register-erro").textContent = "As senhas não coincidem"; return; }
  try {
    _success(await apiRegister(email, senha));
  } catch (e) {
    _el("register-erro").textContent = e.erro || "Erro ao criar conta";
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _success(data) {
  setAuth(data, data.token);
  _el("login-overlay").style.display = "none";
  _onSuccess?.(data);
}

function _el(id) { return document.getElementById(id); }
