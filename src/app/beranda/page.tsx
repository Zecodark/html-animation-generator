"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const TOOLS = [
  {
    id: "html",
    href: "/tools/html",
    title: "HTML to Video",
    subtitle: "Native HTML / CSS / JS",
    description:
      "Write raw HTML, CSS, and JavaScript animations in a sandboxed editor. The deterministic render engine captures every frame pixel-perfectly and exports MP4, WebM, GIF, MOV, or PNG sequences.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 12l3 4-3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 20h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    badge: "Stable",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    gradient: "from-orange-600/10 via-amber-600/5 to-transparent",
    accentBorder: "hover:border-orange-500/40",
    accentGlow: "group-hover:shadow-orange-500/5",
  },
  {
    id: "tsx",
    href: "/tools/tsx",
    title: "TSX to Video",
    subtitle: "React / TSX / Modern UI",
    description:
      "Build stunning motion graphics with React TSX, Tailwind CSS, and modern libraries. Create complex UI animations that are impossible with plain HTML — then export them as video.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="3" stroke="currentColor" strokeWidth="1.5" />
        <ellipse cx="16" cy="16" rx="12" ry="5" stroke="currentColor" strokeWidth="1.2" />
        <ellipse cx="16" cy="16" rx="12" ry="5" stroke="currentColor" strokeWidth="1.2" transform="rotate(60 16 16)" />
        <ellipse cx="16" cy="16" rx="12" ry="5" stroke="currentColor" strokeWidth="1.2" transform="rotate(120 16 16)" />
      </svg>
    ),
    badge: "New",
    badgeColor: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    gradient: "from-violet-600/10 via-fuchsia-600/5 to-transparent",
    accentBorder: "hover:border-violet-500/40",
    accentGlow: "group-hover:shadow-violet-500/5",
  },
];

export default function BerandaPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 relative overflow-hidden flex flex-col select-none">
      {/* Ambient background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />
      <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] rounded-full bg-orange-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[10%] w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900/60 p-1.5 border border-zinc-800/50">
            <img src="/logo/logo-zcd.svg" alt="ZCD Logo" className="h-full w-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-widest text-zinc-100 uppercase leading-none">
              ZCD Studio
            </span>
            <span className="text-[9px] font-semibold tracking-wide text-zinc-500 mt-0.5 uppercase">
              Motion Graphics Generator
            </span>
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-zinc-900/50 hover:bg-zinc-800/80 transition-colors rounded-full px-3 py-1.5 border border-zinc-800/50">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-600/20 text-orange-400 text-[10px] font-bold">
                {user.email?.[0].toUpperCase()}
              </div>
              <span className="text-[11px] font-semibold text-zinc-400 truncate max-w-[150px] hidden sm:inline">
                {user.email}
              </span>
              <div className="h-3 w-px bg-zinc-700" />
              <button
                onClick={handleLogout}
                disabled={loading}
                className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? "..." : "Logout"}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 sm:px-10 pb-16">
        <div className="flex flex-col items-center text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 bg-zinc-900/60 border border-zinc-800/50 rounded-full px-4 py-1.5 mb-6">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Tools Ready
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight mb-4">
            Create Motion Graphics
            <br />
            <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              Export as Video
            </span>
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 max-w-xl leading-relaxed">
            Turn your code-driven animations into pixel-perfect video files.
            Choose your preferred workflow below — native HTML for simplicity,
            or React TSX for limitless UI creativity.
          </p>
        </div>

        {/* Tool Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-3xl">
          {TOOLS.map((tool) => (
            <Link
              key={tool.id}
              href={tool.href}
              className={`group relative flex flex-col rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-sm p-6 sm:p-8 transition-all duration-300 hover:bg-zinc-900/50 ${tool.accentBorder} hover:shadow-2xl ${tool.accentGlow} hover:-translate-y-1`}
            >
              {/* Gradient overlay */}
              <div
                className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
              />

              <div className="relative z-10">
                {/* Icon + Badge */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800/50 text-zinc-300 group-hover:text-white transition-colors border border-zinc-700/30">
                    {tool.icon}
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${tool.badgeColor}`}
                  >
                    {tool.badge}
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-lg font-extrabold text-white tracking-tight mb-1">
                  {tool.title}
                </h2>
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                  {tool.subtitle}
                </p>

                {/* Description */}
                <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                  {tool.description}
                </p>

                {/* CTA */}
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 group-hover:text-white transition-colors">
                  <span>Open Tool</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="transition-transform group-hover:translate-x-1"
                  >
                    <path d="M5 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Features strip */}
        <div className="mt-12 sm:mt-16 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
          {["MP4", "WebM", "GIF", "MOV", "PNG Seq", "Transparent BG", "Up to 4K", "60 FPS"].map((feat) => (
            <span key={feat} className="flex items-center gap-1.5">
              <span className="text-emerald-500">✓</span> {feat}
            </span>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex flex-col sm:flex-row justify-between items-center gap-2 px-6 sm:px-10 py-5 text-[11px] text-zinc-600">
        <div>© 2026 ZCD Studio. All rights reserved.</div>
        <div className="flex gap-4">
          <span className="text-zinc-700">by Zecodark</span>
        </div>
      </footer>
    </div>
  );
}
