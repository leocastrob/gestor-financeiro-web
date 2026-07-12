import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as api from '../services/api'
import type { Divida, DadosNovaDivida, DadosEdicaoDivida } from '../services/api'

export const useDividasStore = defineStore('dividas', () => {
  const dividas = ref<Divida[]>([])
  const carregando = ref(false)
  const erro = ref<string | null>(null)
  const erroAcao = ref<string | null>(null)

  const buscarDividas = async (telefone: string) => {
    if (!telefone) return
    carregando.value = true
    erro.value = null
    try {
      dividas.value = await api.buscarDividas(telefone)
    } catch (e) {
      console.error(e)
      erro.value = 'Não foi possível carregar as dívidas.'
    } finally {
      carregando.value = false
    }
  }

  const criarDivida = async (telefone: string, dados: DadosNovaDivida) => {
    erroAcao.value = null
    try {
      const criada = await api.criarDivida(telefone, dados)
      dividas.value.unshift({ ...criada, parcelas_pagas: 0 })
      return criada
    } catch (e) {
      console.error(e)
      erroAcao.value = 'Erro ao criar a dívida. Tente novamente.'
      return null
    }
  }

  const editarDivida = async (id: number, telefone: string, dados: DadosEdicaoDivida) => {
    erroAcao.value = null
    try {
      await api.editarDivida(id, telefone, dados)
      const existente = dividas.value.find((d) => d.id === id)
      if (existente) Object.assign(existente, dados)
      return true
    } catch (e) {
      console.error(e)
      erroAcao.value = 'Erro ao editar a dívida. Tente novamente.'
      return false
    }
  }

  const excluirDivida = async (id: number, telefone: string) => {
    erroAcao.value = null
    try {
      await api.excluirDivida(id, telefone)
      const existente = dividas.value.find((d) => d.id === id)
      if (existente && Number(existente.parcelas_pagas) > 0) {
        existente.ativa = 0
      } else {
        dividas.value = dividas.value.filter((d) => d.id !== id)
      }
      return true
    } catch (e) {
      console.error(e)
      erroAcao.value = 'Erro ao excluir a dívida. Tente novamente.'
      return false
    }
  }

  const lancarParcela = async (id: number) => {
    erroAcao.value = null
    try {
      const resultado = await api.lancarParcela(id)
      const existente = dividas.value.find((d) => d.id === id)
      if (existente && !resultado.jaLancada) {
        existente.parcelas_pagas = Number(existente.parcelas_pagas) + 1
        if (resultado.quitada) existente.ativa = 0
      }
      return resultado
    } catch (e) {
      console.error(e)
      erroAcao.value = 'Erro ao lançar a parcela. Tente novamente.'
      return null
    }
  }

  // Ação: limpa o estado do usuário anterior (chamada no logout, junto com
  // gastosStore.logout()/metasStore.resetar()) para não deixar dívidas em
  // memória em dispositivo compartilhado.
  const resetar = () => {
    dividas.value = []
    erro.value = null
    erroAcao.value = null
  }

  return { dividas, carregando, erro, erroAcao, buscarDividas, criarDivida, editarDivida, excluirDivida, lancarParcela, resetar }
})
