(function () {
  const { mm } = window.CupulaUtils;

  function gerarTabela(parts, tableBody) {
    tableBody.innerHTML = "";

    parts.forEach((piece) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${piece.nome}</td>
        <td>${piece.quantidade}</td>
        <td>${mm(piece.largura)}</td>
        <td>${mm(piece.alturaProfundidade)}</td>
        <td>${mm(piece.espessura)}</td>
        <td>${piece.observacao}</td>
      `;
      tableBody.appendChild(row);
    });
  }

  function gerarCSV(parts) {
    const header = ["Peça", "Quantidade", "Largura (mm)", "Altura/Profundidade (mm)", "Espessura (mm)", "Observação"];
    const rows = parts.map((piece) => [
      piece.nome,
      piece.quantidade,
      piece.largura,
      piece.alturaProfundidade,
      piece.espessura,
      `"${piece.observacao.replace(/"/g, '""')}"`,
    ]);

    return [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
  }

  window.CupulaTable = {
    gerarTabela,
    gerarCSV,
  };
})();