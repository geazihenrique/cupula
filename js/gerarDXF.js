(function () {
  function formatNumber(value) {
    return Number(value).toFixed(3).replace(/\.?0+$/, "");
  }

  function rectangleLines(x, y, width, height) {
    return [
      [x, y, x + width, y],
      [x + width, y, x + width, y + height],
      [x + width, y + height, x, y + height],
      [x, y + height, x, y],
    ];
  }

  function gerarDXF(parts) {
    const spacing = 20;
    let offsetX = 0;
    const entities = [];

    parts.forEach((piece) => {
      for (let i = 0; i < piece.quantidade; i += 1) {
        rectangleLines(offsetX, 0, piece.largura, piece.alturaProfundidade).forEach((line) => {
          entities.push(
            "0",
            "LINE",
            "8",
            "CORTE",
            "10",
            formatNumber(line[0]),
            "20",
            formatNumber(line[1]),
            "30",
            "0",
            "11",
            formatNumber(line[2]),
            "21",
            formatNumber(line[3]),
            "31",
            "0"
          );
        });

        offsetX += piece.largura + spacing;
      }
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

  function getDXFFileName(calculo) {
    return `cupula_${Math.round(calculo.external.largura)}x${Math.round(calculo.external.profundidade)}x${Math.round(calculo.external.altura)}_${Math.round(calculo.espessura)}mm.dxf`;
  }

  window.CupulaDXF = {
    gerarDXF,
    getDXFFileName,
  };
})();