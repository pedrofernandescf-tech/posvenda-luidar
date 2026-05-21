'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Store, ChevronRight, CheckCircle, Clock } from 'lucide-react'
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
  const mes = format(new Date(), 'yyyy-MM')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      // Busca todas as lojas, mesmo sem clientes ainda
      const { data: todasLojas } = await supabase
        .from('lojas')
        .select('id, nome, cidade, grupo')
        .order('grupo')
        .order('nome')

      // Busca resumo do mês atual
      const { data: resumos } = await supabase
        .from('resumo_lojas')
        .select('*')
        .eq('mes_referencia', mes)

      // Combina lojas com seus resumos
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
    load()
  }, [mes])

  // Agrupar por grupo
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
                    <Link key={loja.id} href={`/ligacoes/${loja.id}`}>
                      <div className="card p-4 hover:shadow-md transition-shadow cursor-pointer group">
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
                                  style={{ width: `${Math.min((loja.total_atendidos / 10) * 100, 100)}%` }}
                                />
                              </div>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            {loja.total_clientes > 0 ? (
                              <>
                                <p className="text-xl font-bold text-gray-900">
                                  {loja.total_atendidos}<span className="text-sm font-normal text-gray-400">/10</span>
                                </p>
                                <p className="text-xs text-gray-400">atendidos</p>
                              </>
                            ) : (
                              <p className="text-xs text-gray-300">Sem clientes</p>
                            )}
                          </div>
                          <ChevronRight size={16} className="text-gray-300 group-hover:text-lidar-500 transition-colors flex-shrink-0" />
                        </div>
                      </div>
                    </Link>
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
