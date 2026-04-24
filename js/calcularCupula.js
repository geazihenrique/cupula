import { round } from "./utils.js";

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

function createPiece(nome, quantidade, largura, alturaProfundidade, espessura, observacao) {
  return {
    nome,
    quantidade,
    largura: round(largura),
    alturaProfundidade: round(alturaProfundidade),
    espessura: round(espessura),
    observacao,
  };
}

export function calcularCupula(configuracao) {
  const larguraInformada = Number(configuracao.largura);
  const profundidadeInformada = Number(configuracao.profundidade);
  const alturaInformada = Number(configuracao.altura);
  const espessura = Number(configuracao.espessura);
  const tipoMedida = configuracao.tipoMedida;
  const tipoCupula = configuracao.tipoCupula;
  const tipoMontagem = configuracao.tipoMontagem;
  const isAberta = tipoCupula === "aberta";
  const isExterna = tipoMedida === "externa";
  const lateraisPorDentro = tipoMontagem === "dentro";
  const erros = [];

  if ([larguraInformada, profundidadeInformada, alturaInformada, espessura].some((valor) => !Number.isFinite(valor) || valor <= 0)) {
    erros.push("Informe valores maiores que zero para largura, profundidade, altura e espessura.");
  }

  const larguraExterna = isExterna ? larguraInformada : larguraInformada + (2 * espessura);
  const profundidadeExterna = isExterna ? profundidadeInformada : profundidadeInformada + (2 * espessura);
  const alturaExterna = isExterna
    ? alturaInformada
    : alturaInformada + (isAberta ? espessura : 2 * espessura);

  const alturaParede = isAberta
    ? alturaExterna - espessura
    : alturaExterna - (2 * espessura);

  const larguraFrenteFundo = lateraisPorDentro
    ? larguraExterna
    : larguraExterna - (2 * espessura);

  const profundidadeLaterais = lateraisPorDentro
    ? profundidadeExterna - (2 * espessura)
    : profundidadeExterna;

  const medidasExternas = {
    largura: round(larguraExterna),
    profundidade: round(profundidadeExterna),
    altura: round(alturaExterna),
  };

  const medidasInternas = isExterna
    ? {
        largura: round(larguraExterna - (2 * espessura)),
        profundidade: round(profundidadeExterna - (2 * espessura)),
        altura: round(alturaExterna - (isAberta ? espessura : 2 * espessura)),
      }
    : {
        largura: round(larguraInformada),
        profundidade: round(profundidadeInformada),
        altura: round(alturaInformada),
      };

  if (medidasInternas.largura <= 0 || medidasInternas.profundidade <= 0 || medidasInternas.altura <= 0) {
    erros.push("As medidas internas resultaram em valores inválidos. Revise as dimensões e a espessura.");
  }

  if (alturaParede <= 0) {
    erros.push("A altura útil das paredes ficou menor ou igual a zero. Revise altura e espessura.");
  }

  const pecas = [
    createPiece("Base", 1, larguraExterna, profundidadeExterna, espessura, "Placa inferior"),
    createPiece("Frente", 1, larguraFrenteFundo, alturaParede, espessura, lateraisPorDentro ? "Laterais por dentro" : "Entre as laterais"),
    createPiece("Fundo", 1, larguraFrenteFundo, alturaParede, espessura, lateraisPorDentro ? "Laterais por dentro" : "Entre as laterais"),
    createPiece("Lateral", 2, profundidadeLaterais, alturaParede, espessura, lateraisPorDentro ? "Entre frente e fundo" : "Por fora da frente e fundo"),
  ];

  if (!isAberta) {
    pecas.splice(1, 0, createPiece("Tampa", 1, larguraExterna, profundidadeExterna, espessura, "Placa superior"));
  }

  pecas.forEach((peca) => {
    if (peca.largura <= 0 || peca.alturaProfundidade <= 0) {
      erros.push(`A peça "${peca.nome}" ficou com dimensão inválida. Ajuste medidas, espessura ou montagem.`);
    }
  });

  const maiorDimensao = Math.max(
    medidasExternas.largura,
    medidasExternas.profundidade,
    medidasExternas.altura
  );

  return {
    configuracao: {
      largura: larguraInformada,
      profundidade: profundidadeInformada,
      altura: alturaInformada,
      espessura,
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