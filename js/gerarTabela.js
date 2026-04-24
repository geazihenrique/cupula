import { mm } from "./utils.js";

export function renderizarTabela(pecas, tableBody) {
  tableBody.innerHTML = "";

  pecas.forEach((peca) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${peca.nome}</td>
      <td>${peca.quantidade}</td>
      <td>${mm(peca.largura)}</td>
      <td>${mm(peca.alturaProfundidade)}</td>
      <td>${mm(peca.espessura)}</td>
      <td>${peca.observacao}</td>
    `;
    tableBody.appendChild(row);
  });
}

export function gerarCSV(pecas) {
  const linhas = [
    ["Peça", "Quantidade", "Largura (mm)", "Altura/Profundidade (mm)", "Espessura (mm)", "Observação"],
  ];

  pecas.forEach((peca) => {
    linhas.push([
      peca.nome,
      String(peca.quantidade),
      String(peca.largura),
      String(peca.alturaProfundidade),
      String(peca.espessura),
      `"${peca.observacao.replace(/"/g, '""')}"`,
    ]);
  });

  return linhas.map((linha) => linha.join(",")).join("\n");
}