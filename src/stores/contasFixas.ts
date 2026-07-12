import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as api from '../services/api'
import type { ContaFixa, DadosNovaContaFixa, DadosEdicaoContaFixa } from '../services/api'

export const useContasFixasStore = defineStore('contasFixas', () => {
  const contasFixas = ref<ContaFixa[]>([])
  const carregando = ref(false)
  const erro = ref<string | null>(null)
  const erroAcao = ref<string | null>(null)

  const buscarContas = async (telefone: string) => {
    if (!telefone) return
    carregando.value = true
    erro.value = null
    try {
      contasFixas.value = await api.buscarContasFixas(telefone)
    } catch (e) {
      console.error(e)
      erro.value = 'Não foi possível carregar as contas fixas.'
    } finally {
      carregando.value = false
    }
  }

  const criarConta = async (telefone: string, dados: DadosNovaContaFixa) => {
    erroAcao.value = null
    try {
      const criada = await api.criarContaFixa(telefone, dados)
      contasFixas.value.push({ ...criada, paga_neste_mes: false })
      return criada
    } catch (e) {
      console.error(e)
      erroAcao.value = 'Erro ao criar a conta fixa. Tente novamente.'
      return null
    }
  }

  const editarConta = async (id: number, telefone: string, dados: DadosEdicaoContaFixa) => {
    erroAcao.value = null
    try {
      await api.editarContaFixa(id, telefone, dados)
      const existente = contasFixas.value.find((c) => c.id === id)
      if (existente) Object.assign(existente, dados)
      return true
    } catch (e) {
      console.error(e)
      erroAcao.value = 'Erro ao editar a conta fixa. Tente novamente.'
      return false
    }
  }

  const excluirConta = async (id: number, telefone: string) => {
    erroAcao.value = null
    try {
      await api.excluirContaFixa(id, telefone)
      // A API retorna que a excluiu fisicamente ou logicamente
      // Por simplicidade, refazemos a busca ou alteramos no client
      // Vamos assumir que excluiu e removemos da lista. Se tiver gastos e virou inativa,
      // ideal seria refazer a busca, mas vamos deletar do state ou mudar pra inativa
      const existente = contasFixas.value.find((c) => c.id === id)
      if (existente && existente.paga_neste_mes) {
        existente.ativa = 0
      } else {
        contasFixas.value = contasFixas.value.filter((c) => c.id !== id)
      }
      return true
    } catch (e) {
      console.error(e)
      erroAcao.value = 'Erro ao excluir a conta fixa. Tente novamente.'
      return false
    }
  }

  const lancarPagamento = async (id: number) => {
    erroAcao.value = null
    try {
      const resultado = await api.lancarContaFixa(id)
      const existente = contasFixas.value.find((c) => c.id === id)
      if (existente) {
        existente.paga_neste_mes = true
      }
      return resultado
    } catch (e) {
      console.error(e)
      erroAcao.value = 'Erro ao lançar a conta fixa. Tente novamente.'
      return null
    }
  }

  const resetar = () => {
    contasFixas.value = []
    erro.value = null
    erroAcao.value = null
  }

  return { contasFixas, carregando, erro, erroAcao, buscarContas, criarConta, editarConta, excluirConta, lancarPagamento, resetar }
})
