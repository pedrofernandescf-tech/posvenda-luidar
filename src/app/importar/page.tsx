'use client'
import { useState, useRef } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase'
import * as XLSX from 'xlsx'
import { Upload, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react'
import { format } from 'date-fns'

type ClienteRow = {
  nome: string
  telefone: string
  vendedor?: string
  valor_compra?: number
  produto?: string
  data_compra?: string
}

export default function ImportarPage() {
  const [lojas, setLojas] = useState<{ id: string; nome: string }[]>([])
  const [lojaId, setLojaId] = useState('')
  const [mes, setMes] = useState(format(new Date(), 'yyyy-MM'))
  const [preview, setPreview] = useState<ClienteRow[]>([])
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useState(() => {
    const supabase = createClient()
    supabase.from('lojas').select('id, nome').then(({ data }) => {
      if (data) setLojas(data)
      if (data && data.length > 0) setLojaId(data[0].id)
    })
  })

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setArquivo(file)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

      const clientes: ClienteRow[] = rows.map((row) => ({
        nome: String(row['Nome'] || row['nome'] || row['NOME'] || ''),
        telefone: String(row['Telefone'] || row['telefone'] || row['TELEFONE'] || row['Fone'] || ''),
        vendedor: String(row['Vendedor'] || row['vendedor'] || ''),
        valor_compra: Number(row['Valor'] || row['valor'] || row['Valor da Compra'] || 0),
        produto: String(row['Produto'] || row['produto'] || ''),
        data_compra: String(row['Data'] || row['data_compra'] || row['Data da Compra'] || ''),
      })).filter(c => c.nome && c.telefone)

      setPreview(clientes)
    }
    reader.readAsArrayBuffer(file)
  }

  async function handleImportar() {
    if (!lojaId || preview.length === 0) return
    setStatus('loading')
    const supabase = createClient()

    const inserir = preview.map(c => ({
      loja_id: lojaId,
      nome: c.nome,
      telefone: c.telefone,
      vendedor: c.vendedor || null,
      valor_compra: c.valor_compra || null,
      produto: c.produto || null,
      data_compra: c.data_compra || null,
      mes_referencia: mes,
      status: 'pendente',
    }))

    const { error } = await supabase.from('clientes').insert(inserir)

    if (error) {
      setStatus('error')
      setMsg('Erro ao importar: ' + error.message)
    } else {
      setStatus('success')
      setMsg(`${preview.length} clientes importados com sucesso!`)
      setPreview([])
      setArquivo(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Importar Planilha</h1>
          <p className="text-sm text-gray-500 mt-1">Faça upload do arquivo Excel ou CSV com os clientes do mês.</p>
        </div>

        <div className="card p-6 space-y-5">
          {/* Loja + Mês */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loja</label>
              <select className="input" value={lojaId} onChange={e => setLojaId(e.target.value)}>
                {lojas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mês de referência</label>
              <input type="month" className="input" value={mes} onChange={e => setMes(e.target.value)} />
            </div>
          </div>

          {/* Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Arquivo (.xlsx ou .csv)</label>
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-lidar-300 hover:bg-lidar-50 transition-colors"
              onClick={() => inputRef.current?.click()}
            >
              <FileSpreadsheet size={36} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">
                {arquivo ? arquivo.name : 'Clique para selecionar o arquivo'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Excel (.xlsx) ou CSV</p>
              <input ref={inputRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFile} />
            </div>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Pré-visualização — {preview.length} clientes encontrados
              </p>
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">Nome</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">Telefone</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">Vendedor</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {preview.slice(0, 5).map((c, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-700">{c.nome}</td>
                        <td className="px-3 py-2 text-gray-500">{c.telefone}</td>
                        <td className="px-3 py-2 text-gray-500">{c.vendedor}</td>
                        <td className="px-3 py-2 text-gray-500">
                          {c.valor_compra ? `R$ ${c.valor_compra.toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 5 && (
                  <p className="text-xs text-gray-400 text-center py-2">
                    + {preview.length - 5} clientes adicionais
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Feedback */}
          {status === 'success' && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-100 rounded-lg px-4 py-3 text-sm">
              <CheckCircle size={16} /> {msg}
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm">
              <AlertCircle size={16} /> {msg}
            </div>
          )}

          <button
            className="btn-primary w-full flex items-center justify-center gap-2"
            onClick={handleImportar}
            disabled={preview.length === 0 || status === 'loading'}
          >
            {status === 'loading' ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Importando...</>
            ) : (
              <><Upload size={16} /> Importar {preview.length > 0 ? `${preview.length} clientes` : 'planilha'}</>
            )}
          </button>
        </div>

        {/* Instrução de colunas */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
          <p className="font-medium mb-2">📋 Colunas esperadas na planilha:</p>
          <p className="text-xs text-blue-600">
            <strong>Obrigatórias:</strong> Nome, Telefone<br />
            <strong>Opcionais:</strong> Vendedor, Valor, Produto, Data
          </p>
        </div>
      </div>
    </AppLayout>
  )
}
