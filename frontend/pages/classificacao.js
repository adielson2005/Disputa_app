// ── Página: Classificação ─────────────────────────────────────────────────────
import { getClassificacao } from "../services/api.js";
import { getCampeonatoId } from "../store.js";

export async function load()    { await refresh(); }
export async function refresh() {
  const id = getCampeonatoId();
  if (!id) return;
  try {
    const data   = await getClassificacao(id);
    const tabela = _el("tabela");
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
          </tr>`).join("")}
      </tbody>`;
    if (!data.length) {
      tabela.innerHTML += `
        <caption style="caption-side:bottom;color:var(--faint);font-size:12px;padding:12px">
          Nenhum jogo encerrado ainda.
        </caption>`;
    }
  } catch (e) { console.error("Erro ao carregar classificação", e); }
}

function _el(id) { return document.getElementById(id); }
