# Gerador de Cúpulas

Aplicação web estática para gerar cúpulas e caixas de acrílico a partir de largura, profundidade, altura, espessura, tipo de medida, tipo da cúpula e tipo de montagem. O sistema calcula as peças, mostra um resumo técnico, exibe preview 3D, gera preview 2D de corte e permite baixar arquivo DXF para corte a laser.

## Como abrir

1. Abra o arquivo `index.html` em um navegador moderno.
2. Ajuste os campos no painel esquerdo.
3. Use os botões para baixar o DXF ou limpar o formulário.

O projeto não depende de backend. Toda a lógica roda no navegador.

## Estrutura principal

- `index.html`: estrutura da interface.
- `css/style.css`: layout, responsividade e identidade visual.
- `js/calcularCupula.js`: regras de cálculo, validações e recomendação de espessura.
- `js/gerarTabela.js`: renderização da tabela de peças.
- `js/gerarPreview2D.js`: preview SVG das peças.
- `js/gerarModelo3D.js`: montagem do modelo 3D com Three.js.
- `js/gerarDXF.js`: geração do arquivo DXF ASCII.
- `js/app.js`: orquestração geral da interface.

## Como os cálculos funcionam

### Medidas internas e externas

- Se o usuário escolhe `Externa`, os valores digitados já são tratados como dimensões finais externas.
- Se o usuário escolhe `Interna`, o sistema soma a espessura para chegar ao volume externo:
  - largura externa = largura interna + `2 x espessura`
  - profundidade externa = profundidade interna + `2 x espessura`
  - altura externa aberta = altura interna + `1 x espessura`
  - altura externa fechada = altura interna + `2 x espessura`

### Tipo da cúpula

- `Aberta`: gera base, frente, fundo e duas laterais.
- `Fechada`: gera base, tampa, frente, fundo e duas laterais.

### Tipo de montagem

- `Laterais por dentro da frente e fundo`
  - frente e fundo usam a largura total
  - laterais usam profundidade menos `2 x espessura`

- `Laterais por fora da frente e fundo`
  - laterais usam a profundidade total
  - frente e fundo usam largura menos `2 x espessura`

### Altura das paredes

- Cúpula aberta: altura da parede = altura externa menos `1 x espessura`
- Cúpula fechada: altura da parede = altura externa menos `2 x espessura`

### Validação

- O sistema impede peças com largura, profundidade ou altura menor ou igual a zero.
- Quando isso acontece, mostra erro em português e bloqueia o download do DXF.

### Recomendação de espessura

O sistema avalia a maior dimensão externa calculada:

- a partir de `400 mm`, recomenda `4 mm`
- a partir de `600 mm`, recomenda `5 mm`
- a partir de `800 mm`, recomenda `6 mm`

## Como o DXF é gerado

- O arquivo é montado diretamente no navegador em formato ASCII DXF.
- A unidade usada é milímetro.
- Cada peça é desenhada com linhas simples em 2D.
- Todas as entidades são colocadas na camada `CORTE`.
- As peças são posicionadas lado a lado com espaçamento fixo para facilitar importação em RDWorks e LaserWorks.
- O arquivo não usa preenchimento, hatch, blocos complexos nem elementos desnecessários.

## Melhorias futuras

- Login por colaborador
- Modelos salvos
- Número de OS
- Integração com Google Sheets
- Nesting automático de chapas
- Compensação de kerf
- Margem de corte editável
- Camada de gravação
- Relatório em PDF
