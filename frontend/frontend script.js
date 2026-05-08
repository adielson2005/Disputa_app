const API = "http://localhost:5000";

async function criarTime() {
  const nome = document.getElementById("nome").value;
  const campeonato_id = document.getElementById("campeonato").value;

  await fetch(`${API}/times`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      nome,
      campeonato_id
    })
  });

  listarTimes();
}

async function listarTimes() {
  const campeonato_id = document.getElementById("campeonato").value;

  const res = await fetch(`${API}/times/${campeonato_id}`);
  const data = await res.json();

  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  data.forEach(t => {
    const li = document.createElement("li");
    li.innerText = t.nome;
    lista.appendChild(li);
  });
}

// 🔥 atualização automática
setInterval(() => {
  listarTimes();
}, 2000);