import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export interface Transacao {
  id: number | string
  telefone: string
  descricao: string
  valor: number | string
  data: string | Date
}

export const useGastosStore = defineStore('gastos', () => {
  // Estado: Onde vamos guardar a lista que vier do servidor
  const transacoes = ref<Transacao[]>([])
  const carregando = ref(false)
  const erro = ref<string | null>(null)

  // Computed: Total de gastos formatado
  const totalGastos = computed(() => {
    const total = transacoes.value.reduce((acc, t) => acc + Number(t.valor), 0)
    return total.toFixed(2).replace('.', ',')
  })

  // Ação: Busca os gastos filtrados por número de telefone
  const buscarGastos = async (telefone: string) => {
    carregando.value = true
    erro.value = null
    
    try {
      // Substitua pelo IP real do seu Moto G se ele mudar
      const resposta = await fetch(`http://192.168.1.189:3000/gastos/${telefone}`)
      
      if (!resposta.ok) {
        throw new Error('Falha ao buscar os dados do servidor')
      }
      
      const dados = await resposta.json()
      transacoes.value = dados
      
    } catch (e) {
      console.error(e)
      erro.value = 'Não foi possível conectar ao servidor.'
    } finally {
      carregando.value = false
    }
  }

  return { transacoes, carregando, erro, totalGastos, buscarGastos }
})