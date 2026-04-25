function mm(valor) {
  return `${Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} mm`;
}

export function renderizarTabela(pecas, tableBody) {
  if (!tableBody) {
    return;
  }

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
