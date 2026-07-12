import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  buscarCategoriasCustomizadas,
  criarCategoriaCustomizada,
  editarCategoriaCustomizada,
  excluirCategoriaCustomizada,
  type CategoriaPersonalizada,
  type DadosEdicaoCategoria,
  type DadosNovaCategoria
} from '@/services/api'

export const useCategoriasStore = defineStore('categorias', () => {
  const categorias = ref<CategoriaPersonalizada[]>([])
  const carregando = ref(false)
  const erro = ref<string | null>(null)
  // Erro de uma ação pontual (criar/editar/excluir) — banner dispensável, não
  // se confunde com falha de carregamento (evita mostrar "nenhuma categoria
  // ainda" junto com o erro quando é a listagem que falhou).
  const erroAcao = ref<string | null>(null)

  async function carregarCategorias(telefone: string) {
    if (!telefone) return
    carregando.value = true
    erro.value = null
    try {
      categorias.value = await buscarCategoriasCustomizadas(telefone)
    } catch (e) {
      erro.value = (e as Error).message
    } finally {
      carregando.value = false
    }
  }

  async function adicionarCategoria(telefone: string, dados: DadosNovaCategoria) {
    erroAcao.value = null
    try {
      const nova = await criarCategoriaCustomizada(telefone, dados)
      categorias.value.push(nova)
      return true
    } catch (e) {
      erroAcao.value = (e as Error).message
      return false
    }
  }

  async function editarCategoria(telefone: string, id: number, dados: DadosEdicaoCategoria) {
    erroAcao.value = null
    try {
      const atualizada = await editarCategoriaCustomizada(id, telefone, dados)
      const existente = categorias.value.find(c => c.id === id)
      if (existente) Object.assign(existente, atualizada)
      return true
    } catch (e) {
      erroAcao.value = (e as Error).message
      return false
    }
  }

  async function removerCategoria(telefone: string, id: number) {
    erroAcao.value = null
    try {
      await excluirCategoriaCustomizada(id, telefone)
      categorias.value = categorias.value.filter(c => c.id !== id)
      return true
    } catch (e) {
      erroAcao.value = (e as Error).message
      return false
    }
  }

  function limpar() {
    categorias.value = []
    erro.value = null
    erroAcao.value = null
  }

  return {
    categorias,
    carregando,
    erro,
    erroAcao,
    carregarCategorias,
    adicionarCategoria,
    editarCategoria,
    removerCategoria,
    limpar
  }
})
