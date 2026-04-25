import { calcularCupula } from "./calcularCupula.js";
import { renderizarTabela } from "./gerarTabela.js";
import { renderizarPreview2D } from "./gerarPreview2D.js";
import { gerarDXF, getDXFFileName } from "./gerarDXF.js";

const DEFAULT_STATE = {
  largura: 300,
  profundidade: 200,
  altura: 150,
  espessura: 3,
  tipoMedida: "externa",
  tipoCupula: "aberta",
  tipoMontagem: "dentro",
  viewMode: "montada",
};

const elements = {
  largura: document.getElementById("largura"),
  profundidade: document.getElementById("profundidade"),
  altura: document.getElementById("altura"),
  espessura: document.getElementById("espessura"),
  tipoMontagem: document.getElementById("tipoMontagem"),
  tipoMedida: document.querySelector('[data-segmented="tipoMedida"]'),
  tipoCupula: document.querySelector('[data-segmented="tipoCupula"]'),
  validationMessage: document.getElementById("validation-message"),
  recommendationMessage: document.getElementById("recommendation-message"),
  summaryGrid: document.getElementById("summary-grid"),
  tableBody: document.getElementById("parts-table-body"),
  preview2D: document.getElementById("preview-2d"),
  threeContainer: document.getElementById("three-container"),
  downloadDXF: document.getElementById("download-dxf"),
  resetButton: document.getElementById("reset-form"),
  modeButtons: document.querySelectorAll("[data-view-mode]"),
};

const currentState = { ...DEFAULT_STATE };
let viewMode = DEFAULT_STATE.viewMode;
let calculoAtual = null;
let preview3D = null;
let preview3DLoading = false;
let preview3DUnavailable = false;

function mm(valor) {
  return `${Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} mm`;
}

function downloadTextFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function setBanner(element, message) {
  if (!element) {
    return;
  }
  element.textContent = message || "";
  element.classList.toggle("hidden", !message);
}

function setThreeFallback(message) {
  if (!elements.threeContainer) {
    return;
  }

  elements.threeContainer.innerHTML = `<div class="preview-empty">${message}</div>`;
}

function setDownloadState(enabled) {
  if (elements.downloadDXF) {
    elements.downloadDXF.disabled = !enabled;
  }
}

function updateViewButtons() {
  elements.modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.viewMode === viewMode);
  });
}

function syncFormFromState() {
  if (elements.largura) {
    elements.largura.value = String(currentState.largura);
  }
  if (elements.profundidade) {
    elements.profundidade.value = String(currentState.profundidade);
  }
  if (elements.altura) {
    elements.altura.value = String(currentState.altura);
  }
  if (elements.espessura) {
    elements.espessura.value = String(currentState.espessura);
  }
  if (elements.tipoMontagem) {
    elements.tipoMontagem.value = currentState.tipoMontagem;
  }

  [elements.tipoMedida, elements.tipoCupula].forEach((group) => {
    if (!group) {
      return;
    }
    const key = group.dataset.segmented;
    const activeValue = currentState[key];
    group.querySelectorAll(".segment").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.value === activeValue);
    });
  });
}

