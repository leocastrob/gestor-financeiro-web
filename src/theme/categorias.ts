// Cor e ícone fixos por categoria — nunca por posição/ordem de aparição.
// Cores validadas para separação de daltonismo (CVD) contra o fundo escuro do app
// (#0f172a) com o validador da skill de dataviz: todos os checks computáveis passam
// (banda de luminosidade, piso de croma, contraste >= 3:1); "Outros" fica de fora do
// conjunto categórico de propósito (cinza neutro para o catch-all).
export interface InfoCategoria {
  cor: string
  icone: string
}

export const CATEGORIAS_INFO: Record<string, InfoCategoria> = {
  Alimentação: { cor: '#199e70', icone: '🍔' },
  Transporte: { cor: '#3987e5', icone: '🚗' },
  Lazer: { cor: '#d95926', icone: '🎬' },
  Saúde: { cor: '#e66767', icone: '💊' },
  Moradia: { cor: '#c98500', icone: '🏠' },
  Pets: { cor: '#008300', icone: '🐾' },
  Investimentos: { cor: '#8b5cf6', icone: '📈' },
  Outros: { cor: '#64748b', icone: '📦' },
}

export const CATEGORIAS = Object.keys(CATEGORIAS_INFO)

const COR_PADRAO = '#64748b'
const ICONE_PADRAO = '📦'

export function corDaCategoria(categoria: string): string {
  return CATEGORIAS_INFO[categoria]?.cor ?? COR_PADRAO
}

export function iconeDaCategoria(categoria: string): string {
  return CATEGORIAS_INFO[categoria]?.icone ?? ICONE_PADRAO
}
