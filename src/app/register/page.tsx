'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      if (data.session) {
        // User is logged in automatically (Auto-Confirm enabled in Supabase)
        router.push('/')
        router.refresh()
      } else {
        // Email verification is required
        setMessage('Registration successful! Please check your email to verify your account.')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 relative overflow-hidden flex flex-col justify-between p-6 sm:p-10 select-none">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes dash {
          to {
            stroke-dashoffset: -1000;
          }
        }
        .dash-animate {
          animation: dash 35s linear infinite;
        }
      `}} />

      {/* Grid Pattern Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_80%,transparent_100%)] opacity-50 pointer-events-none" />

      {/* Background Motion Graphics Ornaments (Left Side) */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 pointer-events-none opacity-20 filter blur-3xl rounded-full bg-orange-500/10 mix-blend-screen animate-pulse" />
      
      <svg className="absolute left-0 top-0 h-full w-1/3 pointer-events-none opacity-40 hidden md:block" viewBox="0 0 400 800" fill="none">
        <defs>
          <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        {/* Bezier spline path */}
        <path d="M-50,220 C180,280 80,480 280,520 C380,540 320,680 220,760" stroke="url(#orangeGrad)" strokeWidth="2" strokeDasharray="8 6" className="dash-animate" />
        
        {/* Anchor handles & control points */}
        <line x1="80" y1="480" x2="30" y2="430" stroke="#f97316" strokeWidth="1" opacity="0.6" />
        <circle cx="30" cy="430" r="3" fill="#f97316" />
        <line x1="80" y1="480" x2="130" y2="530" stroke="#f97316" strokeWidth="1" opacity="0.6" />
        <circle cx="130" cy="530" r="3" fill="#f97316" />
        
        {/* Keyframe diamonds */}
        <g transform="translate(80, 480)">
          <rect x="-5" y="-5" width="10" height="10" transform="rotate(45)" fill="#f59e0b" stroke="#fff" strokeWidth="1" />
        </g>
        <g transform="translate(280, 520)">
          <rect x="-5" y="-5" width="10" height="10" transform="rotate(45)" fill="#f97316" stroke="#fff" strokeWidth="1" />
        </g>
      </svg>

      {/* Background Motion Graphics Ornaments (Right Side) */}
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 pointer-events-none opacity-20 filter blur-3xl rounded-full bg-violet-600/10 mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }} />

      <svg className="absolute right-0 top-0 h-full w-1/2 pointer-events-none opacity-45 hidden md:block" viewBox="0 0 600 800" fill="none">
        <defs>
          <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        
        {/* Waves representing motion paths */}
        <path d="M300,120 Q480,180 420,320 T560,500 T420,740" stroke="url(#purpleGrad)" strokeWidth="2" opacity="0.8" />
        
        {/* Orbit circle representing timeline controls */}
        <circle cx="460" cy="580" r="50" stroke="#8b5cf6" strokeWidth="1" strokeDasharray="4 6" className="dash-animate" style={{ animationDuration: '15s', animationDirection: 'reverse' }} />
        <circle cx="460" cy="580" r="3" fill="#fff" />
      </svg>


      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center z-10 relative py-12 px-2 sm:px-6">
        
        {/* Split Card Design */}
        <div className="w-full max-w-4xl bg-zinc-900/30 backdrop-blur-2xl border border-zinc-800/50 p-4 sm:p-5 rounded-[2.5rem] md:rounded-[3.5rem] shadow-[0_25px_60px_rgba(0,0,0,0.8)] flex flex-col md:flex-row gap-6 relative">
          
          {/* Subtle top light overlay */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-zinc-700/30 to-transparent" />
          
          {/* Left Panel: Form */}
          <div className="flex-1 p-6 sm:p-10 flex flex-col justify-center">
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2 leading-tight">
                Sign Up
              </h2>
              <p className="text-xs text-zinc-400">
                Create an account to get started
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleRegister}>
              <div className="space-y-5">
                <div className="relative">
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="block w-full border-b border-zinc-850 focus:border-orange-500 bg-transparent py-3 pr-10 text-zinc-100 placeholder-zinc-600 transition-all focus:outline-none text-sm"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <div className="absolute right-0 bottom-3 text-zinc-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                    </svg>
                  </div>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className="block w-full border-b border-zinc-850 focus:border-orange-500 bg-transparent py-3 pr-10 text-zinc-100 placeholder-zinc-600 transition-all focus:outline-none text-sm"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 bottom-3 text-zinc-500 hover:text-zinc-300 focus:outline-none"
                  >
                    {showPassword ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-red-400 text-xs text-center bg-red-950/20 border border-red-900/30 py-2.5 rounded-xl">
                  {error}
                </div>
              )}
              {message && (
                <div className="text-green-400 text-xs text-center bg-green-950/20 border border-green-900/30 py-2.5 rounded-xl">
                  {message}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-600/10 hover:shadow-orange-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                >
                  {loading ? 'Registering...' : 'Register'}
                </button>
              </div>
            </form>

            <div className="mt-8 text-center text-xs text-zinc-500">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-orange-400 hover:text-orange-300 hover:underline">
                Sign In
              </Link>
            </div>
          </div>

          {/* Right Panel: Logo Graphic Container */}
          <div className="w-full md:w-[45%] bg-zinc-950 border border-zinc-800/80 rounded-[2rem] md:rounded-[2.5rem] p-10 flex flex-col items-center justify-center relative overflow-hidden min-h-[300px] md:min-h-[400px]">
            {/* Ambient orange glow behind the logo */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.1)_0%,transparent_60%)] animate-pulse" />
            
            {/* Grid graphic overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_60%,transparent_100%)] opacity-30 pointer-events-none" />

            <img 
              src="/logo/logo-zcd.svg" 
              alt="ZCD Logo" 
              className="w-32 h-32 md:w-36 md:h-36 object-contain relative z-10 drop-shadow-[0_0_30px_rgba(249,115,22,0.25)] hover:scale-105 transition-transform duration-500" 
            />
            
            <div className="mt-6 flex flex-col items-center relative z-10">
              <span className="text-[9px] font-extrabold uppercase tracking-[0.25em] text-zinc-400">ZCD studio</span>
              <span className="text-[8px] font-medium uppercase tracking-[0.2em] text-zinc-600 mt-1">by Zecodark</span>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="z-20 relative w-full flex flex-col sm:flex-row justify-between items-center gap-2 text-[11px] text-zinc-600">
        <div>
          © 2026 ZCD studio. All rights reserved.
        </div>
        <div className="flex gap-4">
          <Link href="#" className="hover:text-zinc-400 transition-colors">Terms of Service</Link>
          <Link href="#" className="hover:text-zinc-400 transition-colors">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  )
}
