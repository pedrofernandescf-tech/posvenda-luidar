'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Download, BarChart2, Star, AlertTriangle } from 'lucide-react'
import * as XLSX from 'xlsx'

type ResumoLoja = {
  loja_id: string
  loja_nome: string
  cidade: string
  total_clientes: number
  total_atendidos: number
  media_satisfacao: number
  meta_atingida: boolean
}

type Atendimento = {
  id: string
  colaborador_nome: string
  status_ligacao: string
  nota_satisfacao: number
  bem_atendido: boolean
  voltaria_comprar: string
  observacoes: string
  atencao_necessaria: boolean
  data_ligacao: string
  clientes: { nome: string; telefone: string; lojas: { nome: string } }
}

export default function RelatoriosPage() {
  const [resumos, setResumos] = useState<ResumoLoja[]>([])
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [mes, setMes] = useState(format(new Date(), 'yyyy-MM'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const supabase = createClient()
      const [{ data: r }, { data: a }] = await Promise.all([
        supabase.from('resumo_lojas').select('*').eq('mes_referencia', mes),
        supabase.from('atendimentos')
          .select('*, clientes(nome, telefone, lojas(nome))')
          .gte('data_ligacao', mes + '-01')
          .lte('data_ligacao', mes + '-31')
          .order('data_ligacao', { ascending: false }),
      ])
      setResumos(r || [])
      setAtendimentos(a || [])
      setLoading(false)
    }
    load()
  }, [mes])

  function exportarExcel() {
    const wb = XLSX.utils.book_new()

    // Aba resumo
    const resumoData = resumos.map(r => ({
      'Loja': r.loja_nome,
      'Cidade': r.cidade,
      'Total Clientes': r.total_clientes,
      'Atendidos': r.total_atendidos,
      'Média Satisfação': r.media_satisfacao || '—',
      'Meta Atingida': r.meta_atingida ? 'Sim' : 'Não',
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumoData), 'Resumo Lojas')

    // Aba detalhado
    const detData = atendimentos.map(a => ({
      'Cliente': a.clientes?.nome,
      'Loja': a.clientes?.lojas?.nome,
      'Colaborador': a.colaborador_nome,
      'Status': a.status_ligacao,
      'Nota': a.nota_satisfacao || '—',
      'Bem atendido': a.bem_atendido === true ? 'Sim' : a.bem_atendido === false ? 'Não' : '—',
      'Voltaria comprar': a.voltaria_comprar || '—',
      'Atenção': a.atencao_necessaria ? '🚨 Sim' : 'Não',
      'Observações': a.observacoes || '',
      'Data': format(new Date(a.data_ligacao), 'dd/MM/yyyy HH:mm'),
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detData), 'Atendimentos')

    XLSX.writeFile(wb, `posVenda_${mes}.xlsx`)
  }

  const totalAtendidos = resumos.reduce((s, r) => s + (r.total_atendidos || 0), 0)
  const lojasComMeta = resumos.filter(r => r.meta_atingida).length
  const mediaGeral = resumos.length
    ? (resumos.reduce((s, r) => s + (r.media_satisfacao || 0), 0) / resumos.filter(r => r.media_satisfacao).length).toFixed(1)
    : '—'
  const atencoes = atendimentos.filter(a => a.atencao_necessaria).length
  const mesLabel = format(new Date(mes + '-01'), 'MMMM yyyy', { locale: ptBR })

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
            <p className="text-sm text-gray-500 mt-1 capitalize">{mesLabel}</p>
          </div>
          <div className="flex items-center gap-3">
            <input type="month" className="input w-auto" value={mes} onChange={e => setMes(e.target.value)} />
            <button onClick={exportarExcel} className="btn-secondary flex items-center gap-2">
              <Download size={15} /> Exportar Excel
            </button>
          </div>
        </div>

        {/* Cards resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{lojasComMeta}/{resumos.length}</p>
            <p className="text-xs text-gray-400 mt-1">Lojas com meta</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{totalAtendidos}</p>
            <p className="text-xs text-gray-400 mt-1">Total atendidos</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-1">
              <Star size={18} className="text-amber-400" />{mediaGeral}
            </p>
            <p className="text-xs text-gray-400 mt-1">Média satisfação</p>
          </div>
          <div className="card p-4 text-center">
            <p className={`text-2xl font-bold ${atencoes > 0 ? 'text-red-500' : 'text-gray-900'}`}>{atencoes}</p>
            <p className="text-xs text-gray-400 mt-1">Atenções necessárias</p>
          </div>
        </div>

        {/* Tabela por loja */}
        <div className="card p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={16} className="text-gray-400" />
            <h2 className="font-semibold text-gray-800 text-sm">Resultado por loja</h2>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-lidar-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-xs text-gray-400 font-medium">Loja</th>
                  <th className="text-center py-2 text-xs text-gray-400 font-medium">Atendidos</th>
                  <th className="text-center py-2 text-xs text-gray-400 font-medium">Satisfação</th>
                  <th className="text-center py-2 text-xs text-gray-400 font-medium">Meta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {resumos
                  .sort((a, b) => (b.total_atendidos || 0) - (a.total_atendidos || 0))
                  .map(r => (
                    <tr key={r.loja_id} className="hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-800">{r.loja_nome}<span className="text-xs text-gray-400 ml-1">· {r.cidade}</span></td>
                      <td className="py-3 text-center text-gray-600">{r.total_atendidos || 0}/5</td>
                      <td className="py-3 text-center">
                        {r.media_satisfacao ? (
                          <span className="flex items-center justify-center gap-1">
                            <Star size={12} className="text-amber-400" />
                            {Number(r.media_satisfacao).toFixed(1)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-3 text-center">
                        {r.meta_atingida ? <span className="badge-meta">✅ Sim</span> : <span className="badge-pendente">⏳ Não</span>}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Atenções */}
        {atendimentos.filter(a => a.atencao_necessaria).length > 0 && (
          <div className="card p-5 border-red-100">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={16} className="text-red-500" />
              <h2 className="font-semibold text-gray-800 text-sm">🚨 Atenção necessária</h2>
            </div>
            <div className="space-y-2">
              {atendimentos.filter(a => a.atencao_necessaria).map(a => (
                <div key={a.id} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{a.clientes?.nome}</p>
                    <p className="text-xs text-gray-500">{a.clientes?.lojas?.nome} · Nota: {a.nota_satisfacao}</p>
                    {a.observacoes && <p className="text-xs text-gray-600 mt-1 italic">"{a.observacoes}"</p>}
                  </div>
                  <span className="text-xs text-gray-400">{format(new Date(a.data_ligacao), 'dd/MM')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
