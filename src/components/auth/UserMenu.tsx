"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { User } from "@supabase/supabase-js"

export function UserMenu() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  if (!user) return null

  return (
    <div className="flex items-center gap-2 ml-2 border-l border-zinc-800 pl-3">
      <div className="flex items-center gap-2.5 bg-zinc-900/50 hover:bg-zinc-800/80 transition-colors rounded-full px-2.5 py-1">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-600/20 text-orange-400 text-[10px] font-bold">
          {user.email?.[0].toUpperCase()}
        </div>
        <span className="text-[11px] font-semibold text-zinc-400 truncate max-w-[130px] hidden sm:inline">
          {user.email}
        </span>
        <div className="h-3 w-px bg-zinc-800" />
        <Link
          href="/beranda"
          className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Beranda
        </Link>
        <div className="h-3 w-px bg-zinc-800" />
        <button
          onClick={handleLogout}
          disabled={loading}
          className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading ? "..." : "Logout"}
        </button>
      </div>
    </div>
  )
}
