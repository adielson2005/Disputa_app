// ── Página: Campeonatos ───────────────────────────────────────────────────────
import { getCampeonatos, createCampeonato, deleteCampeonato } from "../services/api.js";
import { confirmar } from "../components/ui.js";

let _initialized = false;
let _lista = [];
let _filtro = "";

const STATUS_META = {
  nao_iniciado: { label: "Não iniciado", cls: "camp-status-aguardando" },
  em_andamento: { label: "Em andamento", cls: "camp-status-ativo"     },
  finalizado:   { label: "Finalizado",   cls: "camp-status-enc"       },
};

const MODALIDADE_ICONS = {
  futebol:    "bi-dribbble",
  futsal:     "bi-dribbble",
  fut7:       "bi-dribbble",
  basquete:   "bi-basket",
  volei:      "bi-disc",
  vôlei:      "bi-disc",
  handebol:   "bi-hand-index-thumb",
  hoquei:     "bi-activity",
  hóquei:     "bi-activity",
};

export function init() {
  if (_initialized) return;
  _initialized = true;

  // Form de criação (Bootstrap modal)
  document.getElementById("formCampeonato")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const raw  = Object.fromEntries(new FormData(e.target));
    const data = {
      nome:       (raw.nome || "").trim(),
      modalidade: (raw.modalidade || "").trim(),
    };
    if (raw.formato)   data.formato   = raw.formato;
    if (raw.descricao && raw.descricao.trim()) data.descricao = raw.descricao.trim();

    const btn = e.target.querySelector("button[type=submit]");
    if (btn) { btn.disabled = true; btn.innerHTML = `<span class="ui-spinner"></span>&nbsp;Criando...`; }

    try {
      await createCampeonato(data);
      e.target.reset();
      const bsModal = bootstrap.Modal.getInstance(document.getElementById("modalCampeonato"));
      bsModal?.hide();
      await _renderLista();
      document.dispatchEvent(new CustomEvent("disputaapp:campeonatos-updated"));
      _showToast("Campeonato criado com sucesso!");
    } catch (err) {
      console.error("Erro ao criar campeonato", err);
      _showToast(err?.erro || "Erro ao criar campeonato", true);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Criar Campeonato"; }
    }
  });

  // Busca
  _el("camp-busca")?.addEventListener("input", e => {
    _filtro = e.target.value.toLowerCase();
    _pintarLista();
  });

  // Clique em item → abrir campeonato
  _el("lista-campeonatos")?.addEventListener("click", e => {
    const btnDel = e.target.closest(".btn-deletar-camp");
    if (btnDel) {
      e.stopPropagation();
      _confirmarDelecao(parseInt(btnDel.dataset.id));
      return;
    }
    const item = e.target.closest(".campeonato-item[data-id]");
    if (!item) return;
    const camp = _lista.find(c => c.id === parseInt(item.dataset.id));
    if (camp)
      document.dispatchEvent(new CustomEvent("disputaapp:abrir-campeonato", { detail: camp }));
  });
}

export async function load() {
  await _renderLista();
}

// ── Internos ──────────────────────────────────────────────────────────────────

function _showToast(message, isError = false) {
  const toast = document.getElementById("app-toast");
  if (!toast) return;
  toast.textContent = message;
  toast.style.background = isError ? "#ef4444" : "var(--accent)";
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

async function _confirmarDelecao(id) {
  const camp = _lista.find(c => c.id === id);
  if (!camp) return;

  const ok = await confirmar({
    titulo:    "Excluir campeonato?",
    nome:      camp.nome,
    descricao: "Esta ação não pode ser desfeita.",
  });
  if (!ok) return;

  const itemEl = document.querySelector(`.campeonato-item[data-id="${id}"]`);
  const btnEl  = itemEl?.querySelector(".btn-deletar-camp");
  if (itemEl) itemEl.classList.add("campeonato-item--deleting");
  if (btnEl)  { btnEl.innerHTML = `<span class="ui-spinner"></span>`; btnEl.disabled = true; }

  try {
    await deleteCampeonato(id);
    await _renderLista();
    document.dispatchEvent(new CustomEvent("disputaapp:campeonatos-updated"));
  } catch (e) {
    console.error("Erro ao deletar", e);
    if (itemEl) itemEl.classList.remove("campeonato-item--deleting");
    if (btnEl)  { btnEl.innerHTML = `<i class="bi bi-trash3"></i>`; btnEl.disabled = false; }
  }
}

async function _renderLista() {
  try {
    _lista = await getCampeonatos();
    _pintarLista();
  } catch (e) {
    if (e?.status !== 401) console.error("Campeonatos load error", e);
  }
}

function _pintarLista() {
  const el = _el("lista-campeonatos");
  if (!el) return;
  const visivel = _filtro
    ? _lista.filter(c =>
        c.nome.toLowerCase().includes(_filtro) ||
        c.modalidade.toLowerCase().includes(_filtro))
    : _lista;

  if (!visivel.length) {
    el.innerHTML = `<p class="camp-empty">${
      _filtro ? "Nenhum resultado para esta busca." : "Nenhum campeonato criado ainda."
    }</p>`;
    return;
  }

  el.innerHTML = visivel.map(c => {
    const meta  = STATUS_META[c.status] ?? STATUS_META.nao_iniciado;
    const prog  = c.total_jogos > 0
      ? Math.round((c.jogos_encerrados / c.total_jogos) * 100) : 0;
    const modLower = (c.modalidade || "").toLowerCase();
    const icone = MODALIDADE_ICONS[modLower] || "bi-trophy-fill";
    const badges = [
      c.formato                                      ? `<span>${c.formato}</span>`     : "",
      c.categoria && c.categoria !== "Livre"          ? `<span>${c.categoria}</span>`   : "",
      c.duracao_padrao                               ? `<span>${c.duracao_padrao}min</span>` : "",
      c.ida_volta                                    ? `<span><i class="bi bi-arrow-left-right"></i> I&amp;V</span>` : "",
    ].filter(Boolean).join("");
    return `
      <div class="campeonato-item" data-id="${c.id}" role="button" tabindex="0">
        <div class="campeonato-item-icon"><i class="bi ${icone}"></i></div>
        <div class="campeonato-item-body">
          <div class="campeonato-item-top">
            <div class="campeonato-item-nome">${c.nome}</div>
            <span class="camp-status-badge ${meta.cls}">${meta.label}</span>
          </div>
          <div class="campeonato-item-meta">
            <span><i class="bi bi-people-fill"></i> ${c.total_times} time${c.total_times !== 1 ? "s" : ""}</span>
            <span><i class="bi bi-calendar3"></i> ${c.jogos_encerrados}/${c.total_jogos} jogos</span>
            <span>${c.modalidade}</span>
            ${badges}
          </div>
          ${c.total_jogos > 0 ? `
          <div class="camp-prog-bar">
            <div class="camp-prog-fill" style="width:${prog}%"></div>
          </div>` : ""}
        </div>
        <button class="btn-deletar-camp" data-id="${c.id}" title="Excluir" aria-label="Excluir campeonato">
          <i class="bi bi-trash3"></i>
        </button>
      </div>`;
  }).join("");
}

function _el(id) { return document.getElementById(id); }

function _atualizarVisibilidadeEliminatorias() {
  const show = _formato === "Eliminatórias";
  _el("copa-fase-inicial-section")?.classList.toggle("hidden", !show);
  if (!show) {
    _faseInicial = "";
    _el("fase-inicial-pills")?.querySelectorAll(".cc-pill").forEach(p => p.classList.remove("selected"));
  }
}

