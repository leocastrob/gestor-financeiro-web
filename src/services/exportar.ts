import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Transacao } from '../stores/gastos'
import { formatarMoeda } from '../utils/formatarMoeda'
import { MESES } from '../constants/meses'

function nomeArquivo(mes: number, ano: number, extensao: string): string {
  return `gastos-${ano}-${String(mes).padStart(2, '0')}.${extensao}`
}

function baixarBlob(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  link.click()
  URL.revokeObjectURL(url)
}

// Função pura: monta o texto CSV a partir das transações, sem tocar em DOM.
// Separador ";" (não ",") porque o Excel em pt-BR usa vírgula como separador
// decimal e trataria uma vírgula de coluna como parte do número.
export function gerarCsv(transacoes: Transacao[]): string {
  const cabecalho = ['Data', 'Descrição', 'Categoria', 'Valor']
  const linhas = transacoes.map((t) => [
    new Date(t.data).toLocaleDateString('pt-BR'),
    t.descricao,
    t.categoria || 'Outros',
    Number(t.valor).toFixed(2).replace('.', ','),
  ])
  const escapar = (campo: string) => `"${campo.replace(/"/g, '""')}"`
  return [cabecalho, ...linhas].map((linha) => linha.map(escapar).join(';')).join('\r\n')
}

export function exportarCsv(transacoes: Transacao[], mes: number, ano: number) {
  const csv = gerarCsv(transacoes)
  // BOM (﻿) para o Excel reconhecer UTF-8 e não corromper acentos
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  baixarBlob(blob, nomeArquivo(mes, ano, 'csv'))
}

export function exportarPdf(transacoes: Transacao[], mes: number, ano: number) {
  const doc = new jsPDF()
  const total = transacoes.reduce((acc, t) => acc + Number(t.valor), 0)

  doc.setFontSize(14)
  doc.text(`Gestor Financeiro — ${MESES[mes - 1]} de ${ano}`, 14, 16)
  doc.setFontSize(10)
  doc.text(`Total: ${formatarMoeda(total)} · ${transacoes.length} lançamento(s)`, 14, 23)

  autoTable(doc, {
    startY: 28,
    head: [['Data', 'Descrição', 'Categoria', 'Valor']],
    body: transacoes.map((t) => [
      new Date(t.data).toLocaleDateString('pt-BR'),
      t.descricao,
      t.categoria || 'Outros',
      formatarMoeda(t.valor),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [16, 185, 129] },
  })

  doc.save(nomeArquivo(mes, ano, 'pdf'))
}
