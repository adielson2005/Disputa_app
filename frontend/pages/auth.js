// ── Página: Autenticação (Login / Registro) ───────────────────────────────────
import { login as apiLogin, register as apiRegister } from "../services/api.js";
import { setAuth } from "../store.js";

let _onSuccess = null;
let _initialized = false;

export function init(onSuccess) {
  _onSuccess = onSuccess;
  if (_initialized) return;
  _initialized = true;

  _el("btn-login").addEventListener("click", _handleLogin);
  _el("btn-register").addEventListener("click", _handleRegister);
  _el("link-to-register").addEventListener("click", e => { e.preventDefault(); mostrar("register"); });
  _el("link-to-login").addEventListener("click",    e => { e.preventDefault(); mostrar("login"); });
  _el("loginSenha").addEventListener("keydown",     e => { if (e.key === "Enter") _handleLogin(); });
  _el("registerConfirma").addEventListener("keydown", e => { if (e.key === "Enter") _handleRegister(); });
}

export function mostrar(tela) {
  _el("tela-login").style.display    = tela === "login"    ? "" : "none";
  _el("tela-register").style.display = tela === "register" ? "" : "none";
  _el("login-erro").textContent    = "";
  _el("register-erro").textContent = "";
}

// ── Internos ──────────────────────────────────────────────────────────────────

async function _handleLogin() {
  const email = _el("loginEmail").value.trim();
  const senha = _el("loginSenha").value;
  if (!email || !senha) { _el("login-erro").textContent = "Preencha email e senha"; return; }
  try {
    const data = await apiLogin(email, senha);
    setAuth(data, data.token);
    _el("login-overlay").style.display = "none";
    _onSuccess?.(data);
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
  if (senha.length < 4)   { _el("register-erro").textContent = "Mínimo 4 caracteres"; return; }
  try {
    const data = await apiRegister(email, senha);
    setAuth(data, data.token);
    _el("login-overlay").style.display = "none";
    _onSuccess?.(data);
  } catch (e) {
    _el("register-erro").textContent = e.erro || "Erro ao criar conta";
  }
}

function _el(id) { return document.getElementById(id); }
