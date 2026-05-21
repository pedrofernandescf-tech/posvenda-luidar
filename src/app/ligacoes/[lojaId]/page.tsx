'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase'
import { Phone, CheckCircle, ChevronDown, ChevronUp, Star, User, Search, ChevronLeft, ChevronRight, Calendar, Trash2, AlertTriangle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Cliente = {
  id: string
  nome: string
  telefone: string
  cpf?: string
  pintor?: string
  vendedor?: string
  status: string
}

type Avaliacao = {
  status_ligacao: string
  nota_atendimento: number
  nota_produto: number
  nota_entrega: number
  observacoes: string
}

const defaultAvaliacao: Avaliacao = {
  status_ligacao: '',
  nota_atendimento: 0,
  nota_produto: 0,
  nota_entrega: 0,
  observacoes: '',
}

export default function LigacoesPage() {
  const { lojaId } = useParams<{ lojaId: string }>()
  const [loja, setLoja] = useState<{ nome: string; cidade: string } | null>(null)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [totalAtendidos, setTotalAtendidos] = useState(0)
  const [aberto, setAberto] = useState<string | null>(null)
  const [avaliacoes, setAvaliacoes] = useState<Record<string, Avaliacao>>({})
  const [salvando, setSalvando] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [mesesDisponiveis, setMesesDisponiveis] = useState<string[]>([])
  const [mesSelecionado, setMesSelecionado] = useState(format(new Date(), 'yyyy-MM'))
  const [confirmandoApagar, setConfirmandoApagar] = useState(false)
  const [apagando, setApagando] = useState(false)
  const [msgSucesso, setMsgSucesso] = useState('')

  useEffect(() => {
    async function loadLoja() {
      const supabase = createClient()
      const { data } = await supabase.from('lojas').select('nome, cidade').eq('id', lojaId).single()
      setLoja(data)
      const { data: meses } = await supabase
        .from('clientes')
        .select('mes_referencia')
        .eq('loja_id', lojaId)
      const mesesUnicos = [...new Set((meses || []).map((m: any) => m.mes_referencia))].sort().reverse()
      setMesesDisponiveis(mesesUnicos)
      if (mesesUnicos.length > 0 && !mesesUnicos.includes(mesSelecionado)) {
        setMesSelecionado(mesesUnicos[0])
      }
    }
    loadLoja()
  }, [lojaId])

  useEffect(() => {
    loadClientes()
  }, [lojaId, mesSelecionado])

  async function loadClientes() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .eq('loja_id', lojaId)
      .eq('mes_referencia', mesSelecionado)
      .order('nome')
    setClientes(data || [])
    setTotalAtendidos((data || []).filter((c: any) => c.status === 'atendido').length)
    setLoading(false)
  }

  async function apagarMes() {
    setApagando(true)
    const supabase = createClient()
    const { data: clientesDoMes } = await supabase
      .from('clientes')
      .select('id')
      .eq('loja_id', lojaId)
      .eq('mes_referencia', mesSelecionado)

    if (clientesDoMes && clientesDoMes.length > 0) {
      const ids = clientesDoMes.map((c: any) => c.id)
      await supabase.from('atendimentos').delete().in('cliente_id', ids)
      await supabase.from('clientes').delete().in('id', ids)
    }

    // Atualizar lista de meses
    const { data: meses } = await supabase
      .from('clientes')
      .select('mes_referencia')
      .eq('loja_id', lojaId)
    const mesesUnicos = [...new Set((meses || []).map((m: any) => m.mes_referencia))].sort().reverse()
    setMesesDisponiveis(mesesUnicos)
    setMesSelecionado(mesesUnicos[0] || format(new Date(), 'yyyy-MM'))
    setClientes([])
    setTotalAtendidos(0)
    setConfirmandoApagar(false)
    setApagando(false)
    setMsgSucesso(`Clientes de ${mesLabel(mesSelecionado)} apagados!`)
    setTimeout(() => setMsgSucesso(''), 3000)
  }

  function updateAvaliacao(clienteId: string, field: keyof Avaliacao, value: string | number) {
    setAvaliacoes(prev => ({
      ...prev,
      [clienteId]: { ...(prev[clienteId] || defaultAvaliacao), [field]: value }
    }))
  }

  async function salvar(clienteId: string) {
    const av = avaliacoes[clienteId]
    if (!av?.status_ligacao) return
    setSalvando(clienteId)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('nome').eq('id', user?.id).single()

    const mediaNotas = av.status_ligacao === 'atendida' && (av.nota_atendimento || av.nota_produto || av.nota_entrega)
      ? Math.round((av.nota_atendimento + av.nota_produto + av.nota_entrega) / 3)
      : null
    const atencao = mediaNotas !== null && mediaNotas <= 2

    await supabase.from('atendimentos').insert({
      cliente_id: clienteId,
      loja_id: lojaId,
      colaborador_id: user?.id,
      colaborador_nome: profile?.nome || user?.email,
      status_ligacao: av.status_ligacao,
      nota_satisfacao: mediaNotas,
      nota_atendimento: av.nota_atendimento || null,
      nota_produto: av.nota_produto || null,
      nota_entrega: av.nota_entrega || null,
      observacoes: av.observacoes || null,
      atencao_necessaria: atencao,
    })

    const novoStatus = av.status_ligacao === 'atendida' ? 'atendido' : av.status_ligacao
    await supabase.from('clientes').update({ status: novoStatus }).eq('id', clienteId)
    setClientes(prev => prev.map(c => c.id === clienteId ? { ...c, status: novoStatus } : c))
    if (av.status_ligacao === 'atendida') setTotalAtendidos(t => t + 1)
    setAberto(null)
    setSalvando(null)
  }

  function mesLabel(mes: string) {
    try { return format(parseISO(mes + '-01'), 'MMMM yyyy', { locale: ptBR }) } catch { return mes }
  }

  function navMes(direcao: 'prev' | 'next') {
    const idx = mesesDisponiveis.indexOf(mesSelecionado)
    if (direcao === 'next' && idx > 0) setMesSelecionado(mesesDisponiveis[idx - 1])
    if (direcao === 'prev' && idx < mesesDisponiveis.length - 1) setMesSelecionado(mesesDisponiveis[idx + 1])
  }

  const clientesFiltrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (c.pintor || '').toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone.includes(busca)
  )

  const pendentes = clientesFiltrados.filter(c => c.status === 'pendente' || c.status === 'retorno')
  const concluidos = clientesFiltrados.filter(c => c.status === 'atendido')
  const metaAtingida = totalAtendidos >= 5

  return (
    <AppLayout>
      <div className="p-8 max-w-2xl">
        <div className="mb-6">
          <p className="text-xs text-gray-400 mb-1">Lojas / {loja?.nome}</p>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{loja?.nome || '...'}</h1>
              <p className="text-sm text-gray-400">{loja?.cidade}</p>
            </div>
            {metaAtingida ? (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
                <CheckCircle size={18} className="text-green-500" />
                <span className="font-semibold text-green-700 text-sm">META CONCLUÍDA</span>
              </div>
            ) : (
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">{totalAtendidos}<span className="text-lg font-normal text-gray-400">/5</span></p>
                <p className="text-xs text-gray-400">atendidos</p>
              </div>
            )}
          </div>

          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${metaAtingida ? 'bg-green-500' : 'bg-lidar-500'}`}
              style={{ width: `${Math.min((totalAtendidos / 5) * 100, 100)}%` }}
            />
          </div>
          {!metaAtingida && clientes.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">Faltam {5 - totalAtendidos} atendimento{5 - totalAtendidos !== 1 ? 's' : ''} para a meta</p>
          )}
        </div>

        {/* Seletor de mês + botão apagar */}
        <div className="card p-3 mb-5 flex items-center justify-between">
          <button
            onClick={() => navMes('prev')}
            disabled={mesesDisponiveis.indexOf(mesSelecionado) >= mesesDisponiveis.length - 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} className="text-gray-500" />
          </button>

          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-lidar-500" />
            {mesesDisponiveis.length > 0 ? (
              <select
                className="text-sm font-medium text-gray-700 bg-transparent border-none outline-none cursor-pointer capitalize"
                value={mesSelecionado}
                onChange={e => { setMesSelecionado(e.target.value); setConfirmandoApagar(false) }}
              >
                {mesesDisponiveis.map(m => (
                  <option key={m} value={m}>{mesLabel(m)}</option>
                ))}
              </select>
            ) : (
              <span className="text-sm font-medium text-gray-500 capitalize">{mesLabel(mesSelecionado)}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navMes('next')}
              disabled={mesesDisponiveis.indexOf(mesSelecionado) <= 0}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={16} className="text-gray-500" />
            </button>

            {/* Botão apagar mês */}
            {clientes.length > 0 && (
              <button
                onClick={() => setConfirmandoApagar(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                title="Apagar clientes deste mês"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Confirmação de apagar */}
        {confirmandoApagar && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-700">Apagar todos os clientes de {mesLabel(mesSelecionado)}?</p>
                <p className="text-xs text-red-500 mt-1">
                  Isso vai apagar os {clientes.length} clientes e todos os atendimentos registrados neste mês. Não pode ser desfeito.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={apagarMes}
                    disabled={apagando}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    {apagando ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Apagando...</> : <><Trash2 size={12} /> Confirmar</>}
                  </button>
                  <button
                    onClick={() => setConfirmandoApagar(false)}
                    className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sucesso */}
        {msgSucesso && (
          <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-100 text-green-700 rounded-xl px-4 py-3 text-sm">
            <CheckCircle size={16} /> {msgSucesso}
          </div>
        )}

        {/* Busca */}
        <div className="relative mb-5">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 text-sm"
            placeholder="Buscar por nome, pintor ou telefone..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-lidar-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : clientes.length === 0 ? (
          <div className="card p-12 text-center">
            <Phone size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm font-medium">Nenhum cliente importado para este mês.</p>
          </div>
        ) : (
          <>
            {pendentes.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Pendentes ({pendentes.length})</p>
                <div className="space-y-2">
                  {pendentes.map(cliente => (
                    <ClienteCard
                      key={cliente.id}
                      cliente={cliente}
                      aberto={aberto === cliente.id}
                      onToggle={() => setAberto(aberto === cliente.id ? null : cliente.id)}
                      avaliacao={avaliacoes[cliente.id] || defaultAvaliacao}
                      onChange={(f, v) => updateAvaliacao(cliente.id, f, v)}
                      onSalvar={() => salvar(cliente.id)}
                      salvando={salvando === cliente.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {concluidos.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Atendidos ({concluidos.length})</p>
                <div className="space-y-2">
                  {concluidos.map(cliente => (
                    <div key={cliente.id} className="card px-4 py-3 flex items-center gap-3 opacity-60">
                      <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{cliente.nome}</p>
                        {cliente.pintor && <p className="text-xs text-gray-400">Pintor: {cliente.pintor}</p>}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{cliente.telefone}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}

function StarRating({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex-1">
      <p className="text-xs font-semibold text-gray-500 mb-2 text-center">{label}</p>
      <div className="flex justify-center gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => onChange(n)} className="focus:outline-none transition-transform hover:scale-110">
            <Star size={22} className={n <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-gray-400 mt-1 h-4">
        {value === 1 ? 'Péssimo' : value === 2 ? 'Ruim' : value === 3 ? 'Regular' : value === 4 ? 'Bom' : value === 5 ? 'Excelente' : ''}
      </p>
    </div>
  )
}

function ClienteCard({ cliente, aberto, onToggle, avaliacao, onChange, onSalvar, salvando }: {
  cliente: Cliente; aberto: boolean; onToggle: () => void
  avaliacao: Avaliacao; onChange: (f: keyof Avaliacao, v: string | number) => void
  onSalvar: () => void; salvando: boolean
}) {
  return (
    <div className={`card overflow-hidden transition-shadow ${aberto ? 'shadow-md ring-1 ring-lidar-100' : ''}`}>
      <button onClick={onToggle} className="w-full px-4 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left">
        <div className="w-9 h-9 rounded-full bg-lidar-50 flex items-center justify-center flex-shrink-0">
          <User size={16} className="text-lidar-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{cliente.nome}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400">{cliente.telefone}</span>
            {cliente.pintor && <><span className="text-gray-200">·</span><span className="text-xs text-lidar-600 font-medium">🖌 {cliente.pintor}</span></>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="badge-pendente">Pendente</span>
          {aberto ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {aberto && (
        <div className="border-t border-gray-100 px-4 py-5 space-y-5 bg-gray-50/50">
          {(cliente.vendedor || cliente.cpf) && (
            <div className="flex gap-4 text-xs text-gray-500">
              {cliente.vendedor && <span>👤 Vendedor: <strong>{cliente.vendedor}</strong></span>}
              {cliente.cpf && <span>📄 CPF: <strong>{cliente.cpf}</strong></span>}
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Status da ligação *</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'atendida', label: '✅ Atendida' },
                { value: 'nao_atendeu', label: '📵 Não atendeu' },
                { value: 'inexistente', label: '❌ Inexistente' },
                { value: 'caixa_postal', label: '📬 Caixa postal' },
                { value: 'retorno', label: '🔄 Retorno' },
              ].map(opt => (
                <button key={opt.value} onClick={() => onChange('status_ligacao', opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${avaliacao.status_ligacao === opt.value ? 'bg-lidar-600 text-white border-lidar-600' : 'bg-white text-gray-600 border-gray-200 hover:border-lidar-300'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {avaliacao.status_ligacao === 'atendida' && (
            <>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-3">Avaliação</p>
                <div className="flex gap-2 bg-white rounded-xl border border-gray-100 p-4">
                  <StarRating label="Atendimento" value={avaliacao.nota_atendimento} onChange={v => onChange('nota_atendimento', v)} />
                  <div className="w-px bg-gray-100" />
                  <StarRating label="Produto" value={avaliacao.nota_produto} onChange={v => onChange('nota_produto', v)} />
                  <div className="w-px bg-gray-100" />
                  <StarRating label="Entrega" value={avaliacao.nota_entrega} onChange={v => onChange('nota_entrega', v)} />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">Observações</p>
                <textarea className="input text-xs resize-none" rows={2} placeholder="Alguma observação..."
                  value={avaliacao.observacoes} onChange={e => onChange('observacoes', e.target.value)} />
              </div>
            </>
          )}

          <button onClick={onSalvar} disabled={!avaliacao.status_ligacao || salvando} className="btn-primary w-full flex items-center justify-center gap-2">
            {salvando ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Salvando...</> : <><Phone size={14} /> Registrar ligação</>}
          </button>
        </div>
      )}
    </div>
  )
}
