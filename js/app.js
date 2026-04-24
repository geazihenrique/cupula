import { DEFAULT_STATE, getDefaultState } from "./state.js";
import { mm, downloadTextFile } from "./utils.js";
import { calcularCupula } from "./calcularCupula.js";
import { bindInputs, applyStateToForm, readFormState } from "./input.js";
import { renderizarTabela } from "./gerarTabela.js";
import { renderizarPreview2D } from "./gerarPreview2D.js";
import { GeradorModelo3D } from "./gerarModelo3D.js";
import { gerarDXF, getDXFFileName } from "./gerarDXF.js";

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

let viewMode = DEFAULT_STATE.viewMode;
let calculoAtual = null;
let preview3D = null;

function setBanner(element, message) {
  element.textContent = message || "";
  element.classList.toggle("hidden", !message);
}

function setDownloadState(enabled) {
  elements.downloadDXF.disabled = !enabled;
}

function updateViewButtons() {
  elements.modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.viewMode === viewMode);
  });
}

function renderSummary(calculo) {
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
  calculoAtual = calcularCupula(readFormState(elements));
  renderSummary(calculoAtual);
  renderizarTabela(calculoAtual.pecas, elements.tableBody);
  setBanner(elements.validationMessage, calculoAtual.isValido ? "" : calculoAtual.erros[0]);
  setBanner(elements.recommendationMessage, calculoAtual.recomendacao ? calculoAtual.recomendacao.mensagem : "");
  setDownloadState(calculoAtual.isValido);

  if (calculoAtual.isValido) {
    renderizarPreview2D(calculoAtual.pecas, elements.preview2D);
    preview3D.update(calculoAtual, viewMode);
  } else {
    elements.preview2D.innerHTML = '<div class="preview-empty">Preview indisponível até que as dimensões fiquem válidas.</div>';
    preview3D.clear();
  }
}

function resetForm() {
  applyStateToForm(elements, getDefaultState());
  viewMode = DEFAULT_STATE.viewMode;
  updateViewButtons();
  renderApp();
}

function initialize3D() {
  preview3D = new GeradorModelo3D(elements.threeContainer);
}

function bindViewModeButtons() {
  elements.modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      viewMode = button.dataset.viewMode;
      updateViewButtons();
      if (calculoAtual) {
        preview3D.applyViewMode(viewMode);
      }
    });
  });
}

function bindDownloads() {
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
  initialize3D();
  applyStateToForm(elements, getDefaultState());
  updateViewButtons();
  bindInputs(elements, renderApp, resetForm);
  bindViewModeButtons();
  bindDownloads();
  renderApp();
}

bootstrap();