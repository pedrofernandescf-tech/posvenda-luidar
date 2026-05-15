'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle, Clock, Phone, TrendingUp, AlertTriangle, Store } from 'lucide-react'

type ResumoLoja = {
  loja_id: string
  loja_nome: string
  cidade: string
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
  const mesAtual = format(new Date(), 'yyyy-MM')

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

  const totalAtendidos = resumos.reduce((s, r) => s + (r.total_atendidos || 0), 0)
  const lojasComMeta = resumos.filter(r => r.meta_atingida).length
  const lojasSemMeta = resumos.filter(r => !r.meta_atingida).length
  const mediaSatisfacao = resumos.length
    ? (resumos.reduce((s, r) => s + (r.media_satisfacao || 0), 0) / resumos.length).toFixed(1)
    : '—'
  const mesFormatado = format(new Date(), 'MMMM yyyy', { locale: ptBR })

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1 capitalize">Mês de referência: {mesFormatado}</p>
        </div>

        {/* Cards de indicadores */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<CheckCircle className="text-green-500" size={22} />}
            label="Lojas com meta"
            value={lojasComMeta}
            sub={`de ${resumos.length} lojas`}
            color="green"
          />
          <StatCard
            icon={<Clock className="text-amber-500" size={22} />}
            label="Lojas pendentes"
            value={lojasSemMeta}
            sub="ainda em andamento"
            color="amber"
          />
          <StatCard
            icon={<Phone className="text-lidar-600" size={22} />}
            label="Total atendidos"
            value={totalAtendidos}
            sub="ligações registradas"
            color="lidar"
          />
          <StatCard
            icon={<TrendingUp className="text-purple-500" size={22} />}
            label="Média satisfação"
            value={mediaSatisfacao}
            sub="de 5 pontos"
            color="purple"
          />
        </div>

        {/* Ranking de lojas */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Store size={18} className="text-gray-400" />
            <h2 className="font-semibold text-gray-800">Status por Loja</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-lidar-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : resumos.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Store size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum dado para este mês ainda.</p>
              <p className="text-xs mt-1">Importe uma planilha para começar.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {resumos
                .sort((a, b) => (b.total_atendidos || 0) - (a.total_atendidos || 0))
                .map(loja => (
                  <LojaRow key={loja.loja_id} loja={loja} />
                ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode, label: string, value: string | number, sub: string, color: string
}) {
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
  const meta = 10
  const pct = Math.min((atendidos / meta) * 100, 100)

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
      {/* Status */}
      <div className="flex-shrink-0">
        {loja.meta_atingida ? (
          <span className="badge-meta">✅ Meta</span>
        ) : atendidos >= 7 ? (
          <span className="badge-pendente">⚡ Quase</span>
        ) : (
          <span className="badge-pendente">⏳ Em andamento</span>
        )}
      </div>

      {/* Nome + barra */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-800 truncate">{loja.loja_nome}</span>
          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{atendidos}/{meta}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${loja.meta_atingida ? 'bg-green-500' : 'bg-lidar-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Satisfação */}
      {loja.media_satisfacao && (
        <div className="flex-shrink-0 text-right">
          <span className="text-sm font-semibold text-gray-700">
            ⭐ {Number(loja.media_satisfacao).toFixed(1)}
          </span>
        </div>
      )}

      {/* Alerta */}
      {!loja.meta_atingida && atendidos < 5 && (
        <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
      )}
    </div>
  )
}
