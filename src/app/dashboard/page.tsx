'use client'
import { useEffect, useState, useRef } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle, Clock, Phone, TrendingUp, AlertTriangle, Store, ChevronDown, X } from 'lucide-react'

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
  const [resumos, setResumos] = useState<ResumoLoja[]>([])
  const [loading, setLoading] = useState(true)
  const [selecionadas, setSelecionadas] = useState<string[]>([]) // IDs das lojas selecionadas
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const mesAtual = format(new Date(), 'yyyy-MM')
  const mesFormatado = format(new Date(), 'MMMM yyyy', { locale: ptBR })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('resumo_lojas')
        .select('*')
        .eq('mes_referencia', mesAtual)
      setResumos(data || [])
      setLoading(false)
    }
    load()
  }, [mesAtual])

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggleLoja(id: string) {
    setSelecionadas(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  function selecionarGrupo(grupo: string) {
    const idsGrupo = resumos.filter(r => r.grupo === grupo).map(r => r.loja_id)
    const todasJaSelecionadas = idsGrupo.every(id => selecionadas.includes(id))
    if (todasJaSelecionadas) {
      setSelecionadas(prev => prev.filter(id => !idsGrupo.includes(id)))
    } else {
      setSelecionadas(prev => [...new Set([...prev, ...idsGrupo])])
    }
  }

  function limparSelecao() {
    setSelecionadas([])
  }

  // Lojas a exibir: se nenhuma selecionada, mostra todas
  const resumosFiltrados = selecionadas.length === 0
    ? resumos
    : resumos.filter(r => selecionadas.includes(r.loja_id))

  // Lojas filtradas pela busca no dropdown
  const lojasBusca = resumos.filter(r =>
    r.loja_nome.toLowerCase().includes(busca.toLowerCase()) ||
    r.grupo.toLowerCase().includes(busca.toLowerCase())
  )

  // Grupos para o dropdown
  const grupos = resumos.reduce((acc, r) => {
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
        {/* Header */}
        <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1 capitalize">Mês de referência: {mesFormatado}</p>
          </div>

          {/* Seletor de lojas */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownAberto(!dropdownAberto)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-lidar-300 transition-colors shadow-sm min-w-52"
            >
              <Store size={15} className="text-gray-400" />
              <span className="flex-1 text-left">
                {selecionadas.length === 0
                  ? 'Todas as lojas'
                  : `${selecionadas.length} loja${selecionadas.length > 1 ? 's' : ''} selecionada${selecionadas.length > 1 ? 's' : ''}`
                }
              </span>
              <ChevronDown size={15} className={`text-gray-400 transition-transform ${dropdownAberto ? 'rotate-180' : ''}`} />
            </button>

            {/* Tags das lojas selecionadas */}
            {selecionadas.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 max-w-md">
                {selecionadas.slice(0, 3).map(id => {
                  const loja = resumos.find(r => r.loja_id === id)
                  return loja ? (
                    <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-lidar-50 text-lidar-700 text-xs rounded-full border border-lidar-100">
                      {loja.loja_nome}
                      <button onClick={() => toggleLoja(id)} className="hover:text-lidar-900">
                        <X size={10} />
                      </button>
                    </span>
                  ) : null
                })}
                {selecionadas.length > 3 && (
                  <span className="text-xs text-gray-400 self-center">+{selecionadas.length - 3} mais</span>
                )}
                <button onClick={limparSelecao} className="text-xs text-red-400 hover:text-red-600 self-center ml-1">
                  Limpar
                </button>
              </div>
            )}

            {/* Dropdown */}
            {dropdownAberto && (
              <div className="absolute right-0 top-12 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                {/* Busca */}
                <div className="p-3 border-b border-gray-100">
                  <input
                    className="input text-sm py-1.5"
                    placeholder="Buscar loja..."
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {busca === '' ? (
                    // Mostrar por grupos
                    Object.entries(grupos).map(([grupo, lojasGrupo]) => (
                      <div key={grupo}>
                        {/* Header do grupo */}
                        <button
                          onClick={() => selecionarGrupo(grupo)}
                          className="w-full flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                        >
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: grupo === 'Luidar Tintas' ? '#16a34a' : '#0ea5e9' }}
                          />
                          <span className="text-xs font-semibold text-gray-600 flex-1">{grupo}</span>
                          <span className="text-xs text-gray-400">
                            {lojasGrupo.filter(l => selecionadas.includes(l.loja_id)).length}/{lojasGrupo.length}
                          </span>
                        </button>
                        {/* Lojas do grupo */}
                        {lojasGrupo.map(loja => (
                          <button
                            key={loja.loja_id}
                            onClick={() => toggleLoja(loja.loja_id)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                          >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              selecionadas.includes(loja.loja_id)
                                ? 'bg-lidar-600 border-lidar-600'
                                : 'border-gray-300'
                            }`}>
                              {selecionadas.includes(loja.loja_id) && (
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className="text-sm text-gray-700 flex-1">{loja.loja_nome}</span>
                            {loja.meta_atingida && <CheckCircle size={12} className="text-green-500 flex-shrink-0" />}
                          </button>
                        ))}
                      </div>
                    ))
                  ) : (
                    // Resultado da busca
                    lojasBusca.map(loja => (
                      <button
                        key={loja.loja_id}
                        onClick={() => toggleLoja(loja.loja_id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          selecionadas.includes(loja.loja_id) ? 'bg-lidar-600 border-lidar-600' : 'border-gray-300'
                        }`}>
                          {selecionadas.includes(loja.loja_id) && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700">{loja.loja_nome}</p>
                          <p className="text-xs text-gray-400">{loja.grupo}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* Rodapé */}
                <div className="p-3 border-t border-gray-100 flex justify-between">
                  <button onClick={limparSelecao} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                    Limpar seleção
                  </button>
                  <button onClick={() => setDropdownAberto(false)} className="text-xs text-lidar-600 font-medium hover:text-lidar-700">
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cards de indicadores */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<CheckCircle className="text-green-500" size={22} />} label="Lojas com meta" value={lojasComMeta} sub={`de ${resumosFiltrados.length} lojas`} />
          <StatCard icon={<Clock className="text-amber-500" size={22} />} label="Lojas pendentes" value={lojasSemMeta} sub="ainda em andamento" />
          <StatCard icon={<Phone className="text-lidar-600" size={22} />} label="Total atendidos" value={totalAtendidos} sub="ligações registradas" />
          <StatCard icon={<TrendingUp className="text-purple-500" size={22} />} label="Média satisfação" value={mediaSatisfacao} sub="de 5 pontos" />
        </div>

        {/* Lista de lojas */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Store size={18} className="text-gray-400" />
            <h2 className="font-semibold text-gray-800">Status por Loja</h2>
            <span className="text-xs text-gray-400 ml-1">({resumosFiltrados.length} lojas)</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-lidar-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : resumosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Store size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum dado para este mês ainda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {resumosFiltrados
                .sort((a, b) => (b.total_atendidos || 0) - (a.total_atendidos || 0))
                .map(loja => <LojaRow key={loja.loja_id} loja={loja} />)}
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
  const pct = Math.min((atendidos / 10) * 100, 100)
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: loja.grupo === 'Luidar Tintas' ? '#16a34a' : '#0ea5e9' }} />
      <div className="flex-shrink-0">
        {loja.meta_atingida ? <span className="badge-meta">✅ Meta</span> : atendidos >= 7 ? <span className="badge-pendente">⚡ Quase</span> : <span className="badge-pendente">⏳ Andamento</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-800 truncate">{loja.loja_nome}</span>
          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{atendidos}/10</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: loja.meta_atingida ? '#22c55e' : loja.grupo === 'Luidar Tintas' ? '#16a34a' : '#0ea5e9' }} />
        </div>
      </div>
      {loja.media_satisfacao ? <span className="text-sm font-semibold text-gray-700 flex-shrink-0">⭐ {Number(loja.media_satisfacao).toFixed(1)}</span> : null}
      {!loja.meta_atingida && atendidos < 5 && <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />}
    </div>
  )
}
