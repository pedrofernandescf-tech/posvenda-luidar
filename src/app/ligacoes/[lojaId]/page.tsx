'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase'
import { Phone, CheckCircle, ChevronDown, ChevronUp, Star, User, Search } from 'lucide-react'
import { format } from 'date-fns'

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
  const mes = format(new Date(), 'yyyy-MM')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: lojaData }, { data: clientesData }] = await Promise.all([
        supabase.from('lojas').select('nome, cidade').eq('id', lojaId).single(),
        supabase.from('clientes').select('*').eq('loja_id', lojaId).eq('mes_referencia', mes).order('nome'),
      ])
      setLoja(lojaData)
      setClientes(clientesData || [])
      setTotalAtendidos((clientesData || []).filter(c => c.status === 'atendido').length)
      setLoading(false)
    }
    load()
  }, [lojaId, mes])

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

    const mediaNotas = av.status_ligacao === 'atendida'
      ? (av.nota_atendimento + av.nota_produto + av.nota_entrega) / 3
      : null

    const atencao = mediaNotas !== null && mediaNotas <= 2

    await supabase.from('atendimentos').insert({
      cliente_id: clienteId,
      loja_id: lojaId,
      colaborador_id: user?.id,
      colaborador_nome: profile?.nome || user?.email,
      status_ligacao: av.status_ligacao,
      nota_satisfacao: mediaNotas ? Math.round(mediaNotas) : null,
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
        {/* Header */}
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

          {/* Barra progresso */}
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${metaAtingida ? 'bg-green-500' : 'bg-lidar-500'}`}
              style={{ width: `${Math.min((totalAtendidos / 5) * 100, 100)}%` }}
            />
          </div>
          {!metaAtingida && (
            <p className="text-xs text-gray-400 mt-1">Faltam {5 - totalAtendidos} atendimento{5 - totalAtendidos !== 1 ? 's' : ''} para a meta</p>
          )}
        </div>

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
        ) : (
          <>
            {/* Pendentes */}
            {pendentes.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Pendentes ({pendentes.length})
                </p>
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

            {/* Concluídos */}
            {concluidos.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Atendidos ({concluidos.length})
                </p>
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

            {clientes.length === 0 && (
              <div className="card p-12 text-center">
                <Phone size={40} className="mx-auto text-gray-200 mb-3" />
                <p className="text-gray-400 text-sm">Nenhum cliente importado para esta loja.</p>
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
            <Star
              size={22}
              className={n <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}
            />
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
  cliente: Cliente
  aberto: boolean
  onToggle: () => void
  avaliacao: Avaliacao
  onChange: (field: keyof Avaliacao, value: string | number) => void
  onSalvar: () => void
  salvando: boolean
}) {
  const jaLigado = cliente.status === 'atendido'

  return (
    <div className={`card overflow-hidden transition-shadow ${aberto ? 'shadow-md ring-1 ring-lidar-100' : ''}`}>
      {/* Linha principal — clicável */}
      <button onClick={onToggle} className="w-full px-4 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left">
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${jaLigado ? 'bg-green-50' : 'bg-lidar-50'}`}>
          <User size={16} className={jaLigado ? 'text-green-500' : 'text-lidar-600'} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{cliente.nome}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400">{cliente.telefone}</span>
            {cliente.pintor && (
              <>
                <span className="text-gray-200">·</span>
                <span className="text-xs text-lidar-600 font-medium">🖌 {cliente.pintor}</span>
              </>
            )}
          </div>
        </div>

        {/* Check status */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {jaLigado ? (
            <span className="badge-meta"><CheckCircle size={11} /> Ligado</span>
          ) : (
            <span className="badge-pendente">Pendente</span>
          )}
          {aberto ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {/* Formulário expandido */}
      {aberto && (
        <div className="border-t border-gray-100 px-4 py-5 space-y-5 bg-gray-50/50">

          {/* Info extra */}
          {(cliente.vendedor || cliente.cpf) && (
            <div className="flex gap-4 text-xs text-gray-500">
              {cliente.vendedor && <span>👤 Vendedor: <strong>{cliente.vendedor}</strong></span>}
              {cliente.cpf && <span>📄 CPF: <strong>{cliente.cpf}</strong></span>}
            </div>
          )}

          {/* Status da ligação */}
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
                <button
                  key={opt.value}
                  onClick={() => onChange('status_ligacao', opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    avaliacao.status_ligacao === opt.value
                      ? 'bg-lidar-600 text-white border-lidar-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-lidar-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Estrelas — só se atendida */}
          {avaliacao.status_ligacao === 'atendida' && (
            <>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-3">Avaliação</p>
                <div className="flex gap-2 bg-white rounded-xl border border-gray-100 p-4">
                  <StarRating
                    label="Atendimento"
                    value={avaliacao.nota_atendimento}
                    onChange={v => onChange('nota_atendimento', v)}
                  />
                  <div className="w-px bg-gray-100" />
                  <StarRating
                    label="Produto"
                    value={avaliacao.nota_produto}
                    onChange={v => onChange('nota_produto', v)}
                  />
                  <div className="w-px bg-gray-100" />
                  <StarRating
                    label="Entrega"
                    value={avaliacao.nota_entrega}
                    onChange={v => onChange('nota_entrega', v)}
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">Observações</p>
                <textarea
                  className="input text-xs resize-none"
                  rows={2}
                  placeholder="Alguma observação sobre o atendimento..."
                  value={avaliacao.observacoes}
                  onChange={e => onChange('observacoes', e.target.value)}
                />
              </div>
            </>
          )}

          {/* Botão registrar */}
          <button
            onClick={onSalvar}
            disabled={!avaliacao.status_ligacao || salvando}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {salvando ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Salvando...</>
            ) : (
              <><Phone size={14} /> Registrar ligação</>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
