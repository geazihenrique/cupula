(function () {
  const defaults = {
    largura: 300,
    profundidade: 200,
    altura: 150,
    espessura: 3,
    tipoMedida: "externa",
    tipoCupula: "aberta",
    tipoMontagem: "dentro",
    viewMode: "montada",
  };

  const state = { ...defaults };

  window.CupulaState = {
    defaults,
    state,
    set(partial) {
      Object.assign(state, partial);
      return { ...state };
    },
    reset() {
      Object.assign(state, defaults);
      return { ...state };
    },
    get() {
      return { ...state };
    },
  };
})();