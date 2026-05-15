'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  LayoutDashboard, Store, Phone, BarChart2, Upload, LogOut, ChevronRight
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/lojas', label: 'Lojas', icon: Store },
  { href: '/ligacoes', label: 'Ligações', icon: Phone },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart2 },
  { href: '/importar', label: 'Importar Planilha', icon: Upload },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-gray-100 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-luidar-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-sm">L</span>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Grupo Luidar</p>
            <p className="text-xs text-gray-400">Pós-Venda</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-lidar-50 text-lidar-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={18} className={active ? 'text-lidar-600' : 'text-gray-400'} />
              {label}
              {active && <ChevronRight size={14} className="ml-auto text-lidar-400" />}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  )
}
