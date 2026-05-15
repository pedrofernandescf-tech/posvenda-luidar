'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LigacoesIndex() {
  const router = useRouter()
  useEffect(() => { router.push('/lojas') }, [router])
  return null
}
