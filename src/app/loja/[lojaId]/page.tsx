'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase'
import { Star, MessageSquare, CheckCircle, Phone, ChevronLeft, Calendar, User } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

type Atendimento = {
  id: string
  colaborador_nome: string
  status_ligacao: string
  nota_satisfacao: number
  nota_atendimento: number
  nota_produto: number
  nota_entrega: number
  observacoes: string
  atencao_necessaria: boolean
  data_ligacao: string
  clientes: {
    nome: string
    telefone: string
    pintor: string
    vendedor: string
  }
}

export default function LojaDetalhesPage() {
  const { lojaId } = useParams<{ lojaId: string }>()
  const [loja, setLoja] = useState<{ nome: string; cidade: string; grupo: string } | null>(null)
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [loading, setLoading] = useState(true)
  const [mesesDisponiveis, setMesesDisponiveis] = useState<string[]>([])
  const [mesSelecionado, setMesSelecionado] = useState(format(new Date(), 'yyyy-MM'))
  const [expandido, setExpandido] = useState<string | null>(null)

  useEffect(() => {
    async function loadLoja() {
      const supabase = createClient()
      const { data } = await supabase.from('lojas').select('nome, cidade, grupo').eq('id', lojaId).single()
      setLoja(data)

      const { data: meses } = await supabase
        .from('clientes')
        .select('mes_referencia')
        .eq('loja_id', lojaId)
      const mesesUnicos = [...new Set((meses || []).map(m => m.mes_referencia))].sort().reverse()
      setMesesDisponiveis(mesesUnicos)
      if (mesesUnicos.length > 0) setMesSelecionado(mesesUnicos[0])
    }
    loadLoja()
  }, [lojaId])

  useEffect(() => {
    loadAtendimentos()
  }, [lojaId, mesSelecionado])

  async function loadAtendimentos() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('atendimentos')
      .select('*, clientes(nome, telefone, pintor, vendedor)')
      .eq('loja_id', lojaId)
      .eq('status_ligacao', 'atendida')
      .gte('data_ligacao', mesSelecionado + '-01')
      .lte('data_ligacao', mesSelecionado + '-31')
      .order('data_ligacao', { ascending: false })
    setAtendimentos(data || [])
    setLoading(false)
  }

  function mesLabel(mes: string) {
    try { return format(parseISO(mes + '-01'), 'MMMM yyyy', { locale: ptBR }) } catch { return mes }
  }

  function Stars({ value, label }: { value: number; label: string }) {
    return (
      <div className="text-center">
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        <div className="flex gap-0.5 justify-center">
          {[1,2,3,4,5].map(n => (
            <Star key={n} size={12} className={n <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
          ))}
        </div>
        <p className="text-xs font-semibold text-gray-600 mt-0.5">{value || '—'}</p>
      </div>
    )
  }

  const mediaSatisfacao = atendimentos.length
    ? (atendimentos.reduce((s, a) => s + (a.nota_satisfacao || 0), 0) / atendimentos.length).toFixed(1)
    : '—'

  const comObservacao = atendimentos.filter(a => a.observacoes).length
  const comAtencao = atendimentos.filter(a => a.atencao_necessaria).length

  return (
    <AppLayout>
      <div className="p-8 max-w-3xl">
        {/* Voltar */}
        <Link href="/dashboard" className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-6 transition-colors">
          <ChevronLeft size={16} /> Voltar ao Dashboard
        </Link>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{loja?.nome}</h1>
              <p className="text-sm text-gray-400">{loja?.cidade} · {loja?.grupo}</p>
            </div>
            <Link href={`/ligacoes/${lojaId}`} className="btn-primary flex items-center gap-2 text-sm">
              <Phone size={14} /> Registrar ligações
            </Link>
          </div>
        </div>

        {/* Seletor de mês */}
        <div className="flex items-center gap-3 mb-5">
          <Calendar size={15} className="text-gray-400" />
          <select
            className="input w-auto text-sm py-1.5 capitalize"
            value={mesSelecionado}
            onChange={e => setMesSelecionado(e.target.value)}
          >
            {mesesDisponiveis.map(m => (
              <option key={m} value={m}>{mesLabel(m)}</option>
            ))}
          </select>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{atendimentos.length}</p>
            <p className="text-xs text-gray-400 mt-1">Atendidos</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-1">
              <Star size={18} className="text-amber-400" />{mediaSatisfacao}
            </p>
            <p className="text-xs text-gray-400 mt-1">Média geral</p>
          </div>
          <div className="card p-4 text-center">
            <p className={`text-2xl font-bold ${comAtencao > 0 ? 'text-red-500' : 'text-gray-900'}`}>{comAtencao}</p>
            <p className="text-xs text-gray-400 mt-1">Atenções</p>
          </div>
        </div>

        {/* Lista de atendimentos */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 text-sm">Avaliações registradas</h2>
            {comObservacao > 0 && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <MessageSquare size={12} /> {comObservacao} com observação
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-lidar-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : atendimentos.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <CheckCircle size={36} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Nenhuma avaliação registrada neste mês.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {atendimentos.map(a => (
                <div key={a.id} className={`rounded-xl border transition-all ${a.atencao_necessaria ? 'border-red-100 bg-red-50/30' : 'border-gray-100 bg-white'}`}>
                  {/* Linha principal */}
                  <button
                    onClick={() => setExpandido(expandido === a.id ? null : a.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50/50 rounded-xl transition-colors"
                  >
                    <div className="w-8 h-8 bg-lidar-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <User size={14} className="text-lidar-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-800 truncate">{a.clientes?.nome}</p>
                        {a.atencao_necessaria && <span className="text-red-500 text-xs">🚨</span>}
                        {a.observacoes && (
                          <span title="Tem observação" className="text-blue-400">
                            <MessageSquare size={13} />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{a.clientes?.telefone} · {format(new Date(a.data_ligacao), 'dd/MM/yyyy')}</p>
                    </div>

                    {/* Estrelas resumo */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} size={13} className={n <= (a.nota_satisfacao || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
                      ))}
                      <span className="text-xs text-gray-500 ml-1">{a.nota_satisfacao || '—'}</span>
                    </div>
                  </button>

                  {/* Expandido */}
                  {expandido === a.id && (
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                      {/* Notas por categoria */}
                      <div className="flex justify-around bg-gray-50 rounded-xl p-3">
                        <Stars value={a.nota_atendimento} label="Atendimento" />
                        <div className="w-px bg-gray-200" />
                        <Stars value={a.nota_produto} label="Produto" />
                        <div className="w-px bg-gray-200" />
                        <Stars value={a.nota_entrega} label="Entrega" />
                      </div>

                      {/* Info extra */}
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        {a.clientes?.vendedor && <span>👤 Vendedor: <strong>{a.clientes.vendedor}</strong></span>}
                        {a.clientes?.pintor && <span>🖌 Pintor: <strong>{a.clientes.pintor}</strong></span>}
                        {a.colaborador_nome && <span>📞 Ligou: <strong>{a.colaborador_nome}</strong></span>}
                      </div>

                      {/* Observação */}
                      {a.observacoes && (
                        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                          <MessageSquare size={13} className="text-blue-400 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-blue-700 italic">"{a.observacoes}"</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
