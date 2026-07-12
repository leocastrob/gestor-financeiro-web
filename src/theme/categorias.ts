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

// Paleta própria para categorias personalizadas — distinta das 8 cores fixas
// acima. A cor é escolhida por hash do nome (não por posição na lista), para
// não mudar quando outra categoria personalizada é criada/removida.
const PALETA_CATEGORIA_PERSONALIZADA = [
  '#db2777', '#0d9488', '#ca8a04', '#0891b2', '#be123c', '#65a30d',
]

function corPersonalizada(nome: string): string {
  let hash = 0
  for (let i = 0; i < nome.length; i++) hash = (hash * 31 + nome.charCodeAt(i)) >>> 0
  return PALETA_CATEGORIA_PERSONALIZADA[hash % PALETA_CATEGORIA_PERSONALIZADA.length]!
}

export function corDaCategoria(categoria: string): string {
  if (CATEGORIAS_INFO[categoria]) return CATEGORIAS_INFO[categoria].cor

  try {
    const store = useCategoriasStore()
    if (store.categorias.some(c => c.nome === categoria)) return corPersonalizada(categoria)
  } catch {
    // Caso seja chamado fora de contexto Vue/Pinia ativo
  }

  return COR_PADRAO
}

export function iconeDaCategoria(categoria: string): string {
  if (CATEGORIAS_INFO[categoria]) return CATEGORIAS_INFO[categoria].icone
  
  // Tenta buscar nas categorias customizadas do usuário
  try {
    const store = useCategoriasStore()
    const custom = store.categorias.find(c => c.nome === categoria)
    if (custom) return custom.icone
  } catch {
    // Caso seja chamado fora de contexto Vue/Pinia ativo
  }
  
  return ICONE_PADRAO
}

