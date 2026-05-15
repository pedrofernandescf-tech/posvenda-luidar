'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase'
import { Phone, CheckCircle, User, DollarSign, Calendar, Star, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Cliente = {
  id: string
  nome: string
  telefone: string
  vendedor: string
  valor_compra: number
  produto: string
  data_compra: string
  status: string
}

type FormData = {
  status_ligacao: string
  nota_satisfacao: number
  bem_atendido: string
  produto_entregue: string
  voltaria_comprar: string
  observacoes: string
}

const defaultForm: FormData = {
  status_ligacao: '',
  nota_satisfacao: 0,
  bem_atendido: '',
  produto_entregue: '',
  voltaria_comprar: '',
  observacoes: '',
}

export default function LigacoesPage() {
  const { lojaId } = useParams<{ lojaId: string }>()
  const [loja, setLoja] = useState<{ nome: string; cidade: string } | null>(null)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [totalAtendidos, setTotalAtendidos] = useState(0)
  const [aberto, setAberto] = useState<string | null>(null)
  const [forms, setForms] = useState<Record<string, FormData>>({})
  const [salvando, setSalvando] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
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

  function updateForm(clienteId: string, field: keyof FormData, value: string | number) {
    setForms(prev => ({
      ...prev,
      [clienteId]: { ...(prev[clienteId] || defaultForm), [field]: value }
    }))
  }

  async function salvarAtendimento(clienteId: string) {
    const form = forms[clienteId]
    if (!form?.status_ligacao) return
    setSalvando(clienteId)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('nome').eq('id', user?.id).single()

    const atencao = form.nota_satisfacao > 0 && form.nota_satisfacao <= 2

    const { error } = await supabase.from('atendimentos').insert({
      cliente_id: clienteId,
      loja_id: lojaId,
      colaborador_id: user?.id,
      colaborador_nome: profile?.nome || user?.email,
      status_ligacao: form.status_ligacao,
      nota_satisfacao: form.nota_satisfacao || null,
      bem_atendido: form.bem_atendido === 'sim' ? true : form.bem_atendido === 'nao' ? false : null,
      produto_entregue: form.produto_entregue || null,
      voltaria_comprar: form.voltaria_comprar || null,
      observacoes: form.observacoes || null,
      atencao_necessaria: atencao,
    })

    if (!error) {
      const novoStatus = form.status_ligacao === 'atendida' ? 'atendido' : form.status_ligacao
      await supabase.from('clientes').update({ status: novoStatus }).eq('id', clienteId)
      setClientes(prev => prev.map(c => c.id === clienteId ? { ...c, status: novoStatus } : c))
      if (form.status_ligacao === 'atendida') setTotalAtendidos(t => t + 1)
      setAberto(null)
    }
    setSalvando(null)
  }

  const metaAtingida = totalAtendidos >= 10
  const pendentes = clientes.filter(c => c.status === 'pendente' || c.status === 'retorno')
  const concluidos = clientes.filter(c => c.status === 'atendido')

  return (
    <AppLayout>
      <div className="p-8 max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <span>Lojas</span><span>/</span>
            <span className="text-gray-600">{loja?.nome}</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{loja?.nome || '...'}</h1>
              <p className="text-sm text-gray-400">{loja?.cidade}</p>
            </div>
            {metaAtingida ? (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
                <CheckCircle size={20} className="text-green-500" />
                <span className="font-semibold text-green-700">META CONCLUÍDA</span>
              </div>
            ) : (
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">{totalAtendidos}<span className="text-lg font-normal text-gray-400">/10</span></p>
                <p className="text-xs text-gray-400">atendidos</p>
              </div>
            )}
          </div>

          {/* Barra de progresso */}
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${metaAtingida ? 'bg-green-500' : 'bg-lidar-500'}`}
              style={{ width: `${Math.min((totalAtendidos / 10) * 100, 100)}%` }}
            />
          </div>
          {!metaAtingida && (
            <p className="text-xs text-gray-400 mt-1">Faltam {10 - totalAtendidos} atendimento{10 - totalAtendidos !== 1 ? 's' : ''} para atingir a meta</p>
          )}
        </div>

        {/* Lista de pendentes */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-lidar-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {pendentes.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Pendentes ({pendentes.length})
                </h2>
                <div className="space-y-2">
                  {pendentes.map(cliente => (
                    <ClienteCard
                      key={cliente.id}
                      cliente={cliente}
                      aberto={aberto === cliente.id}
                      onToggle={() => setAberto(aberto === cliente.id ? null : cliente.id)}
                      form={forms[cliente.id] || defaultForm}
                      onChange={(field, value) => updateForm(cliente.id, field, value)}
                      onSalvar={() => salvarAtendimento(cliente.id)}
                      salvando={salvando === cliente.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {concluidos.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Atendidos ({concluidos.length})
                </h2>
                <div className="space-y-2 opacity-60">
                  {concluidos.map(cliente => (
                    <div key={cliente.id} className="card px-4 py-3 flex items-center gap-3">
                      <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{cliente.nome}</span>
                      <span className="text-xs text-gray-400 ml-auto">{cliente.telefone}</span>
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

function ClienteCard({ cliente, aberto, onToggle, form, onChange, onSalvar, salvando }: {
  cliente: Cliente
  aberto: boolean
  onToggle: () => void
  form: FormData
  onChange: (field: keyof FormData, value: string | number) => void
  onSalvar: () => void
  salvando: boolean
}) {
  const statusAtendida = form.status_ligacao === 'atendida'

  return (
    <div className={`card overflow-hidden transition-shadow ${aberto ? 'shadow-md' : ''}`}>
      {/* Header do card */}
      <button onClick={onToggle} className="w-full px-4 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left">
        <div className="w-9 h-9 bg-lidar-50 rounded-full flex items-center justify-center flex-shrink-0">
          <User size={16} className="text-lidar-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm">{cliente.nome}</p>
          <p className="text-xs text-gray-400">{cliente.telefone}</p>
        </div>
        {cliente.valor_compra && (
          <span className="text-xs text-gray-400 hidden sm:block">R$ {Number(cliente.valor_compra).toFixed(2)}</span>
        )}
        {aberto ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
      </button>

      {/* Formulário expandido */}
      {aberto && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-4">
          {/* Info do cliente */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {cliente.vendedor && <InfoChip icon={<User size={11} />} label="Vendedor" value={cliente.vendedor} />}
            {cliente.valor_compra && <InfoChip icon={<DollarSign size={11} />} label="Valor" value={`R$ ${Number(cliente.valor_compra).toFixed(2)}`} />}
            {cliente.produto && <InfoChip icon={<Star size={11} />} label="Produto" value={cliente.produto} />}
            {cliente.data_compra && <InfoChip icon={<Calendar size={11} />} label="Data compra" value={cliente.data_compra} />}
          </div>

          {/* Status da ligação */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Status da ligação *</label>
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
                    form.status_ligacao === opt.value
                      ? 'bg-lidar-600 text-white border-lidar-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-lidar-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Campos só se atendida */}
          {statusAtendida && (
            <>
              {/* Nota */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Avaliação da experiência</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => onChange('nota_satisfacao', n)}
                      className={`w-9 h-9 rounded-lg text-sm font-bold border transition-colors ${
                        form.nota_satisfacao === n
                          ? n <= 2 ? 'bg-red-500 text-white border-red-500'
                          : n === 3 ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-green-500 text-white border-green-500'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <span className="text-xs text-gray-400 self-center ml-1">
                    {form.nota_satisfacao === 1 ? 'Péssimo' : form.nota_satisfacao === 2 ? 'Ruim' : form.nota_satisfacao === 3 ? 'Regular' : form.nota_satisfacao === 4 ? 'Bom' : form.nota_satisfacao === 5 ? 'Excelente' : ''}
                  </span>
                </div>
                {form.nota_satisfacao <= 2 && form.nota_satisfacao > 0 && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                    <AlertTriangle size={11} /> Será marcado para atenção necessária
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <RadioGroup
                  label="Bem atendido?"
                  value={form.bem_atendido}
                  onChange={v => onChange('bem_atendido', v)}
                  options={[{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }]}
                />
                <RadioGroup
                  label="Produto entregue?"
                  value={form.produto_entregue}
                  onChange={v => onChange('produto_entregue', v)}
                  options={[{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }, { value: 'nao_aplica', label: 'N/A' }]}
                />
                <RadioGroup
                  label="Voltaria a comprar?"
                  value={form.voltaria_comprar}
                  onChange={v => onChange('voltaria_comprar', v)}
                  options={[{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }, { value: 'talvez', label: 'Talvez' }]}
                />
              </div>
            </>
          )}

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Observações</label>
            <textarea
              className="input text-xs resize-none"
              rows={2}
              placeholder="Anotações adicionais..."
              value={form.observacoes}
              onChange={e => onChange('observacoes', e.target.value)}
            />
          </div>

          <button
            onClick={onSalvar}
            disabled={!form.status_ligacao || salvando}
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

function InfoChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1.5">
      <span className="text-gray-400">{icon}</span>
      <span className="text-gray-400">{label}:</span>
      <span className="text-gray-700 font-medium">{value}</span>
    </div>
  )
}

function RadioGroup({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-600 mb-1.5">{label}</p>
      <div className="flex flex-col gap-1">
        {options.map(opt => (
          <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name={label}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="text-lidar-600"
            />
            <span className="text-xs text-gray-600">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
