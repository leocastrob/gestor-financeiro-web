import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import * as api from '../services/api'
import type { DadosEdicaoGasto, DadosNovoGasto } from '../services/api'
import { formatarMoeda } from '../utils/formatarMoeda'

export interface Transacao {
  id: number | string
  telefone: string
  descricao: string
  categoria: string
  valor: number | string
  data: string | Date
  tipo: 'despesa' | 'receita'
}

export { CATEGORIAS } from '../theme/categorias'

export const useGastosStore = defineStore('gastos', () => {
  // Inicializa o telefone buscando do localStorage se existir
  const telefone = ref<string>(localStorage.getItem('gestor_telefone') || '')

  // Observa qualquer mudança no telefone para salvar no localStorage
  watch(telefone, (novoValor) => {
    if (novoValor) {
      localStorage.setItem('gestor_telefone', novoValor)
    } else {
      localStorage.removeItem('gestor_telefone')
    }
  })

  // Mês/ano em exibição — compartilhado entre as abas Dashboard e Lançamentos
  const hoje = new Date()
  const filtroMes = ref(hoje.getMonth() + 1)
  const filtroAno = ref(hoje.getFullYear())

  const mesAnterior = () => {
    if (filtroMes.value === 1) {
      filtroMes.value = 12
      filtroAno.value -= 1
    } else {
      filtroMes.value -= 1
    }
  }

  const proximoMes = () => {
    if (filtroMes.value === 12) {
      filtroMes.value = 1
      filtroAno.value += 1
    } else {
      filtroMes.value += 1
    }
  }

  // Refaz a busca sempre que o mês ou ano em exibição mudar
  watch([filtroMes, filtroAno], () => {
    buscarGastos(filtroMes.value, filtroAno.value)
  })

  // Estado
  const transacoes = ref<Transacao[]>([])
  const carregando = ref(false)
  const erro = ref<string | null>(null)
  // Erro de uma ação pontual (excluir/editar) — exibido como banner dispensável, não bloqueia a tela
  const erroAcao = ref<string | null>(null)

  // Computed: totais de despesas, receitas, saldo e formatações para exibição
  const totalGastosNumerico = computed(() =>
    transacoesVisiveis.value
      .filter((t) => t.tipo === 'despesa')
      .reduce((acc, t) => acc + Number(t.valor), 0),
  )
  const totalReceitasNumerico = computed(() =>
    transacoesVisiveis.value
      .filter((t) => t.tipo === 'receita')
      .reduce((acc, t) => acc + Number(t.valor), 0),
  )
  const saldoNumerico = computed(() => totalReceitasNumerico.value - totalGastosNumerico.value)
  const totalGastos = computed(() => formatarMoeda(totalGastosNumerico.value))
  const totalReceitas = computed(() => formatarMoeda(totalReceitasNumerico.value))
  const saldo = computed(() => formatarMoeda(saldoNumerico.value))

  // Define o telefone do usuário logado
  const setTelefone = (num: string) => {
    telefone.value = num
  }

  // Ação: Busca os gastos filtrados por número de telefone e data
  const buscarGastos = async (mes?: number, ano?: number) => {
    if (!telefone.value) return

    carregando.value = true
    erro.value = null

    try {
      transacoes.value = await api.buscarGastos(telefone.value, mes, ano)
    } catch (e) {
      console.error(e)
      erro.value = 'Não foi possível conectar ao servidor.'
    } finally {
      carregando.value = false
    }
  }

  // Ação: Cria um gasto novo direto pelo portal (mesmo caminho de dados do WhatsApp).
  // Retorna o registro criado (com categoria já resolvida) ou null em caso de erro.
  const criarGasto = async (dados: DadosNovoGasto): Promise<Transacao | null> => {
    erroAcao.value = null
    try {
      return await api.criarGasto(telefone.value, dados)
    } catch (e) {
      console.error(e)
      erroAcao.value = e instanceof Error ? e.message : 'Erro ao adicionar o gasto. Tente novamente.'
      return null
    }
  }

  // Exclusão com desfazer: o item some da lista visível na hora, mas só é
  // excluído de verdade na API depois de um tempo de graça sem "Desfazer".
  const idsExcluindo = ref<(number | string)[]>([])
  const timersExclusao = new Map<number | string, ReturnType<typeof setTimeout>>()
  const TEMPO_DE_GRACA_MS = 5000

  const transacoesVisiveis = computed(() =>
    transacoes.value.filter((t) => !idsExcluindo.value.includes(t.id)),
  )

  const excluirDeVerdade = async (id: number | string) => {
    timersExclusao.delete(id)
    erroAcao.value = null
    try {
      await api.excluirGasto(id, telefone.value)
      transacoes.value = transacoes.value.filter((t) => t.id !== id)
      idsExcluindo.value = idsExcluindo.value.filter((i) => i !== id)
    } catch (e) {
      console.error(e)
      idsExcluindo.value = idsExcluindo.value.filter((i) => i !== id)
      erroAcao.value = 'Erro ao excluir o gasto. Tente novamente.'
    }
  }

  const marcarParaExcluir = (id: number | string) => {
    idsExcluindo.value = [...idsExcluindo.value, id]
    const timer = setTimeout(() => excluirDeVerdade(id), TEMPO_DE_GRACA_MS)
    timersExclusao.set(id, timer)
  }

  const desfazerExclusao = (id: number | string) => {
    const timer = timersExclusao.get(id)
    if (timer) {
      clearTimeout(timer)
      timersExclusao.delete(id)
    }
    idsExcluindo.value = idsExcluindo.value.filter((i) => i !== id)
  }

  // Ação: Edita descrição/categoria/valor de um gasto
  const editarGasto = async (id: number | string, dados: DadosEdicaoGasto) => {
    erroAcao.value = null
    try {
      await api.editarGasto(id, telefone.value, dados)
      const item = transacoes.value.find((t) => t.id === id)
      if (item) Object.assign(item, dados)
      return true
    } catch (e) {
      console.error(e)
      erroAcao.value = 'Erro ao editar o gasto. Tente novamente.'
      return false
    }
  }

  const logout = () => {
    telefone.value = ''
    transacoes.value = []
  }

  return {
    transacoes,
    carregando,
    erro,
    erroAcao,
    telefone,
    filtroMes,
    filtroAno,
    mesAnterior,
    proximoMes,
    totalGastos,
    totalGastosNumerico,
    totalReceitas,
    totalReceitasNumerico,
    saldo,
    saldoNumerico,
    setTelefone,
    buscarGastos,
    criarGasto,
    transacoesVisiveis,
    marcarParaExcluir,
    desfazerExclusao,
    editarGasto,
    logout,
  }
})
