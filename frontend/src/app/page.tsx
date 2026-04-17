"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authService } from "@/lib/auth";

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (authService.isLoggedIn()) {
      router.push("/dashboard");
      return;
    }
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-blue-600 tracking-tight">SnapFace</span>
          <div className="hidden md:flex items-center gap-6 text-sm text-slate-500">
            <a href="#features" className="hover:text-slate-900 transition">Features</a>
            <a href="#how" className="hover:text-slate-900 transition">How it works</a>
            <a href="#unique" className="hover:text-slate-900 transition">Unique</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 transition px-3 py-2 font-medium">
              Sign in
            </Link>
            <Link href="/register" className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition font-medium shadow-sm">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* background blobs */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-175 h-175 bg-blue-50 rounded-full blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute top-40 right-0 w-80 h-80 bg-indigo-100 rounded-full blur-3xl opacity-40 pointer-events-none" />
        <div className="absolute top-60 left-0 w-64 h-64 bg-sky-100 rounded-full blur-3xl opacity-40 pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          {/* pill badge */}
          <div
            className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-1.5 rounded-full mb-8 animate-fade-in"
            style={{ animationDelay: "0ms" }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            AI-powered · buffalo_l face recognition
          </div>

          <h1
            className="text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight mb-6 animate-fade-in-up"
            style={{ animationDelay: "100ms" }}
          >
            Share photos with
            <br />
            <span className="text-blue-600 relative">
              AI face recognition
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 400 12" fill="none">
                <path d="M2 9C60 3 150 1 200 4C250 7 340 10 398 6" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
              </svg>
            </span>
          </h1>

          <p
            className="text-lg text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up"
            style={{ animationDelay: "200ms" }}
          >
            Upload event photos once. Guests scan a QR code, upload a selfie,
            and instantly receive every photo they appear in — no sorting, no scrolling.
          </p>

          <div
            className="flex items-center justify-center gap-4 flex-wrap animate-fade-in-up"
            style={{ animationDelay: "300ms" }}
          >
            <Link
              href="/register"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-xl transition shadow-lg shadow-blue-200 text-sm"
            >
              Start for free →
            </Link>
            <Link
              href="/login"
              className="border border-slate-200 hover:border-slate-300 bg-white text-slate-700 font-medium px-8 py-3.5 rounded-xl transition text-sm"
            >
              Sign in
            </Link>
          </div>

          {/* trust badges */}
          <div
            className="flex items-center justify-center gap-8 mt-12 animate-fade-in"
            style={{ animationDelay: "500ms" }}
          >
            {[
              { val: "99.9%", label: "Face accuracy" },
              { val: "< 2s", label: "Match time" },
              { val: "Free", label: "To start" },
            ].map((b) => (
              <div key={b.val} className="text-center">
                <div className="text-2xl font-bold text-blue-600">{b.val}</div>
                <div className="text-xs text-slate-400 mt-0.5">{b.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Dashboard preview card ── */}
        <div
          className="max-w-3xl mx-auto mt-16 animate-fade-in-up"
          style={{ animationDelay: "400ms" }}
        >
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200 overflow-hidden">
            {/* fake browser bar */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-1 text-xs text-slate-400 ml-4">
                snapface.app/dashboard
              </div>
            </div>
            {/* fake dashboard content */}
            <div className="p-6 bg-slate-50">
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Total events", val: "12", color: "bg-blue-50 text-blue-600" },
                  { label: "Active events", val: "4", color: "bg-green-50 text-green-600" },
                  { label: "Total photos", val: "3,842", color: "bg-violet-50 text-violet-600" },
                ].map((s) => (
                  <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                    <p className={`text-xl font-bold ${s.color.split(" ")[1]}`}>{s.val}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {[
                  { name: "Raj & Priya Wedding", photos: 842, active: true },
                  { name: "Tech Fest 2025", photos: 310, active: true },
                  { name: "Farewell Party", photos: 156, active: false },
                ].map((e) => (
                  <div key={e.name} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{e.name}</p>
                      <p className="text-xs text-slate-400">{e.photos} photos</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${e.active ? "bg-green-50 text-green-700 border border-green-200" : "bg-slate-100 text-slate-500"
                      }`}>
                      {e.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="py-24 px-6 bg-slate-50 border-y border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">Simple process</p>
            <h2 className="text-3xl font-bold text-slate-900">How SnapFace works</h2>
            <p className="text-slate-500 mt-3 text-sm max-w-xl mx-auto">
              From event setup to photo delivery in minutes. No complicated setup required.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-4 relative">
            {/* connector line */}
            <div className="absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-blue-100 hidden md:block" />

            {[
              { step: "01", icon: "📅", title: "Create event", desc: "Set up an album for your event in seconds" },
              { step: "02", icon: "📤", title: "Upload photos", desc: "Bulk upload all event photos to Cloudinary CDN" },
              { step: "03", icon: "📱", title: "Share QR code", desc: "Guests scan a QR code to access the gallery" },
              { step: "04", icon: "🤳", title: "Get matched", desc: "Guests selfie-match and download their photos instantly" },
            ].map((s) => (
              <div key={s.step} className="relative flex flex-col items-center text-center group">
                <div className="w-16 h-16 rounded-2xl bg-white border-2 border-blue-100 group-hover:border-blue-400 shadow-sm flex items-center justify-center text-2xl mb-4 transition relative z-10">
                  {s.icon}
                </div>
                <span className="text-xs font-bold text-blue-400 mb-1">{s.step}</span>
                <h3 className="font-semibold text-slate-900 text-sm mb-1">{s.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">Core platform</p>
            <h2 className="text-3xl font-bold text-slate-900">Everything you need</h2>
          </div>

          <div className="grid grid-cols-3 gap-5">
            {[
              { icon: "👤", title: "AI face recognition", desc: "buffalo_l model — 99.9% accuracy. Guests find their photos by uploading one selfie." },
              { icon: "📱", title: "QR code sharing", desc: "One QR per event. Guests scan and go directly to their personalized photo gallery." },
              { icon: "🔒", title: "Password protection", desc: "Lock albums with a password. Only invited guests can access your photos." },
              { icon: "☁️", title: "Cloudinary CDN", desc: "Full-resolution delivery worldwide. Fast, compressed thumbnails for gallery previews." },
              { icon: "🖼️", title: "Bulk upload", desc: "Upload hundreds of photos at once with drag-and-drop. No limit on album size." },
              { icon: "📊", title: "Event analytics", desc: "Track downloads, guest visits, and photo matches from your dashboard." },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md rounded-2xl p-6 transition group cursor-default"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center text-xl mb-4 transition">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2 text-sm">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Unique features ── */}
      <section id="unique" className="py-24 px-6 bg-linear-to-b from-blue-50 to-white border-t border-blue-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">Only on SnapFace</p>
            <h2 className="text-3xl font-bold text-slate-900">Features you won't find elsewhere</h2>
            <p className="text-slate-500 mt-3 text-sm max-w-xl mx-auto">
              We went beyond photo sharing. These features are unique to SnapFace.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {[
              {
                icon: "😊",
                badge: "Unique",
                title: "Emotion filter gallery",
                desc: "AI detects the emotion in every photo — happy, laughing, candid, surprised. Guests filter their gallery by mood.",
                color: "bg-amber-50 border-amber-200 text-amber-700",
              },
              {
                icon: "⏳",
                badge: "Unique",
                title: "Memory time capsule",
                desc: "Lock a set of photos until a future date. Guests get a countdown page and an email when the capsule unlocks.",
                color: "bg-violet-50 border-violet-200 text-violet-700",
              },
              {
                icon: "🎬",
                badge: "Unique",
                title: "Auto story reel",
                desc: "AI picks your best 15 shots by sharpness + emotion score and auto-generates a 30-second personal reel.",
                color: "bg-green-50 border-green-200 text-green-700",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-white border border-slate-200 hover:border-blue-300 hover:shadow-lg rounded-2xl p-6 transition group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -translate-y-8 translate-x-8 opacity-50" />
                <div className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full border mb-4 ${f.color}`}>
                  {f.badge}
                </div>
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-blue-600 rounded-3xl p-12 relative overflow-hidden shadow-2xl shadow-blue-200">
            <div className="absolute top-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -translate-x-16 -translate-y-16" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full translate-x-16 translate-y-16" />
            <div className="relative">
              <h2 className="text-3xl font-bold text-white mb-4">Ready to transform your photo sharing?</h2>
              <p className="text-blue-100 mb-8 text-sm leading-relaxed max-w-lg mx-auto">
                Create your first event in under 2 minutes. No credit card required.
              </p>
              <Link
                href="/register"
                className="inline-block bg-white text-blue-600 font-bold px-8 py-3.5 rounded-xl hover:bg-blue-50 transition text-sm shadow-lg"
              >
                Get started for free →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-100 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-blue-600 font-bold">SnapFace</span>
          <p className="text-xs text-slate-400">Built for college final year project · Powered by InsightFace + Next.js</p>
          <div className="flex gap-4 text-xs text-slate-400">
            <Link href="/login" className="hover:text-slate-600 transition">Sign in</Link>
            <Link href="/register" className="hover:text-slate-600 transition">Register</Link>
          </div>
        </div>
      </footer>

      {/* ── Animation styles ── */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease both;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease both;
        }
      `}</style>
    </div>
  );
}