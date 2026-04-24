import { createSvgNode, mm } from "./utils.js";

export function renderizarPreview2D(pecas, container) {
  container.innerHTML = "";

  if (!pecas.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "preview-empty";
    emptyState.textContent = "Nenhuma peça disponível para exibir.";
    container.appendChild(emptyState);
    return;
  }

  const spacing = 28;
  const padding = 24;
  const maxWidth = Math.max(...pecas.map((peca) => peca.largura));
  const maxHeight = Math.max(...pecas.map((peca) => peca.alturaProfundidade));
  const scale = Math.min(1.15, 900 / Math.max(maxWidth * pecas.length, maxHeight));
  const svgWidth = pecas.reduce((acc, peca) => acc + (peca.largura * scale) + spacing, (padding * 2) - spacing);
  const svgHeight = (maxHeight * scale) + 110;

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
    rx: 24,
    fill: "#fbfbfe",
  }));

  let currentX = padding;

  pecas.forEach((peca, index) => {
    const width = peca.largura * scale;
    const height = peca.alturaProfundidade * scale;
    const posY = 36 + ((maxHeight * scale) - height) / 2;

    svg.appendChild(createSvgNode("rect", {
      x: currentX,
      y: posY,
      width,
      height,
      rx: 12,
      fill: index % 2 === 0 ? "rgba(111, 87, 217, 0.10)" : "rgba(111, 87, 217, 0.06)",
      stroke: "#6f57d9",
      "stroke-width": 2,
    }));

    const title = createSvgNode("text", {
      x: currentX + (width / 2),
      y: posY - 12,
      "text-anchor": "middle",
      "font-size": 13,
      "font-family": "Segoe UI, sans-serif",
      fill: "#17171b",
    });
    title.textContent = peca.quantidade > 1 ? `${peca.nome} (${peca.quantidade}x)` : peca.nome;
    svg.appendChild(title);

    const subtitle = createSvgNode("text", {
      x: currentX + (width / 2),
      y: posY + height + 18,
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