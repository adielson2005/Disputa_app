// ── Página: Estatísticas do Campeonato ───────────────────────────────────────
import { getJogos, getClassificacao } from "../services/api.js";
import { getCampeonatoId } from "../store.js";

export async function load()    { await refresh(); }
export async function refresh() {
  const id = getCampeonatoId();
  if (!id) return;
  try {
    const [jogos, classif] = await Promise.all([getJogos(id), getClassificacao(id)]);
    const encerrados = jogos.filter(j => j.status === "encerrado");

    if (!encerrados.length) { _renderVazio(); return; }

    // ── Computa stats por time ──────────────────────────────────────────────
    const stats = {};
    for (const j of encerrados) {
      _addStat(stats, j.time_a, j.placar_a, j.placar_b,
               j.amarelos_a ?? 0, j.vermelhos_a ?? 0);
      _addStat(stats, j.time_b, j.placar_b, j.placar_a,
               j.amarelos_b ?? 0, j.vermelhos_b ?? 0);
    }
    const times = Object.values(stats);

    // Clean sheets
    for (const j of encerrados) {
      if (j.placar_b === 0) stats[j.time_a].cleanSheets++;
      if (j.placar_a === 0) stats[j.time_b].cleanSheets++;
    }

    // ── Métricas globais ────────────────────────────────────────────────────
    const totalGols      = encerrados.reduce((s, j) => s + j.placar_a + j.placar_b, 0);
    const mediaPorJogo   = (totalGols / encerrados.length).toFixed(1);
    const totalAmarelos  = encerrados.reduce((s, j) => s + (j.amarelos_a ?? 0) + (j.amarelos_b ?? 0), 0);
    const totalVermelhos = encerrados.reduce((s, j) => s + (j.vermelhos_a ?? 0) + (j.vermelhos_b ?? 0), 0);

    // Maior goleada
    const maiorGoleada = encerrados.reduce((m, j) =>
      Math.abs(j.placar_a - j.placar_b) > Math.abs(m.placar_a - m.placar_b) ? j : m);
    const golV    = Math.max(maiorGoleada.placar_a, maiorGoleada.placar_b);
    const golP    = Math.min(maiorGoleada.placar_a, maiorGoleada.placar_b);
    const vencMG  = maiorGoleada.placar_a > maiorGoleada.placar_b
                    ? maiorGoleada.time_a : maiorGoleada.time_b;

    // Jogo com mais gols
    const jogoMaisGols = encerrados.reduce((m, j) =>
      (j.placar_a + j.placar_b) > (m.placar_a + m.placar_b) ? j : m);

    const lider = classif[0];

    // ── Renderiza ──────────────────────────────────────────────────────────
    _renderCards(totalGols, mediaPorJogo, totalAmarelos, totalVermelhos);
    _renderDestaques(times, lider);
    _renderArtilharia(times);
    _renderDisciplina(times);
    _renderRecordes(vencMG, golV, golP, maiorGoleada, jogoMaisGols, encerrados);
  } catch (e) { console.error("Estatísticas error", e); }
}

// ── Renders ───────────────────────────────────────────────────────────────────

function _renderCards(totalGols, media, amarelos, vermelhos) {
  const el = document.getElementById("estat-cards");
  if (!el) return;
  el.innerHTML = [
    _miniCard("bi-dribbble",                "Total de Gols",  totalGols,  "rgba(16,185,129,.15)", "var(--accent)"),
    _miniCard("bi-graph-up",                "Média / Jogo",   media,      "rgba(99,102,241,.13)",  "#6366f1"),
    _miniCard("bi-square-fill estat-amarelo","Amarelos",      amarelos,   "rgba(245,158,11,.13)",  "#d97706"),
    _miniCard("bi-square-fill estat-vermelho","Vermelhos",    vermelhos,  "rgba(239,68,68,.12)",   "#ef4444"),
  ].join("");
}

function _renderDestaques(times, lider) {
  const el = document.getElementById("estat-destaques");
  if (!el) return;
  const melhorAtaque = times.reduce((m, t) => t.gols_pro    > m.gols_pro    ? t : m, times[0]);
  const melhorDefesa = times.reduce((m, t) => t.gols_contra < m.gols_contra ? t : m, times[0]);
  const maisClean    = times.reduce((m, t) => t.cleanSheets > m.cleanSheets ? t : m, times[0]);
  el.innerHTML = [
    _destCard("bi-lightning-charge-fill", "#f59e0b", "rgba(245,158,11,.13)",
              "Melhor Ataque", melhorAtaque.nome, `${melhorAtaque.gols_pro} gols marcados`),
    _destCard("bi-shield-fill-check",    "#3b82f6", "rgba(59,130,246,.13)",
              "Melhor Defesa", melhorDefesa.nome, `${melhorDefesa.gols_contra} gols sofridos`),
    lider
      ? _destCard("bi-trophy-fill", "#d97706", "rgba(245,158,11,.13)",
                  "Líder Atual", lider.nome,
                  `${lider.pontos} pts · ${lider.vitorias}V ${lider.empates}E ${lider.derrotas}D`)
      : "",
    maisClean.cleanSheets > 0
      ? _destCard("bi-ban", "var(--accent)", "rgba(16,185,129,.15)",
                  "Mais Clean Sheets", maisClean.nome,
                  `${maisClean.cleanSheets} jogo(s) sem sofrer gol`)
      : "",
  ].join("");
}

