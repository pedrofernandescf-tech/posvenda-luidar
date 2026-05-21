'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Store, ChevronRight, CheckCircle, Clock, Trash2, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'

type Loja = {
  id: string
  nome: string
  cidade: string
  grupo: string
  total_atendidos: number
  total_clientes: number
  media_satisfacao: number
  meta_atingida: boolean
}

export default function LojasPage() {
  const [lojas, setLojas] = useState<Loja[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [apagando, setApagando] = useState<string | null>(null)
  const [msgSucesso, setMsgSucesso] = useState<string | null>(null)
  const mes = format(new Date(), 'yyyy-MM')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const supabase = createClient()
    const { data: todasLojas } = await supabase
      .from('lojas')
      .select('id, nome, cidade, grupo')
      .order('grupo')
      .order('nome')

    const { data: resumos } = await supabase
      .from('resumo_lojas')
      .select('*')
      .eq('mes_referencia', mes)

    const lojasComResumo = (todasLojas || []).map(loja => {
      const resumo = (resumos || []).find(r => r.loja_id === loja.id)
      return {
        ...loja,
        total_atendidos: resumo?.total_atendidos || 0,
        total_clientes: resumo?.total_clientes || 0,
        media_satisfacao: resumo?.media_satisfacao || 0,
        meta_atingida: resumo?.meta_atingida || false,
      }
    })

    setLojas(lojasComResumo)
    setLoading(false)
  }

  async function apagarClientes(lojaId: string, lojaNome: string) {
    setApagando(lojaId)
    const supabase = createClient()

    // Busca IDs dos clientes da loja neste mês
    const { data: clientes } = await supabase
      .from('clientes')
      .select('id')
      .eq('loja_id', lojaId)
      .eq('mes_referencia', mes)

    if (clientes && clientes.length > 0) {
      const ids = clientes.map(c => c.id)
      // Apaga atendimentos vinculados
      await supabase.from('atendimentos').delete().in('cliente_id', ids)
      // Apaga clientes
      await supabase.from('clientes').delete().in('id', ids)
    }

    setConfirmando(null)
    setApagando(null)
    setMsgSucesso(`Clientes da ${lojaNome} apagados com sucesso!`)
    setTimeout(() => setMsgSucesso(null), 3000)
    load()
  }

  const grupos = lojas.reduce((acc, loja) => {
    const g = loja.grupo || 'Sem grupo'
    if (!acc[g]) acc[g] = []
    acc[g].push(loja)
    return acc
  }, {} as Record<string, Loja[]>)

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Lojas</h1>
          <p className="text-sm text-gray-500 mt-1">Selecione uma loja para registrar ligações.</p>
        </div>

        {/* Mensagem de sucesso */}
        {msgSucesso && (
          <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-100 text-green-700 rounded-xl px-4 py-3 text-sm">
            <CheckCircle size={16} /> {msgSucesso}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-lidar-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grupos).map(([grupo, lojasDoGrupo]) => (
              <div key={grupo}>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  {grupo} ({lojasDoGrupo.length} lojas)
                </h2>
                <div className="grid gap-3">
                  {lojasDoGrupo.map(loja => (
                    <div key={loja.id} className="card p-4">
                      {/* Modal de confirmação */}
                      {confirmando === loja.id && (
                        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-red-700">Apagar clientes de {loja.nome}?</p>
                              <p className="text-xs text-red-500 mt-0.5">
                                Isso vai apagar todos os {loja.total_clientes} clientes e atendimentos registrados neste mês. Essa ação não pode ser desfeita.
                              </p>
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => apagarClientes(loja.id, loja.nome)}
                                  disabled={apagando === loja.id}
                                  className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                                >
                                  {apagando === loja.id ? (
                                    <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Apagando...</>
                                  ) : (
                                    <><Trash2 size={12} /> Confirmar</>
                                  )}
                                </button>
                                <button
                                  onClick={() => setConfirmando(null)}
                                  className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-lidar-50 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Store size={18} className="text-lidar-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 text-sm">{loja.nome}</h3>
                            {loja.meta_atingida ? (
                              <span className="badge-meta"><CheckCircle size={11} /> Meta</span>
                            ) : loja.total_clientes > 0 ? (
                              <span className="badge-pendente"><Clock size={11} /> Em andamento</span>
                            ) : null}
                          </div>
                          <p className="text-xs text-gray-400">{loja.cidade}</p>
                          {loja.total_clientes > 0 && (
                            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden w-full max-w-xs">
                              <div
                                className={`h-full rounded-full transition-all ${loja.meta_atingida ? 'bg-green-500' : 'bg-lidar-500'}`}
                                style={{ width: `${Math.min((loja.total_atendidos / 5) * 100, 100)}%` }}
                              />
                            </div>
                          )}
                        </div>

                        <div className="text-right flex-shrink-0">
                          {loja.total_clientes > 0 ? (
                            <>
                              <p className="text-xl font-bold text-gray-900">
                                {loja.total_atendidos}<span className="text-sm font-normal text-gray-400">/5</span>
                              </p>
                              <p className="text-xs text-gray-400">{loja.total_clientes} clientes</p>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">⚠️ Sem clientes</span>
                          )}
                        </div>

                        {/* Botão apagar — só aparece se tiver clientes */}
                        {loja.total_clientes > 0 && confirmando !== loja.id && (
                          <button
                            onClick={() => setConfirmando(loja.id)}
                            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                            title="Apagar clientes desta loja"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}

                        <Link href={`/ligacoes/${loja.id}`} className="flex-shrink-0">
                          <ChevronRight size={16} className="text-gray-300 hover:text-lidar-500 transition-colors" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
