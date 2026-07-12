import { useCategoriasStore } from '@/stores/categorias'

// Cor e ícone fixos por categoria — nunca por posição/ordem de aparição.
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
const ICONE_PADRAO = '🏷️'

export function corDaCategoria(categoria: string): string {
  return CATEGORIAS_INFO[categoria]?.cor ?? COR_PADRAO
}

export function iconeDaCategoria(categoria: string): string {
  if (CATEGORIAS_INFO[categoria]) return CATEGORIAS_INFO[categoria].icone
  
  // Tenta buscar nas categorias customizadas do usuário
  try {
    const store = useCategoriasStore()
    const custom = store.categorias.find(c => c.nome === categoria)
    if (custom) return custom.icone
  } catch (e) {
    // Caso seja chamado fora de contexto Vue/Pinia ativo
  }
  
  return ICONE_PADRAO
}

