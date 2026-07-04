import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface Transacao {
  id: number | string
  descricao: string
  valor: number | string
  data: string | Date
}

export const useGastosStore = defineStore('gastos', () => {
  // Estado: Onde vamos guardar a lista que vier do servidor
  const transacoes = ref<Transacao[]>([])
  const carregando = ref(false)
  const erro = ref<string | null>(null)

  // Ação: A função que viaja até o Moto G e busca os dados
  const buscarGastos = async () => {
    carregando.value = true
    erro.value = null
    
    try {
      // Substitua pelo IP real do seu Moto G se ele mudar
      const resposta = await fetch('http://192.168.1.189:3000/gastos')
      
      if (!resposta.ok) {
        throw new Error('Falha ao buscar os dados do servidor')
      }
      
      const dados = await resposta.json()
      transacoes.value = dados
      
    } catch (e) {
      console.error(e)
      erro.value = 'Não foi possível conectar ao Moto G.'
    } finally {
      carregando.value = false
    }
  }

  return { transacoes, carregando, erro, buscarGastos }
})