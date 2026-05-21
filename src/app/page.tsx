'use client'
import { useState, useRef, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase'
import * as XLSX from 'xlsx'
import { Upload, CheckCircle, AlertCircle, FileSpreadsheet, Download } from 'lucide-react'
import { format } from 'date-fns'

type ClienteRow = {
  nome: string
  telefone: string
  cpf?: string
  pintor?: string
  vendedor?: string
}

export default function ImportarPage() {
  const [lojas, setLojas] = useState<{ id: string; nome: string; grupo: string }[]>([])
  const [lojaId, setLojaId] = useState('')
  const [mes, setMes] = useState(format(new Date(), 'yyyy-MM'))
  const [preview, setPreview] = useState<ClienteRow[]>([])
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('lojas').select('id, nome, grupo').order('grupo').order('nome').then(({ data }) => {
      if (data) setLojas(data)
      if (data && data.length > 0) setLojaId(data[0].id)
    })
  }, [])

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
        nome: String(row['Nome'] || row['nome'] || row['NOME'] || '').trim(),
        telefone: String(row['Telefone'] || row['telefone'] || row['TELEFONE'] || row['Fone'] || row['fone'] || '').trim(),
        cpf: String(row['CPF'] || row['cpf'] || '').trim() || undefined,
        pintor: String(row['Pintor'] || row['pintor'] || row['PINTOR'] || '').trim() || undefined,
        vendedor: String(row['Vendedor'] || row['vendedor'] || row['VENDEDOR'] || '').trim() || undefined,
      })).filter(c => c.nome && c.telefone)

      setPreview(clientes)
      setStatus('idle')
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
      cpf: c.cpf || null,
      pintor: c.pintor || null,
      vendedor: c.vendedor || null,
      mes_referencia: mes,
      status: 'pendente',
    }))

    const { error } = await supabase.from('clientes').insert(inserir)

    if (error) {
      setStatus('error')
      setMsg('Erro ao importar: ' + error.message)
    } else {
      setStatus('success')
      setMsg(`✅ ${preview.length} clientes importados com sucesso!`)
      setPreview([])
      setArquivo(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function baixarModelo() {
    const wb = XLSX.utils.book_new()
    const modelo = [
      { Nome: 'Maria Silva', Telefone: '(37) 99999-0001', CPF: '000.000.000-00', Pintor: 'João Pintor', Vendedor: 'Carlos' },
      { Nome: 'José Santos', Telefone: '(37) 99999-0002', CPF: '', Pintor: '', Vendedor: 'Ana' },
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(modelo), 'Clientes')
    XLSX.writeFile(wb, 'modelo-planilha-posvenda.xlsx')
  }

  // Agrupar lojas por grupo
  const grupos = lojas.reduce((acc, loja) => {
    if (!acc[loja.grupo]) acc[loja.grupo] = []
    acc[loja.grupo].push(loja)
    return acc
  }, {} as Record<string, typeof lojas>)

  return (
    <AppLayout>
      <div className="p-8 max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Importar Planilha</h1>
            <p className="text-sm text-gray-500 mt-1">Selecione a loja e faça upload da planilha de clientes.</p>
          </div>
          <button onClick={baixarModelo} className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={15} /> Baixar modelo
          </button>
        </div>

        <div className="card p-6 space-y-5">
          {/* Loja + Mês */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loja *</label>
              <select className="input" value={lojaId} onChange={e => setLojaId(e.target.value)}>
                {Object.entries(grupos).map(([grupo, lojasDoGrupo]) => (
                  <optgroup key={grupo} label={grupo}>
                    {lojasDoGrupo.map(l => (
                      <option key={l.id} value={l.id}>{l.nome}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mês de referência *</label>
              <input type="month" className="input" value={mes} onChange={e => setMes(e.target.value)} />
            </div>
          </div>

          {/* Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Arquivo (.xlsx ou .csv) *</label>
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
                Pré-visualização — <span className="text-lidar-600 font-semibold">{preview.length} clientes encontrados</span>
              </p>
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">Nome</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">Telefone</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">Pintor</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">Vendedor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {preview.slice(0, 6).map((c, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-700 font-medium">{c.nome}</td>
                        <td className="px-3 py-2 text-gray-500">{c.telefone}</td>
                        <td className="px-3 py-2 text-gray-500">{c.pintor || '—'}</td>
                        <td className="px-3 py-2 text-gray-500">{c.vendedor || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 6 && (
                  <p className="text-xs text-gray-400 text-center py-2 bg-gray-50">
                    + {preview.length - 6} clientes adicionais
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

        {/* Padrão esperado */}
        <div className="mt-5 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
          <p className="font-semibold mb-2">📋 Padrão esperado na planilha:</p>
          <div className="text-xs text-blue-600 space-y-1">
            <p><strong>Obrigatórias:</strong> Nome, Telefone</p>
            <p><strong>Opcionais:</strong> CPF, Pintor, Vendedor</p>
            <p className="mt-2 text-blue-500">💡 Clique em "Baixar modelo" para ter a planilha no formato certo.</p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
