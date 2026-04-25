function mm(valor) {
  return `${Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} mm`;
}

function createSvgNode(tag, attributes = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return node;
}

function expandirPecas(pecas) {
  return pecas.flatMap((peca) => Array.from({ length: peca.quantidade }, (_, index) => ({
    ...peca,
    titulo: peca.quantidade > 1 ? `${peca.nome} ${index + 1}` : peca.nome,
  })));
}

export function renderizarPreview2D(pecas, container) {
  if (!container) {
    return;
  }

  container.innerHTML = "";

  const pecasExpandida = expandirPecas(pecas);
  if (!pecasExpandida.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "preview-empty";
    emptyState.textContent = "Nenhuma peça disponível para exibir.";
    container.appendChild(emptyState);
    return;
  }

  const padding = 28;
  const spacing = 26;
  const maxHeight = Math.max(...pecasExpandida.map((peca) => peca.alturaProfundidade));
  const totalWidth = pecasExpandida.reduce((acc, peca) => acc + peca.largura, 0);
  const scale = Math.max(0.28, Math.min(1, 1020 / (totalWidth + (spacing * pecasExpandida.length))));
  const svgWidth = (padding * 2) + (totalWidth * scale) + (spacing * (pecasExpandida.length - 1));
  const svgHeight = (padding * 2) + (maxHeight * scale) + 100;

  const svg = createSvgNode("svg", {
    viewBox: `0 0 ${svgWidth} ${svgHeight}`,
    role: "img",
    "aria-label": "Preview 2D das peças para corte",
  });

  svg.appendChild(createSvgNode("rect", {
    x: 0,
    y: 0,
    width: svgWidth,
    height: svgHeight,
    rx: 28,
    fill: "#fbfbfe",
  }));

  let currentX = padding;
  pecasExpandida.forEach((peca, index) => {
    const width = peca.largura * scale;
    const height = peca.alturaProfundidade * scale;
    const posY = padding + ((maxHeight * scale) - height) / 2 + 24;

    svg.appendChild(createSvgNode("rect", {
      x: currentX,
      y: posY,
      width,
      height,
      rx: 12,
      fill: index % 2 === 0 ? "rgba(111, 87, 217, 0.12)" : "rgba(111, 87, 217, 0.07)",
      stroke: "#4c1d95",
      "stroke-width": 2,
    }));

    const title = createSvgNode("text", {
      x: currentX + (width / 2),
      y: posY - 12,
      "text-anchor": "middle",
      "font-size": 13,
      "font-family": "Segoe UI, sans-serif",
      "font-weight": 600,
      fill: "#17171b",
    });
    title.textContent = peca.titulo;
    svg.appendChild(title);

    const subtitle = createSvgNode("text", {
      x: currentX + (width / 2),
      y: posY + height + 20,
      "text-anchor": "middle",
      "font-size": 12,
      "font-family": "Segoe UI, sans-serif",
      fill: "#66697a",
    });
    subtitle.textContent = `${mm(peca.largura)} × ${mm(peca.alturaProfundidade)}`;
    svg.appendChild(subtitle);

    currentX += width + spacing;
  });

  container.appendChild(svg);
}
