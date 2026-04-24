import { DEFAULT_STATE } from "./state.js";
import { sanitizeNumber } from "./utils.js";

export function setSegmentedValue(container, value) {
  container.querySelectorAll(".segment").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.value === value);
  });
}

export function readFormState(elements) {
  return {
    largura: sanitizeNumber(elements.largura.value, DEFAULT_STATE.largura),
    profundidade: sanitizeNumber(elements.profundidade.value, DEFAULT_STATE.profundidade),
    altura: sanitizeNumber(elements.altura.value, DEFAULT_STATE.altura),
    espessura: sanitizeNumber(elements.espessura.value, DEFAULT_STATE.espessura),
    tipoMontagem: elements.tipoMontagem.value,
    tipoMedida: elements.tipoMedida.querySelector(".segment.is-active")?.dataset.value || DEFAULT_STATE.tipoMedida,
    tipoCupula: elements.tipoCupula.querySelector(".segment.is-active")?.dataset.value || DEFAULT_STATE.tipoCupula,
  };
}

export function applyStateToForm(elements, state) {
  elements.largura.value = state.largura;
  elements.profundidade.value = state.profundidade;
  elements.altura.value = state.altura;
  elements.espessura.value = state.espessura;
  elements.tipoMontagem.value = state.tipoMontagem;
  setSegmentedValue(elements.tipoMedida, state.tipoMedida);
  setSegmentedValue(elements.tipoCupula, state.tipoCupula);
}

export function bindInputs(elements, onChange, onReset) {
  ["largura", "profundidade", "altura", "espessura", "tipoMontagem"].forEach((field) => {
    elements[field].addEventListener("input", onChange);
    elements[field].addEventListener("change", onChange);
  });

  [elements.tipoMedida, elements.tipoCupula].forEach((container) => {
    container.addEventListener("click", (event) => {
      const button = event.target.closest(".segment");
      if (!button) {
        return;
      }

      setSegmentedValue(container, button.dataset.value);
      onChange();
    });
  });

  elements.resetButton.addEventListener("click", () => {
    onReset();
  });
}