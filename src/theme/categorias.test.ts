import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { corDaCategoria } from './categorias'
import { useCategoriasStore } from '../stores/categorias'
import type { CategoriaPersonalizada } from '../services/api'

function categoria(nome: string, cor: string | null): CategoriaPersonalizada {
  return { id: 1, telefone: '5511999999999', nome, icone: '🏷️', cor, tipo: 'despesa', criado_em: '' }
}

describe('corDaCategoria', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('devolve a cor fixa das categorias do sistema', () => {
    expect(corDaCategoria('Alimentação')).toBe('#199e70')
  })

  it('devolve a cor gravada de uma categoria personalizada', () => {
    const store = useCategoriasStore()
    store.categorias = [categoria('Faculdade', '#db2777')]

    expect(corDaCategoria('Faculdade')).toBe('#db2777')
  })

  it('cai na cor automática quando a personalizada tem cor nula', () => {
    const store = useCategoriasStore()
    store.categorias = [categoria('Faculdade', null)]

    // Hash do nome — estável, não depende de ordem na lista
    expect(corDaCategoria('Faculdade')).toMatch(/^#[0-9a-f]{6}$/)
    expect(corDaCategoria('Faculdade')).not.toBe('#64748b')
  })

  it('devolve a cor padrão para categoria desconhecida', () => {
    expect(corDaCategoria('Inexistente')).toBe('#64748b')
  })
})
