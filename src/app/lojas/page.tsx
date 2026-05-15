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
      const { data } = await supabase
        .from('resumo_lojas')
        .select('*')
        .eq('mes_referencia', mes)
      setLojas(data || [])
      setLoading(false)
    }
    load()
  }, [mes])

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lojas</h1>
            <p className="text-sm text-gray-500 mt-1">Selecione uma loja para registrar ligações.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-lidar-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : lojas.length === 0 ? (
          <div className="card p-12 text-center">
            <Store size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-400">Nenhuma loja com dados este mês.</p>
            <p className="text-sm text-gray-400 mt-1">Importe uma planilha para começar.</p>
            <Link href="/importar" className="btn-primary inline-flex mt-4">Importar planilha</Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {lojas.map(loja => (
              <Link key={loja.id} href={`/ligacoes/${loja.id}`}>
                <div className="card p-5 hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-lidar-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Store size={20} className="text-lidar-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="font-semibold text-gray-900">{loja.nome}</h2>
                        {loja.meta_atingida ? (
                          <span className="badge-meta"><CheckCircle size={11} /> Meta atingida</span>
                        ) : (
                          <span className="badge-pendente"><Clock size={11} /> Em andamento</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{loja.cidade}</p>
                      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden w-full max-w-xs">
                        <div
                          className={`h-full rounded-full ${loja.meta_atingida ? 'bg-green-500' : 'bg-lidar-500'}`}
                          style={{ width: `${Math.min(((loja.total_atendidos || 0) / 10) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-2xl font-bold text-gray-900">{loja.total_atendidos || 0}<span className="text-sm font-normal text-gray-400">/10</span></p>
                      <p className="text-xs text-gray-400">atendidos</p>
                    </div>
                    <ChevronRight size={18} className="text-gray-300 group-hover:text-lidar-500 transition-colors flex-shrink-0" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
