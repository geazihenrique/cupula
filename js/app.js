(function () {
  const { mm, downloadTextFile } = window.CupulaUtils;
  const { calcularCupula } = window.CupulaCalculator;
  const { gerarTabela, gerarCSV } = window.CupulaTable;
  const { gerarPreview2D } = window.CupulaPreview2D;
  const { gerarDXF, getDXFFileName } = window.CupulaDXF;
  const { bindInputs, readFormState } = window.CupulaInput;
  const { GeradorModelo3D } = window.Cupula3D;
  const { defaults } = window.CupulaState;

  const elements = {
    largura: document.getElementById("largura"),
    profundidade: document.getElementById("profundidade"),
    altura: document.getElementById("altura"),
    espessura: document.getElementById("espessura"),
    tipoMontagem: document.getElementById("tipoMontagem"),
    tipoMedida: document.querySelector('[data-segmented="tipoMedida"]'),
    tipoCupula: document.querySelector('[data-segmented="tipoCupula"]'),
    segmented: document.querySelectorAll(".segmented-control"),
    validationMessage: document.getElementById("validation-message"),
    recommendationMessage: document.getElementById("recommendation-message"),
    summaryGrid: document.getElementById("summary-grid"),
    tableBody: document.getElementById("parts-table-body"),
    preview2D: document.getElementById("preview-2d"),
    downloadDXF: document.getElementById("download-dxf"),
    downloadCSV: document.getElementById("download-csv"),
    resetButton: document.getElementById("reset-form"),
    modeButtons: document.querySelectorAll("[data-view-mode]"),
    threeContainer: document.getElementById("three-container"),
  };

  let currentViewMode = defaults.viewMode;
  let calculoAtual = null;
  let preview3D = null;

  try {
    preview3D = new GeradorModelo3D(elements.threeContainer);
  } catch (error) {
    console.error("Falha ao inicializar o preview 3D:", error);
    elements.threeContainer.innerHTML = '<div class="preview-empty">Não foi possível carregar o preview 3D neste navegador.</div>';
  }

  function updateMessage(element, text) {
    element.textContent = text || "";
    element.classList.toggle("hidden", !text);
  }

  function renderSummary(calculo) {
    const items = [
      { label: "Medidas informadas", value: `${mm(calculo.input.largura)} × ${mm(calculo.input.profundidade)} × ${mm(calculo.input.altura)}` },
      { label: "Medidas externas finais", value: `${mm(calculo.external.largura)} × ${mm(calculo.external.profundidade)} × ${mm(calculo.external.altura)}` },
      { label: "Medidas internas úteis", value: `${mm(calculo.internal.largura)} × ${mm(calculo.internal.profundidade)} × ${mm(calculo.internal.altura)}` },
      { label: "Espessura", value: mm(calculo.espessura) },
      { label: "Tipo de medida", value: calculo.tipoMedida === "externa" ? "Externa" : "Interna" },
      { label: "Tipo da cúpula", value: calculo.tipoCupula === "aberta" ? "Aberta" : "Fechada" },
      { label: "Montagem", value: calculo.tipoMontagem === "dentro" ? "Laterais por dentro" : "Laterais por fora" },
      { label: "Total de peças", value: `${calculo.totalPecas} unidade(s)` },
    ];

    elements.summaryGrid.innerHTML = items
      .map(
        (item) => `
          <div class="summary-item">
            <span>${item.label}</span>
            <strong>${item.value}</strong>
          </div>
        `
      )
      .join("");
  }

  function applyDownloadsState(enabled) {
    elements.downloadDXF.disabled = !enabled;
    elements.downloadCSV.disabled = !enabled;
  }

  function updateModeButtons(activeMode) {
    elements.modeButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.viewMode === activeMode);
    });
  }

  function renderAll(options) {
    const formState = readFormState(elements);
    calculoAtual = calcularCupula(formState);

    if (options && options.resetViewMode) {
      currentViewMode = defaults.viewMode;
      updateModeButtons(currentViewMode);
    }

    renderSummary(calculoAtual);
    gerarTabela(calculoAtual.pieces, elements.tableBody);
    updateMessage(elements.validationMessage, calculoAtual.isValid ? "" : calculoAtual.errors[0]);
    updateMessage(elements.recommendationMessage, calculoAtual.recommendation ? calculoAtual.recommendation.message : "");
    applyDownloadsState(calculoAtual.isValid);

    if (calculoAtual.isValid) {
      gerarPreview2D(calculoAtual.pieces, elements.preview2D);
      if (preview3D) {
        preview3D.update(calculoAtual, currentViewMode);
      }
      return;
    }

    elements.preview2D.innerHTML = '<div class="preview-empty">Preview indisponível até que as dimensões fiquem válidas.</div>';
    if (preview3D) {
      preview3D.clear();
    }
  }

  elements.modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      currentViewMode = button.dataset.viewMode;
      updateModeButtons(currentViewMode);
      if (calculoAtual && preview3D) {
        preview3D.applyViewMode(currentViewMode);
      }
    });
  });

  elements.downloadCSV.addEventListener("click", () => {
    if (!calculoAtual || !calculoAtual.isValid) {
      return;
    }

    const csv = gerarCSV(calculoAtual.pieces);
    const fileName = `tabela_cupula_${Math.round(calculoAtual.external.largura)}x${Math.round(calculoAtual.external.profundidade)}x${Math.round(calculoAtual.external.altura)}.csv`;
    downloadTextFile(csv, fileName, "text/csv;charset=utf-8");
  });

  elements.downloadDXF.addEventListener("click", () => {
    if (!calculoAtual || !calculoAtual.isValid) {
      return;
    }

    const dxf = gerarDXF(calculoAtual.pieces);
    downloadTextFile(dxf, getDXFFileName(calculoAtual), "application/dxf;charset=utf-8");
  });

  bindInputs(elements, renderAll);
  updateModeButtons(currentViewMode);
  renderAll();
})();