(function () {
  const { defaults } = window.CupulaState;
  const { sanitizeNumber } = window.CupulaUtils;

  function setSegment(container, value) {
    container.querySelectorAll(".segment").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.value === value);
    });
  }

  function bindInputs(elements, onChange) {
    ["largura", "profundidade", "altura", "espessura", "tipoMontagem"].forEach((key) => {
      elements[key].addEventListener("input", onChange);
      elements[key].addEventListener("change", onChange);
    });

    elements.segmented.forEach((container) => {
      container.addEventListener("click", (event) => {
        const button = event.target.closest(".segment");
        if (!button) {
          return;
        }

        setSegment(container, button.dataset.value);
        onChange();
      });
    });

    elements.resetButton.addEventListener("click", () => {
      elements.largura.value = defaults.largura;
      elements.profundidade.value = defaults.profundidade;
      elements.altura.value = defaults.altura;
      elements.espessura.value = defaults.espessura;
      elements.tipoMontagem.value = defaults.tipoMontagem;
      elements.segmented.forEach((container) => setSegment(container, container.dataset.segmented === "tipoMedida" ? defaults.tipoMedida : defaults.tipoCupula));
      onChange({ resetViewMode: true });
    });
  }

  function readFormState(elements) {
    return {
      largura: sanitizeNumber(elements.largura.value, defaults.largura),
      profundidade: sanitizeNumber(elements.profundidade.value, defaults.profundidade),
      altura: sanitizeNumber(elements.altura.value, defaults.altura),
      espessura: sanitizeNumber(elements.espessura.value, defaults.espessura),
      tipoMontagem: elements.tipoMontagem.value,
      tipoMedida: elements.tipoMedida.querySelector(".segment.is-active").dataset.value,
      tipoCupula: elements.tipoCupula.querySelector(".segment.is-active").dataset.value,
    };
  }

  window.CupulaInput = {
    bindInputs,
    readFormState,
    setSegment,
  };
})();