import type { Transacao } from '../stores/gastos'

export const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export function agregarUltimosMeses(transacoes: Transacao[], quantidade: number) {
  const hoje = new Date()
  const buckets: { chave: string; rotulo: string; total: number }[] = []

  for (let i = quantidade - 1; i >= 0; i--) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    buckets.push({ chave: `${data.getFullYear()}-${data.getMonth()}`, rotulo: MESES_ABREV[data.getMonth()]!, total: 0 })
  }

  const porChave = new Map(buckets.map((b) => [b.chave, b]))

  transacoes.forEach((t) => {
    const data = new Date(t.data)
    const bucket = porChave.get(`${data.getFullYear()}-${data.getMonth()}`)
    if (bucket) bucket.total += Number(t.valor)
  })

  return buckets
}
