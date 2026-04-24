(function () {
  const { createSvgNode, mm } = window.CupulaUtils;

  function gerarPreview2D(parts, container) {
    container.innerHTML = "";

    if (!parts.length) {
      const empty = document.createElement("div");
      empty.className = "preview-empty";
      empty.textContent = "Nenhuma peça disponível para exibir.";
      container.appendChild(empty);
      return;
    }

    const spacing = 28;
    const padding = 24;
    const maxWidth = Math.max(...parts.map((piece) => piece.largura));
    const maxHeight = Math.max(...parts.map((piece) => piece.alturaProfundidade));
    const scale = Math.min(1.4, 720 / Math.max(maxWidth * parts.length, maxHeight));
    const svgWidth = parts.reduce((acc, piece) => acc + (piece.largura * scale) + spacing, padding * 2) + 80;
    const svgHeight = maxHeight * scale + 120;
    const svg = createSvgNode("svg", {
      viewBox: `0 0 ${svgWidth} ${svgHeight}`,
      role: "img",
      "aria-label": "Preview 2D das peças para corte",
    });

    const bg = createSvgNode("rect", {
      x: 0,
      y: 0,
      width: svgWidth,
      height: svgHeight,
      rx: 22,
      fill: "#fbfbfe",
    });
    svg.appendChild(bg);

    let currentX = padding;

    parts.forEach((piece, index) => {
      const width = piece.largura * scale;
      const height = piece.alturaProfundidade * scale;
      const y = 48 + ((maxHeight * scale) - height) / 2;

      const rect = createSvgNode("rect", {
        x: currentX,
        y,
        width,
        height,
        rx: 12,
        fill: index % 2 === 0 ? "rgba(111, 87, 217, 0.10)" : "rgba(111, 87, 217, 0.06)",
        stroke: "#6f57d9",
        "stroke-width": "2",
        "stroke-dasharray": "0",
      });

      const title = createSvgNode("text", {
        x: currentX + (width / 2),
        y: y - 14,
        "text-anchor": "middle",
        "font-size": "13",
        "font-family": "Segoe UI, sans-serif",
        fill: "#17171b",
      });
      title.textContent = piece.quantidade > 1 ? `${piece.nome} (${piece.quantidade}x)` : piece.nome;

      const label = createSvgNode("text", {
        x: currentX + (width / 2),
        y: y + height + 20,
        "text-anchor": "middle",
        "font-size": "12",
        "font-family": "Segoe UI, sans-serif",
        fill: "#66697a",
      });
      label.textContent = `${mm(piece.largura)} × ${mm(piece.alturaProfundidade)}`;

      svg.appendChild(rect);
      svg.appendChild(title);
      svg.appendChild(label);
      currentX += width + spacing;
    });

    container.appendChild(svg);
  }

  window.CupulaPreview2D = { gerarPreview2D };
})();