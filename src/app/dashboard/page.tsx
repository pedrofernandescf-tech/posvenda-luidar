'use client'
import { useEffect, useState, useRef } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle, Clock, Phone, TrendingUp, AlertTriangle, Store, ChevronDown, X, Calendar } from 'lucide-react'

type ResumoLoja = {
  loja_id: string
  loja_nome: string
  cidade: string
  grupo: string
  mes_referencia: string
  total_clientes: number
  total_atendidos: number
  total_pendentes: number
  media_satisfacao: number
  meta_atingida: boolean
}

export default function DashboardPage() {
  const [todosResumos, setTodosResumos] = useState<ResumoLoja[]>([])
  const [mesesDisponiveis, setMesesDisponiveis] = useState<string[]>([])
  const [mesesSelecionados, setMesesSelecionados] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selecionadas, setSelecionadas] = useState<string[]>([])
  const [dropdownLojas, setDropdownLojas] = useState(false)
  const [dropdownMeses, setDropdownMeses] = useState(false)
  const [busca, setBusca] = useState('')
  const refLojas = useRef<HTMLDivElement>(null)
  const refMeses = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from('resumo_lojas').select('*').order('mes_referencia', { ascending: false })
      const resumos = data || []
      setTodosResumos(resumos)

      const meses = [...new Set(resumos.map(r => r.mes_referencia))].sort().reverse()
      setMesesDisponiveis(meses)
      if (meses.length > 0) setMesesSelecionados([meses[0]])
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (refLojas.current && !refLojas.current.contains(e.target as Node)) setDropdownLojas(false)
      if (refMeses.current && !refMeses.current.contains(e.target as Node)) setDropdownMeses(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggleMes(mes: string) {
    setMesesSelecionados(prev => prev.includes(mes) ? prev.filter(m => m !== mes) : [...prev, mes])
  }

  function toggleLoja(id: string) {
    setSelecionadas(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  function mesLabel(mes: string) {
    try { return format(parseISO(mes + '-01'), 'MMMM yyyy', { locale: ptBR }) } catch { return mes }
  }

  // Filtrar por meses selecionados
  const resumosPorMes = mesesSelecionados.length === 0
    ? todosResumos
    : todosResumos.filter(r => mesesSelecionados.includes(r.mes_referencia))

  // Consolidar por loja (soma dos meses selecionados)
  const resumosConsolidados = Object.values(
    resumosPorMes.reduce((acc, r) => {
      if (!acc[r.loja_id]) {
        acc[r.loja_id] = { ...r, total_atendidos: 0, total_clientes: 0 }
      }
      acc[r.loja_id].total_atendidos += r.total_atendidos || 0
      acc[r.loja_id].total_clientes += r.total_clientes || 0
      return acc
    }, {} as Record<string, ResumoLoja>)
  )

  // Filtrar por lojas selecionadas
  const resumosFiltrados = selecionadas.length === 0
    ? resumosConsolidados
    : resumosConsolidados.filter(r => selecionadas.includes(r.loja_id))

  const lojasBusca = resumosConsolidados.filter(r =>
    r.loja_nome.toLowerCase().includes(busca.toLowerCase()) ||
    r.grupo.toLowerCase().includes(busca.toLowerCase())
  )

  const grupos = resumosConsolidados.reduce((acc, r) => {
    if (!acc[r.grupo]) acc[r.grupo] = []
    acc[r.grupo].push(r)
    return acc
  }, {} as Record<string, ResumoLoja[]>)

  const totalAtendidos = resumosFiltrados.reduce((s, r) => s + (r.total_atendidos || 0), 0)
  const lojasComMeta = resumosFiltrados.filter(r => r.meta_atingida).length
  const lojasSemMeta = resumosFiltrados.filter(r => !r.meta_atingida).length
  const mediaSatisfacao = resumosFiltrados.filter(r => r.media_satisfacao).length
    ? (resumosFiltrados.reduce((s, r) => s + (r.media_satisfacao || 0), 0) / resumosFiltrados.filter(r => r.media_satisfacao).length).toFixed(1)
    : '—'

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {mesesSelecionados.length === 0 ? 'Todos os meses' : mesesSelecionados.map(m => mesLabel(m)).join(' + ')}
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-6">

          {/* Seletor de meses */}
          <div className="relative" ref={refMeses}>
            <button onClick={() => setDropdownMeses(!dropdownMeses)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-lidar-300 transition-colors shadow-sm">
              <Calendar size={15} className="text-gray-400" />
              <span>{mesesSelecionados.length === 0 ? 'Todos os meses' : `${mesesSelecionados.length} mês${mesesSelecionados.length > 1 ? 'es' : ''}`}</span>
              <ChevronDown size={15} className={`text-gray-400 transition-transform ${dropdownMeses ? 'rotate-180' : ''}`} />
            </button>

            {dropdownMeses && (
              <div className="absolute left-0 top-12 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="p-2">
                  <button onClick={() => setMesesSelecionados([])}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${mesesSelecionados.length === 0 ? 'bg-lidar-50 text-lidar-700 font-medium' : 'hover:bg-gray-50 text-gray-600'}`}>
                    Todos os meses
                  </button>
                  {mesesDisponiveis.map(mes => (
                    <button key={mes} onClick={() => toggleMes(mes)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${mesesSelecionados.includes(mes) ? 'bg-lidar-600 border-lidar-600' : 'border-gray-300'}`}>
                        {mesesSelecionados.includes(mes) && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm text-gray-700 capitalize">{mesLabel(mes)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Seletor de lojas */}
          <div className="relative" ref={refLojas}>
            <button onClick={() => setDropdownLojas(!dropdownLojas)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-lidar-300 transition-colors shadow-sm">
              <Store size={15} className="text-gray-400" />
              <span>{selecionadas.length === 0 ? 'Todas as lojas' : `${selecionadas.length} loja${selecionadas.length > 1 ? 's' : ''}`}</span>
              <ChevronDown size={15} className={`text-gray-400 transition-transform ${dropdownLojas ? 'rotate-180' : ''}`} />
            </button>

            {dropdownLojas && (
              <div className="absolute left-0 top-12 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="p-3 border-b border-gray-100">
                  <input className="input text-sm py-1.5" placeholder="Buscar loja..." value={busca} onChange={e => setBusca(e.target.value)} autoFocus />
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {busca === '' ? Object.entries(grupos).map(([grupo, lojasGrupo]) => (
                    <div key={grupo}>
                      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: grupo === 'Luidar Tintas' ? '#16a34a' : '#0ea5e9' }} />
                        <span className="text-xs font-semibold text-gray-600 flex-1">{grupo}</span>
                      </div>
                      {lojasGrupo.map(loja => (
                        <button key={loja.loja_id} onClick={() => toggleLoja(loja.loja_id)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selecionadas.includes(loja.loja_id) ? 'bg-lidar-600 border-lidar-600' : 'border-gray-300'}`}>
                            {selecionadas.includes(loja.loja_id) && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          </div>
                          <span className="text-sm text-gray-700 flex-1">{loja.loja_nome}</span>
                          {loja.meta_atingida && <CheckCircle size={12} className="text-green-500" />}
                        </button>
                      ))}
                    </div>
                  )) : lojasBusca.map(loja => (
                    <button key={loja.loja_id} onClick={() => toggleLoja(loja.loja_id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selecionadas.includes(loja.loja_id) ? 'bg-lidar-600 border-lidar-600' : 'border-gray-300'}`}>
                        {selecionadas.includes(loja.loja_id) && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700">{loja.loja_nome}</p>
                        <p className="text-xs text-gray-400">{loja.grupo}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="p-3 border-t border-gray-100 flex justify-between">
                  <button onClick={() => setSelecionadas([])} className="text-xs text-gray-400 hover:text-red-500">Limpar</button>
                  <button onClick={() => setDropdownLojas(false)} className="text-xs text-lidar-600 font-medium">Aplicar</button>
                </div>
              </div>
            )}
          </div>

          {/* Tags ativas */}
          {(selecionadas.length > 0 || mesesSelecionados.length > 0) && (
            <button onClick={() => { setSelecionadas([]); setMesesSelecionados([]) }}
              className="flex items-center gap-1 px-3 py-2 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-100">
              <X size={12} /> Limpar filtros
            </button>
          )}
        </div>

        {/* Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<CheckCircle className="text-green-500" size={22} />} label="Lojas com meta" value={lojasComMeta} sub={`de ${resumosFiltrados.length} lojas`} />
          <StatCard icon={<Clock className="text-amber-500" size={22} />} label="Lojas pendentes" value={lojasSemMeta} sub="ainda em andamento" />
          <StatCard icon={<Phone className="text-lidar-600" size={22} />} label="Total atendidos" value={totalAtendidos} sub="ligações registradas" />
          <StatCard icon={<TrendingUp className="text-purple-500" size={22} />} label="Média satisfação" value={mediaSatisfacao} sub="de 5 pontos" />
        </div>

        {/* Lista */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Store size={18} className="text-gray-400" />
            <h2 className="font-semibold text-gray-800">Status por Loja</h2>
            <span className="text-xs text-gray-400">({resumosFiltrados.length})</span>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-lidar-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : resumosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-gray-400"><Store size={40} className="mx-auto mb-3 opacity-30" /><p className="text-sm">Nenhum dado encontrado.</p></div>
          ) : (
            <div className="space-y-2">
              {resumosFiltrados.sort((a, b) => (b.total_atendidos || 0) - (a.total_atendidos || 0)).map(loja => <LojaRow key={loja.loja_id} loja={loja} />)}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        {icon}
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  )
}

function LojaRow({ loja }: { loja: ResumoLoja }) {
  const atendidos = loja.total_atendidos || 0
  const pct = Math.min((atendidos / 5) * 100, 100)
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: loja.grupo === 'Luidar Tintas' ? '#16a34a' : '#0ea5e9' }} />
      <div className="flex-shrink-0">
        {loja.meta_atingida ? <span className="badge-meta">✅ Meta</span> : atendidos >= 3 ? <span className="badge-pendente">⚡ Quase</span> : <span className="badge-pendente">⏳ Andamento</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-800 truncate">{loja.loja_nome}</span>
          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{atendidos}/5</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: loja.meta_atingida ? '#22c55e' : loja.grupo === 'Luidar Tintas' ? '#16a34a' : '#0ea5e9' }} />
        </div>
      </div>
      {loja.media_satisfacao ? <span className="text-sm font-semibold text-gray-700 flex-shrink-0">⭐ {Number(loja.media_satisfacao).toFixed(1)}</span> : null}
      {!loja.meta_atingida && atendidos < 3 && <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />}
    </div>
  )
}