function _renderArtilharia(times) {
  const el = document.getElementById("estat-artilharia");
  if (!el) return;
  const sorted = [...times].sort((a, b) => b.gols_pro - a.gols_pro);
  const medals = ["🥇", "🥈", "🥉"];
  el.innerHTML = sorted.map((t, i) => `
    <div class="estat-row">
      <div class="estat-rank">${medals[i] ?? `<span class="estat-num">${i+1}</span>`}</div>
      <div class="estat-nome">${t.nome}</div>
      <div class="estat-badges">
        <span class="estat-badge gols-pro-badge">${t.gols_pro} GP</span>
        <span class="estat-badge gols-contra-badge">${t.gols_contra} GC</span>
        <span class="estat-badge saldo-badge ${t.gols_pro - t.gols_contra >= 0 ? 'saldo-pos' : 'saldo-neg'}">
          ${t.gols_pro - t.gols_contra > 0 ? "+" : ""}${t.gols_pro - t.gols_contra}
        </span>
      </div>
    </div>`).join("");
}

function _renderDisciplina(times) {
  const el = document.getElementById("estat-disciplina");
  if (!el) return;
  const sorted = [...times].sort((a, b) => (b.amarelos + b.vermelhos*2) - (a.amarelos + a.vermelhos*2));
  const temDados = sorted.some(t => t.amarelos > 0 || t.vermelhos > 0);
  if (!temDados) {
    el.innerHTML = '<p class="estat-empty">Nenhum cart\u00e3o registrado ainda.</p>';
    return;
  }
  el.innerHTML = sorted.map((t, i) => `
    <div class="estat-row">
      <div class="estat-rank"><span class="estat-num">${i+1}</span></div>
      <div class="estat-nome">${t.nome}</div>
      <div class="estat-badges">
        <span class="estat-badge amarelo-badge">&#9646; ${t.amarelos}</span>
        <span class="estat-badge vermelho-badge">&#9646; ${t.vermelhos}</span>
      </div>
    </div>`).join("");
}

function _renderRecordes(vencMG, golV, golP, goleada, jogoMaisGols, encerrados) {
  const el = document.getElementById("estat-recordes");
  if (!el) return;
  const draws = encerrados.filter(j => j.placar_a === j.placar_b).length;
  const items = [
    { icon: "bi-trophy",      label: "Maior Goleada",
      valor: `${vencMG} (${golV}–${golP})`,
      sub:   `${goleada.time_a} ${goleada.placar_a}–${goleada.placar_b} ${goleada.time_b}` },
    { icon: "bi-fire",        label: "Jogo Mais Goleado",
      valor: `${jogoMaisGols.placar_a + jogoMaisGols.placar_b} gols`,
      sub:   `${jogoMaisGols.time_a} ${jogoMaisGols.placar_a}–${jogoMaisGols.placar_b} ${jogoMaisGols.time_b}` },
    { icon: "bi-dash-circle", label: "Empates",
      valor: `${draws}`,
      sub:   `de ${encerrados.length} jogo(s) encerrado(s)` },
  ];
  el.innerHTML = items.map(it => `
    <div class="recorde-row">
      <div class="recorde-icon"><i class="bi ${it.icon}"></i></div>
      <div class="recorde-body">
        <div class="recorde-label">${it.label}</div>
        <div class="recorde-valor">${it.valor}</div>
        <div class="recorde-sub">${it.sub}</div>
      </div>
    </div>`).join("");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _addStat(stats, nome, pro, contra, amarelos, vermelhos) {
  if (!stats[nome])
    stats[nome] = { nome, gols_pro:0, gols_contra:0, amarelos:0, vermelhos:0, cleanSheets:0 };
  stats[nome].gols_pro    += pro;
  stats[nome].gols_contra += contra;
  stats[nome].amarelos    += amarelos;
  stats[nome].vermelhos   += vermelhos;
}

function _miniCard(icon, label, valor, bg, color) {
  return `
    <div class="stat-card">
      <div class="stat-card-icon" style="background:${bg};color:${color}">
        <i class="bi ${icon}"></i>
      </div>
      <div class="stat-card-body">
        <div class="stat-label">${label}</div>
        <div class="stat-value">${valor}</div>
      </div>
    </div>`;
}

function _destCard(icon, color, bg, label, nome, sub) {
  return `
    <div class="dest-card">
      <div class="dest-card-icon" style="background:${bg};color:${color}">
        <i class="bi ${icon}"></i>
      </div>
      <div class="dest-card-body">
        <div class="dest-label">${label}</div>
        <div class="dest-nome">${nome}</div>
        <div class="dest-sub">${sub}</div>
      </div>
    </div>`;
}

function _renderVazio() {
  ["estat-cards","estat-destaques","estat-artilharia","estat-disciplina","estat-recordes"]
    .forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = id === "estat-cards" ? "" :
        '<p class="estat-empty">Nenhum jogo encerrado ainda para gerar estat\u00edsticas.</p>';
    });
}