function readNumberInput(element, fallback) {
  const value = Number(element?.value);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function syncStateFromForm() {
  currentState.largura = readNumberInput(elements.largura, DEFAULT_STATE.largura);
  currentState.profundidade = readNumberInput(elements.profundidade, DEFAULT_STATE.profundidade);
  currentState.altura = readNumberInput(elements.altura, DEFAULT_STATE.altura);
  currentState.espessura = readNumberInput(elements.espessura, DEFAULT_STATE.espessura);
  currentState.tipoMontagem = elements.tipoMontagem?.value === "fora" ? "fora" : "dentro";
}

function renderSummary(calculo) {
  if (!elements.summaryGrid) {
    return;
  }

  const items = [
    ["Medidas informadas", `${mm(calculo.configuracao.largura)} × ${mm(calculo.configuracao.profundidade)} × ${mm(calculo.configuracao.altura)}`],
    ["Medidas externas finais", `${mm(calculo.medidasExternas.largura)} × ${mm(calculo.medidasExternas.profundidade)} × ${mm(calculo.medidasExternas.altura)}`],
    ["Medidas internas úteis", `${mm(calculo.medidasInternas.largura)} × ${mm(calculo.medidasInternas.profundidade)} × ${mm(calculo.medidasInternas.altura)}`],
    ["Espessura", mm(calculo.configuracao.espessura)],
    ["Tipo de medida", calculo.configuracao.tipoMedida === "externa" ? "Externa" : "Interna"],
    ["Tipo da cúpula", calculo.configuracao.tipoCupula === "aberta" ? "Aberta" : "Fechada"],
    ["Montagem", calculo.configuracao.tipoMontagem === "dentro" ? "Laterais por dentro" : "Laterais por fora"],
    ["Total de peças", `${calculo.totalPecas} unidade(s)`],
  ];

  elements.summaryGrid.innerHTML = items.map(([label, value]) => `
    <div class="summary-item">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `).join("");
}

function renderApp() {
  try {
    calculoAtual = calcularCupula(currentState);
    renderSummary(calculoAtual);
    renderizarTabela(calculoAtual.pecas, elements.tableBody);
    setBanner(elements.validationMessage, calculoAtual.isValido ? "" : calculoAtual.erros[0]);
    setBanner(elements.recommendationMessage, calculoAtual.recomendacao ? calculoAtual.recomendacao.mensagem : "");
    setDownloadState(calculoAtual.isValido);

    if (calculoAtual.isValido) {
      renderizarPreview2D(calculoAtual.pecas, elements.preview2D);
      if (preview3D) {
        preview3D.update(calculoAtual, viewMode);
      } else if (preview3DUnavailable) {
        setThreeFallback("Visualização 3D indisponível neste navegador. Os demais recursos continuam funcionando.");
      } else if (preview3DLoading) {
        setThreeFallback("Carregando visualização 3D...");
      }
    } else {
      if (elements.preview2D) {
        elements.preview2D.innerHTML = '<div class="preview-empty">Preview indisponível até que as dimensões fiquem válidas.</div>';
      }
      if (preview3D) {
        preview3D.clear();
      } else if (preview3DUnavailable) {
        setThreeFallback("Visualização 3D indisponível neste navegador.");
      } else if (preview3DLoading) {
        setThreeFallback("Carregando visualização 3D...");
      }
    }
  } catch (error) {
    console.error("Falha ao atualizar a aplicação:", error);
    setBanner(elements.validationMessage, "Ocorreu um erro ao atualizar a cúpula. Revise os dados informados.");
    setDownloadState(false);
  }
}

function resetForm() {
  Object.assign(currentState, DEFAULT_STATE);
  viewMode = DEFAULT_STATE.viewMode;
  syncFormFromState();
  updateViewButtons();
  renderApp();
}

async function initialize3D() {
  if (!elements.threeContainer || preview3D || preview3DLoading) {
    return;
  }

  preview3DLoading = true;
  setThreeFallback("Carregando visualização 3D...");

  try {
    const module = await import("./gerarModelo3D.js");
    preview3D = new module.GeradorModelo3D(elements.threeContainer);
    preview3DUnavailable = false;
    if (calculoAtual && calculoAtual.isValido) {
      preview3D.update(calculoAtual, viewMode);
    }
  } catch (error) {
    preview3DUnavailable = true;
    console.error("Falha ao inicializar a visualização 3D:", error);
    setThreeFallback("Visualização 3D indisponível neste navegador. Os demais recursos continuam funcionando.");
  } finally {
    preview3DLoading = false;
  }
}

function bindViewModeButtons() {
  elements.modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      viewMode = button.dataset.viewMode;
      updateViewButtons();
      if (calculoAtual && preview3D) {
        preview3D.applyViewMode(viewMode);
      }
    });
  });
}

function bindFormEvents() {
  [elements.largura, elements.profundidade, elements.altura, elements.espessura, elements.tipoMontagem].forEach((field) => {
    if (!field) {
      return;
    }

    field.addEventListener("input", () => {
      syncStateFromForm();
      renderApp();
    });

    field.addEventListener("change", () => {
      syncStateFromForm();
      renderApp();
    });
  });

  [elements.tipoMedida, elements.tipoCupula].forEach((group) => {
    if (!group) {
      return;
    }

    const key = group.dataset.segmented;
    group.querySelectorAll(".segment").forEach((button) => {
      button.addEventListener("click", () => {
        currentState[key] = button.dataset.value;
        syncFormFromState();
        renderApp();
      });
    });
  });

  if (elements.resetButton) {
    elements.resetButton.addEventListener("click", resetForm);
  }
}

function bindDownloads() {
  if (!elements.downloadDXF) {
    return;
  }

  elements.downloadDXF.addEventListener("click", () => {
    if (!calculoAtual || !calculoAtual.isValido) {
      return;
    }

    downloadTextFile(
      gerarDXF(calculoAtual.pecas),
      getDXFFileName(calculoAtual),
      "application/dxf;charset=utf-8"
    );
  });
}

function bootstrap() {
  syncFormFromState();
  updateViewButtons();
  bindFormEvents();
  bindViewModeButtons();
  bindDownloads();
  renderApp();
  initialize3D();
}

bootstrap();
