export const DEFAULT_STATE = {
  largura: 300,
  profundidade: 200,
  altura: 150,
  espessura: 3,
  tipoMedida: "externa",
  tipoCupula: "aberta",
  tipoMontagem: "dentro",
  viewMode: "montada",
};

export function getDefaultState() {
  return { ...DEFAULT_STATE };
}