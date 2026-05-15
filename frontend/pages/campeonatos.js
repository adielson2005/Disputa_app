// ── Página: Campeonatos ───────────────────────────────────────────────────────
import { getCampeonatos, createCampeonato, deleteCampeonato } from "../services/api.js";
import { getUsuario } from "../store.js";
import { confirmar, notificar } from "../components/ui.js";

let _initialized = false;
let _lista = [];
let _filtro = "";
let _idaVolta = false;
let _modalidade = "";
let _formato = "";
let _faseInicial = "";  // oitavas | quartas | semifinal
let _categoria = "";
let _subCustom = "";

const FORMATO_HINT = {
  "Liga":          "Todos contra todos, classificação por pontos",
  "Eliminatórias": "Mata-mata direto — oitavas, quartas ou semifinal, com disputa de 3º lugar",
  "Grupos":        "Fase de grupos + mata-mata",
};

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

  // FAB → abrir painel
  _el("btn-novo-campeonato")?.addEventListener("click", _abrirPainel);
  _el("btn-fechar-criar")?.addEventListener("click", _fecharPainel);
  _el("btn-criar-campeonato")?.addEventListener("click", _handleCriar);

  // Enter no nome → foca primeira pill
  _el("nomeCampeonato")?.addEventListener("keydown", e => {
    if (e.key === "Enter") _el("modalidade-pills")?.querySelector(".cc-pill")?.focus();
  });

  // Pills de modalidade
  _el("modalidade-pills")?.addEventListener("click", e => {
    const pill = e.target.closest(".cc-pill");
    if (!pill) return;
    _modalidade = pill.dataset.value;
    _el("modalidade-pills").querySelectorAll(".cc-pill").forEach(p => p.classList.remove("selected"));
    pill.classList.add("selected");
  });

  // Pills de formato
  _el("formato-pills")?.addEventListener("click", e => {
    const pill = e.target.closest(".cc-pill");
    if (!pill) return;
    _formato = pill.dataset.value;
    _el("formato-pills").querySelectorAll(".cc-pill").forEach(p => p.classList.remove("selected"));
    pill.classList.add("selected");
    const hint = _el("formato-hint");
    if (hint) hint.textContent = FORMATO_HINT[_formato] || "";
    _atualizarVisibilidadeEliminatorias();
  });

  // Pills de fase inicial (eliminatórias)
  _el("fase-inicial-pills")?.addEventListener("click", e => {
    const pill = e.target.closest(".cc-pill");
    if (!pill) return;
    _faseInicial = pill.dataset.value;
    _el("fase-inicial-pills").querySelectorAll(".cc-pill").forEach(p => p.classList.remove("selected"));
    pill.classList.add("selected");
  });

  // Pills de categoria (incluindo Sub customizável)
  _el("categoria-pills")?.addEventListener("click", e => {
    const pill = e.target.closest(".cc-pill");
    if (!pill) return;
    _el("categoria-pills").querySelectorAll(".cc-pill").forEach(p => p.classList.remove("selected"));
    pill.classList.add("selected");
    if (pill.id === "pill-sub-custom") {
      _el("cc-sub-wrap")?.classList.add("visible");
      _el("subIdade")?.focus();
      const val = _el("subIdade")?.value;
      _categoria = val ? `Sub-${val}` : "";
      _subCustom = _categoria;
    } else {
      _el("cc-sub-wrap")?.classList.remove("visible");
      _categoria = pill.dataset.value;
      _subCustom = "";
    }
  });

  // Input da faixa etária Sub
  _el("subIdade")?.addEventListener("input", () => {
    const val = _el("subIdade").value;
    _subCustom = val ? `Sub-${val}` : "";
    _categoria = _subCustom;
    const pill = _el("pill-sub-custom");
    if (pill) pill.innerHTML = val
      ? `<i class="bi bi-person-badge"></i>&nbsp;Sub-${val}`
      : `<i class="bi bi-person-badge"></i>&nbsp;Sub…`;
  });

  // Modal de pagamento
  _el("btn-fechar-pagamento")?.addEventListener("click", _fecharPagamento);
  _el("modal-pagamento")?.addEventListener("click", e => {
    if (e.target === _el("modal-pagamento")) _fecharPagamento();
  });
  _el("btn-confirmar-pagamento")?.addEventListener("click", _executarCriacao);

  // Toggle ida e volta
  _el("toggle-ida-volta-wrap")?.addEventListener("click", () => {
    _idaVolta = !_idaVolta;
    _el("toggle-ida-volta-wrap").classList.toggle("ativo", _idaVolta);
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

function _abrirPainel() {
  const panel = _el("camp-create-panel");
  const fab   = _el("btn-novo-campeonato");
  panel?.classList.add("visible");
  panel?.removeAttribute("aria-hidden");
  fab?.classList.add("hidden");
  _el("nomeCampeonato")?.focus();
}

function _fecharPainel() {
  const panel = _el("camp-create-panel");
  const fab   = _el("btn-novo-campeonato");
  panel?.classList.remove("visible");
  panel?.setAttribute("aria-hidden", "true");
  fab?.classList.remove("hidden");
}

export async function load() {
  await _renderLista();
}

// ── Internos ──────────────────────────────────────────────────────────────────

async function _handleCriar() {
  const nome = _el("nomeCampeonato").value.trim();
  if (!nome) {
    notificar("Informe o nome do campeonato", "info");
    _el("nomeCampeonato")?.focus();
    return;
  }
  if (!_modalidade) {
    notificar("Selecione a modalidade", "info");
    return;
  }
  if (!getUsuario()) return;
  _abrirPagamento();
}

function _abrirPagamento() {
  const modal = _el("modal-pagamento");
  if (modal) modal.classList.add("open");
}

function _fecharPagamento() {
  const modal = _el("modal-pagamento");
  if (modal) modal.classList.remove("open");
}

async function _executarCriacao() {
  const nome           = _el("nomeCampeonato").value.trim();
  const duracao_padrao = parseInt(_el("duracaoPadrao")?.value) || 45;
  const pontos_vitoria = parseInt(_el("pontosVitoria")?.value) || 3;
  const descricao      = _el("descricaoCampeonato")?.value.trim() || null;
  const usuario        = getUsuario();
  if (!nome || !usuario) return;

  const tipoPag = document.querySelector('input[name="pag-tipo"]:checked')?.value || "basico";
  const preco   = tipoPag === "pro" ? "R 10 · Pro" : "R 5 · Básico";
  _fecharPagamento();

  const btn = _el("btn-criar-campeonato");
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="ui-spinner"></span> Criando...`; }

  try {
    await createCampeonato({
      nome, modalidade: _modalidade,
      duracao_padrao, pontos_vitoria,
      ida_volta: _idaVolta, descricao,
      formato:      _formato      || null,
      fase_inicial: _faseInicial  || null,
      categoria:    _categoria    || null,
      user_id:      usuario.id,
    });
    _el("nomeCampeonato").value = "";
    if (_el("duracaoPadrao"))       _el("duracaoPadrao").value       = "45";
    if (_el("pontosVitoria"))       _el("pontosVitoria").value       = "3";
    if (_el("descricaoCampeonato")) _el("descricaoCampeonato").value = "";
    if (_el("subIdade"))            _el("subIdade").value            = "";
    _modalidade = ""; _idaVolta = false; _formato = ""; _faseInicial = ""; _categoria = ""; _subCustom = "";
    _el("modalidade-pills")?.querySelectorAll(".cc-pill").forEach(p => p.classList.remove("selected"));
    _el("formato-pills")?.querySelectorAll(".cc-pill").forEach(p => p.classList.remove("selected"));
    _el("fase-inicial-pills")?.querySelectorAll(".cc-pill").forEach(p => p.classList.remove("selected"));
    _el("categoria-pills")?.querySelectorAll(".cc-pill").forEach(p => p.classList.remove("selected"));
    const hint = _el("formato-hint"); if (hint) hint.textContent = "";
    _el("toggle-ida-volta-wrap")?.classList.remove("ativo");
    _el("cc-sub-wrap")?.classList.remove("visible");
    _el("copa-fase-inicial-section")?.classList.add("hidden");
    const subPill = _el("pill-sub-custom");
    if (subPill) subPill.innerHTML = `<i class="bi bi-person-badge"></i>&nbsp;Sub...`;
    _fecharPainel();
    await _renderLista();
    document.dispatchEvent(new CustomEvent("disputaapp:campeonatos-updated"));
    notificar("Campeonato criado! (" + preco + ")", "sucesso");
  } catch (err) {
    console.error("Erro ao criar campeonato", err);
    notificar(err.erro || "Erro ao criar campeonato");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Criar campeonato"; }
  }
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

