// Paleta escolhível para categorias personalizadas.
//
// As 24 cores foram validadas com o validador da skill `dataviz` em
// --mode light e --mode dark: todas passam banda de luminância, piso de croma
// e contraste nos dois temas. Dois avisos marginais de contraste (#c98500 em
// 2,99 e #c2185b em 2,97, limiar 3,0) são aceitos porque a cor nunca aparece
// sozinha na interface — sempre ao lado do nome e do ícone da categoria.
//
// Nenhuma paleta desse tamanho é mutuamente distinguível: acima de ~3 cores
// coexistindo, a separação depende do rótulo, não do tom. Por isso o seletor
// marca as cores já em uso, em vez de fingir que 24 tons se distinguem.
//
// Ordem por matiz, exibida em grade de 6 colunas por 4 linhas.
export const PALETA_CORES = [
  '#e34948', '#e66767', '#c2410c', '#d95926', '#a16207', '#c98500',
  '#4d7c0f', '#65a30d', '#008300', '#2f9e44', '#0f8f63', '#199e70',
  '#0d9488', '#1a7fa8', '#0891b2', '#3987e5', '#2a78d6', '#6d7ff0',
  '#9085e9', '#a855f7', '#c026d3', '#c2185b', '#d55181', '#db2777',
] as const
