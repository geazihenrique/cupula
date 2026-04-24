(function () {
  const { round } = window.CupulaUtils;

  function getRecommendation(maiorDimensao, espessura) {
    if (maiorDimensao >= 800 && espessura < 6) {
      return {
        espessuraMinima: 6,
        message: `Atenção na espessura. Esta cúpula possui uma face com até ${Math.round(maiorDimensao)} mm. Para mais rigidez, recomendamos acrílico de 6 mm ou superior.`,
      };
    }

    if (maiorDimensao >= 600 && espessura < 5) {
      return {
        espessuraMinima: 5,
        message: `Atenção na espessura. Esta cúpula possui uma face com até ${Math.round(maiorDimensao)} mm. Para mais rigidez, recomendamos acrílico de 5 mm ou superior.`,
      };
    }

    if (maiorDimensao >= 400 && espessura < 4) {
      return {
        espessuraMinima: 4,
        message: `Atenção na espessura. Esta cúpula possui uma face com até ${Math.round(maiorDimensao)} mm. Para mais rigidez, recomendamos acrílico de 4 mm ou superior.`,
      };
    }

    return null;
  }

  function buildPiece(nome, quantidade, largura, alturaProfundidade, espessura, observacao) {
    return {
      nome,
      quantidade,
      largura: round(largura),
      alturaProfundidade: round(alturaProfundidade),
      espessura: round(espessura),
      observacao,
    };
  }

  function calcularCupula(formData) {
    const larguraInput = Number(formData.largura);
    const profundidadeInput = Number(formData.profundidade);
    const alturaInput = Number(formData.altura);
    const espessura = Number(formData.espessura);
    const aberta = formData.tipoCupula === "aberta";
    const medidaExterna = formData.tipoMedida === "externa";
    const montagemDentro = formData.tipoMontagem === "dentro";
    const errors = [];

    if ([larguraInput, profundidadeInput, alturaInput, espessura].some((value) => !Number.isFinite(value) || value <= 0)) {
      errors.push("Informe valores numéricos maiores que zero para largura, profundidade, altura e espessura.");
    }

    const larguraExterna = medidaExterna ? larguraInput : larguraInput + (2 * espessura);
    const profundidadeExterna = medidaExterna ? profundidadeInput : profundidadeInput + (2 * espessura);
    const alturaExterna = medidaExterna
      ? alturaInput
      : alturaInput + (aberta ? espessura : 2 * espessura);

    const alturaParede = aberta ? alturaExterna - espessura : alturaExterna - (2 * espessura);
    const larguraFrente = montagemDentro ? larguraExterna : larguraExterna - (2 * espessura);
    const profundidadeLateral = montagemDentro ? profundidadeExterna - (2 * espessura) : profundidadeExterna;

    const pieces = [
      buildPiece("Base", 1, larguraExterna, profundidadeExterna, espessura, "Placa inferior"),
    ];

    if (!aberta) {
      pieces.push(buildPiece("Tampa", 1, larguraExterna, profundidadeExterna, espessura, "Placa superior"));
    }

    pieces.push(
      buildPiece("Frente", 1, larguraFrente, alturaParede, espessura, montagemDentro ? "Recebe as laterais por dentro" : "Fica entre as laterais"),
      buildPiece("Fundo", 1, larguraFrente, alturaParede, espessura, montagemDentro ? "Recebe as laterais por dentro" : "Fica entre as laterais"),
      buildPiece("Lateral", 2, profundidadeLateral, alturaParede, espessura, montagemDentro ? "Entre frente e fundo" : "Por fora da frente e fundo")
    );

    pieces.forEach((piece) => {
      if (piece.largura <= 0 || piece.alturaProfundidade <= 0) {
        errors.push(`Dimensão inválida encontrada na peça "${piece.nome}". Ajuste medidas, espessura ou tipo de montagem.`);
      }
    });

    if (alturaParede <= 0) {
      errors.push("A altura calculada das paredes ficou menor ou igual a zero. Revise altura e espessura.");
    }

    const external = {
      largura: round(larguraExterna),
      profundidade: round(profundidadeExterna),
      altura: round(alturaExterna),
    };

    const internal = medidaExterna
      ? {
          largura: round(larguraExterna - (2 * espessura)),
          profundidade: round(profundidadeExterna - (2 * espessura)),
          altura: round(alturaExterna - (aberta ? espessura : 2 * espessura)),
        }
      : {
          largura: round(larguraInput),
          profundidade: round(profundidadeInput),
          altura: round(alturaInput),
        };

    if (internal.largura <= 0 || internal.profundidade <= 0 || internal.altura <= 0) {
      errors.push("As medidas internas resultaram em valores inválidos. A espessura está alta demais para as dimensões informadas.");
    }

    const maiorDimensao = Math.max(external.largura, external.profundidade, external.altura);
    const recommendation = getRecommendation(maiorDimensao, espessura);

    return {
      input: {
        largura: larguraInput,
        profundidade: profundidadeInput,
        altura: alturaInput,
      },
      external,
      internal,
      espessura,
      alturaParede: round(alturaParede),
      tipoMedida: formData.tipoMedida,
      tipoCupula: formData.tipoCupula,
      tipoMontagem: formData.tipoMontagem,
      recommendation,
      pieces,
      totalPecas: pieces.reduce((acc, piece) => acc + piece.quantidade, 0),
      isValid: errors.length === 0,
      errors,
    };
  }

  window.CupulaCalculator = { calcularCupula };
})();