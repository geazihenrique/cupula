function round(value) {
  return Math.round((Number(value) + Number.EPSILON) * 1000) / 1000;
}

function criarPeca(nome, quantidade, largura, alturaProfundidade, espessura, observacao) {
  return {
    nome,
    quantidade,
    largura: round(largura),
    alturaProfundidade: round(alturaProfundidade),
    espessura: round(espessura),
    observacao,
  };
}

function getRecommendation(maiorDimensao, espessura) {
  if (maiorDimensao >= 800 && espessura < 6) {
    return {
      espessuraMinima: 6,
      mensagem: `Atenção na espessura. Esta cúpula possui uma face com até ${Math.round(maiorDimensao)} mm. Para mais rigidez, recomendamos acrílico de 6 mm ou superior.`,
    };
  }

  if (maiorDimensao >= 600 && espessura < 5) {
    return {
      espessuraMinima: 5,
      mensagem: `Atenção na espessura. Esta cúpula possui uma face com até ${Math.round(maiorDimensao)} mm. Para mais rigidez, recomendamos acrílico de 5 mm ou superior.`,
    };
  }

  if (maiorDimensao >= 400 && espessura < 4) {
    return {
      espessuraMinima: 4,
      mensagem: `Atenção na espessura. Esta cúpula possui uma face com até ${Math.round(maiorDimensao)} mm. Para mais rigidez, recomendamos acrílico de 4 mm ou superior.`,
    };
  }

  return null;
}

export function calcularCupula(configuracao) {
  const larguraInformada = Number(configuracao.largura);
  const profundidadeInformada = Number(configuracao.profundidade);
  const alturaInformada = Number(configuracao.altura);
  const espessura = Number(configuracao.espessura);
  const tipoMedida = configuracao.tipoMedida === "interna" ? "interna" : "externa";
  const tipoCupula = configuracao.tipoCupula === "fechada" ? "fechada" : "aberta";
  const tipoMontagem = configuracao.tipoMontagem === "fora" ? "fora" : "dentro";
  const aberta = tipoCupula === "aberta";
  const medidaExterna = tipoMedida === "externa";
  const lateraisPorDentro = tipoMontagem === "dentro";
  const erros = [];

  const valores = [larguraInformada, profundidadeInformada, alturaInformada, espessura];
  if (valores.some((valor) => !Number.isFinite(valor) || valor <= 0)) {
    erros.push("Informe largura, profundidade, altura e espessura com valores maiores que zero.");
  }

  const larguraExterna = medidaExterna ? larguraInformada : larguraInformada + (2 * espessura);
  const profundidadeExterna = medidaExterna ? profundidadeInformada : profundidadeInformada + (2 * espessura);
  const alturaExterna = medidaExterna
    ? alturaInformada
    : alturaInformada + (aberta ? espessura : 2 * espessura);

  const alturaParede = aberta ? alturaExterna - espessura : alturaExterna - (2 * espessura);
  const larguraFrenteFundo = lateraisPorDentro ? larguraExterna : larguraExterna - (2 * espessura);
  const profundidadeLaterais = lateraisPorDentro ? profundidadeExterna - (2 * espessura) : profundidadeExterna;

  const medidasExternas = {
    largura: round(larguraExterna),
    profundidade: round(profundidadeExterna),
    altura: round(alturaExterna),
  };

  const medidasInternas = medidaExterna
    ? {
        largura: round(larguraExterna - (2 * espessura)),
        profundidade: round(profundidadeExterna - (2 * espessura)),
        altura: round(alturaExterna - (aberta ? espessura : 2 * espessura)),
      }
    : {
        largura: round(larguraInformada),
        profundidade: round(profundidadeInformada),
        altura: round(alturaInformada),
      };

  if (alturaParede <= 0) {
    erros.push("A altura útil das paredes ficou inválida. Revise altura e espessura.");
  }

  if (medidasInternas.largura <= 0 || medidasInternas.profundidade <= 0 || medidasInternas.altura <= 0) {
    erros.push("As medidas internas resultaram em valores inválidos. Revise as dimensões informadas e a espessura.");
  }

  const pecas = [
    criarPeca("Base", 1, medidasExternas.largura, medidasExternas.profundidade, espessura, "Placa inferior"),
    criarPeca(
      "Frente",
      1,
      larguraFrenteFundo,
      alturaParede,
      espessura,
      lateraisPorDentro ? "Largura total da frente" : "Entre as laterais"
    ),
    criarPeca(
      "Fundo",
      1,
      larguraFrenteFundo,
      alturaParede,
      espessura,
      lateraisPorDentro ? "Largura total do fundo" : "Entre as laterais"
    ),
    criarPeca(
      "Laterais",
      2,
      profundidadeLaterais,
      alturaParede,
      espessura,
      lateraisPorDentro ? "Por dentro da frente e fundo" : "Por fora da frente e fundo"
    ),
  ];

  if (!aberta) {
    pecas.splice(1, 0, criarPeca("Tampa", 1, medidasExternas.largura, medidasExternas.profundidade, espessura, "Placa superior"));
  }

  pecas.forEach((peca) => {
    if (peca.largura <= 0 || peca.alturaProfundidade <= 0) {
      erros.push(`A peça "${peca.nome}" ficou com dimensão inválida. Ajuste medidas, espessura ou tipo de montagem.`);
    }
  });

  const maiorDimensao = Math.max(medidasExternas.largura, medidasExternas.profundidade, medidasExternas.altura);

  return {
    configuracao: {
      largura: round(larguraInformada),
      profundidade: round(profundidadeInformada),
      altura: round(alturaInformada),
      espessura: round(espessura),
      tipoMedida,
      tipoCupula,
      tipoMontagem,
    },
    medidasExternas,
    medidasInternas,
    alturaParede: round(alturaParede),
    pecas,
    recomendacao: getRecommendation(maiorDimensao, espessura),
    isValido: erros.length === 0,
    erros,
    totalPecas: pecas.reduce((acumulador, peca) => acumulador + peca.quantidade, 0),
  };
}
