function formatNumber(value) {
  return Number(value).toFixed(3).replace(/\.?0+$/, "");
}

function createRectangleEntities(x, y, width, height) {
  return [
    [x, y, x + width, y],
    [x + width, y, x + width, y + height],
    [x + width, y + height, x, y + height],
    [x, y + height, x, y],
  ];
}

function expandirPecas(pecas) {
  return pecas.flatMap((peca) => Array.from({ length: peca.quantidade }, () => ({
    largura: peca.largura,
    alturaProfundidade: peca.alturaProfundidade,
  })));
}

export function gerarDXF(pecas) {
  const spacing = 20;
  let offsetX = 0;
  const entities = [];

  expandirPecas(pecas).forEach((peca) => {
    const linhas = createRectangleEntities(offsetX, 0, peca.largura, peca.alturaProfundidade);

    linhas.forEach((linha) => {
      entities.push(
        "0",
        "LINE",
        "8",
        "CORTE",
        "10",
        formatNumber(linha[0]),
        "20",
        formatNumber(linha[1]),
        "30",
        "0",
        "11",
        formatNumber(linha[2]),
        "21",
        formatNumber(linha[3]),
        "31",
        "0"
      );
    });

    offsetX += peca.largura + spacing;
  });

  return [
    "0",
    "SECTION",
    "2",
    "HEADER",
    "9",
    "$INSUNITS",
    "70",
    "4",
    "0",
    "ENDSEC",
    "0",
    "SECTION",
    "2",
    "TABLES",
    "0",
    "TABLE",
    "2",
    "LAYER",
    "70",
    "1",
    "0",
    "LAYER",
    "2",
    "CORTE",
    "70",
    "0",
    "62",
    "7",
    "6",
    "CONTINUOUS",
    "0",
    "ENDTAB",
    "0",
    "ENDSEC",
    "0",
    "SECTION",
    "2",
    "ENTITIES",
    ...entities,
    "0",
    "ENDSEC",
    "0",
    "EOF",
  ].join("\n");
}

export function getDXFFileName(calculo) {
  return `cupula_${Math.round(calculo.medidasExternas.largura)}x${Math.round(calculo.medidasExternas.profundidade)}x${Math.round(calculo.medidasExternas.altura)}_${Math.round(calculo.configuracao.espessura)}mm.dxf`;
}
