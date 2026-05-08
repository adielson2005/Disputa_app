// ── Utilitários de UI: diálogo minimalista e loading ─────────────────────────

/**
 * Diálogo de confirmação minimalista.
 * Retorna Promise<boolean>.
 *
 * @param {object} opts
 * @param {string} [opts.titulo]   – Título da caixa
 * @param {string} [opts.nome]     – Nome em destaque (ex: nome do campeonato)
 * @param {string} [opts.descricao]– Descrição secundária
 * @param {string} [opts.confirmar]– Texto do botão de confirmar
 */
export function confirmar({
  titulo    = "Excluir?",
  nome      = "",
  descricao = "Esta ação não pode ser desfeita.",
  confirmar: txtConfirm = "Excluir",
} = {}) {
  return new Promise(resolve => {
    const el = document.createElement("div");
    el.className = "ui-backdrop";
    el.innerHTML = `
      <div class="ui-dialog" role="alertdialog" aria-modal="true">
        <p class="ui-dialog-titulo">${_esc(titulo)}</p>
        ${nome      ? `<p class="ui-dialog-nome">&ldquo;${_esc(nome)}&rdquo;</p>` : ""}
        ${descricao ? `<p class="ui-dialog-desc">${_esc(descricao)}</p>` : ""}
        <div class="ui-dialog-actions">
          <button class="ui-btn ui-btn-cancel">Cancelar</button>
          <button class="ui-btn ui-btn-confirm">${_esc(txtConfirm)}</button>
        </div>
      </div>`;

    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("ui-backdrop--open"));

    const close = ok => {
      el.classList.remove("ui-backdrop--open");
      el.addEventListener("transitionend", () => el.remove(), { once: true });
      resolve(ok);
    };

    el.querySelector(".ui-btn-cancel").addEventListener("click",  () => close(false));
    el.querySelector(".ui-btn-confirm").addEventListener("click", () => close(true));
    el.addEventListener("click", e => { if (e.target === el) close(false); });

    const onKey = e => {
      if (e.key === "Escape") { close(false); document.removeEventListener("keydown", onKey); }
    };
    document.addEventListener("keydown", onKey);
  });
}

// ── Notificação (toast) ───────────────────────────────────────────────────────

let _toastContainer = null;

function _getContainer() {
  if (!_toastContainer) {
    _toastContainer = document.createElement("div");
    _toastContainer.className = "ui-toast-container";
    document.body.appendChild(_toastContainer);
  }
  return _toastContainer;
}

/**
 * Exibe um toast minimalista.
 *
 * @param {string} mensagem  – Texto a exibir
 * @param {"erro"|"sucesso"|"info"} [tipo="erro"]
 * @param {number} [duracao=3500]  – ms até desaparecer
 */
export function notificar(mensagem, tipo = "erro", duracao = 3500) {
  const toast = document.createElement("div");
  toast.className = `ui-toast ui-toast--${tipo}`;
  toast.textContent = mensagem;

  _getContainer().appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("ui-toast--open"));

  const dismiss = () => {
    toast.classList.remove("ui-toast--open");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  };

  const t = setTimeout(dismiss, duracao);
  toast.addEventListener("click", () => { clearTimeout(t); dismiss(); });
}

// ── Internos ──────────────────────────────────────────────────────────────────

/** Escapa HTML simples para evitar XSS */
function _esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
