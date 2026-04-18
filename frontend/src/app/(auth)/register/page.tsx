"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/auth";
import Link from "next/link";

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const data = await authService.register(name, email, password);
            authService.saveSession(data);
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.response?.data?.detail || "Registration failed");
        } finally {
            setLoading(false);
        }
    }

    const inputClass =
        "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-slate-50 focus:bg-white";

    return (
        <div className="min-h-screen flex">
            {/* ── Left panel — branding ── */}
            <div className="hidden lg:flex lg:w-1/2 bg-blue-600 flex-col justify-between p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full -translate-y-48 translate-x-48 opacity-50" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-700 rounded-full translate-y-40 -translate-x-40 opacity-50" />

                {/* Logo */}
                <div className="relative">
                    <Link href="/" className="text-white text-2xl font-bold tracking-tight">
                        SnapFace
                    </Link>
                </div>

                {/* Center content */}
                <div className="relative space-y-6">
                    <div>
                        <h2 className="text-white text-3xl font-bold leading-tight mb-3">
                            Start sharing photos the smart way
                        </h2>
                        <p className="text-blue-100 text-sm leading-relaxed">
                            Join photographers who use AI to deliver event photos instantly.
                            No more sorting. No more scrolling.
                        </p>
                    </div>

                    {/* Steps */}
                    <div className="space-y-4">
                        {[
                            { num: "01", title: "Create an event", desc: "Set up in under 2 minutes" },
                            { num: "02", title: "Upload photos", desc: "Bulk upload with drag & drop" },
                            { num: "03", title: "Share QR code", desc: "Guests scan and find their photos" },
                            { num: "04", title: "AI does the rest", desc: "Face match in under 2 seconds" },
                        ].map((s) => (
                            <div key={s.num} className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                    {s.num}
                                </div>
                                <div>
                                    <p className="text-white font-medium text-sm">{s.title}</p>
                                    <p className="text-blue-200 text-xs">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom */}
                <div className="relative">
                    <div className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-2xl px-4 py-3">
                        <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center text-lg">
                            🎓
                        </div>
                        <div>
                            <p className="text-white text-sm font-medium">College Final Year Project</p>
                            <p className="text-blue-200 text-xs">Built with InsightFace + Next.js + FastAPI</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Right panel — form ── */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 bg-white">
                {/* Mobile logo */}
                <div className="lg:hidden mb-8 text-center">
                    <Link href="/" className="text-blue-600 text-2xl font-bold">SnapFace</Link>
                </div>

                <div className="max-w-md w-full mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full mb-4">
                            ✨ Free forever for small events
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Create your account</h1>
                        <p className="text-slate-500 text-sm">Set up your photographer account in seconds.</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-5 flex items-center gap-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Full name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className={inputClass}
                                placeholder="Havan Butani"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className={inputClass}
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className={`${inputClass} pr-12`}
                                    placeholder="Min 6 characters"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition text-xs font-medium"
                                >
                                    {showPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                            {/* Password strength indicator */}
                            {password.length > 0 && (
                                <div className="mt-2 flex gap-1">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div
                                            key={i}
                                            className={`h-1 flex-1 rounded-full transition-all ${password.length >= i * 3
                                                    ? password.length >= 10
                                                        ? "bg-green-500"
                                                        : password.length >= 6
                                                            ? "bg-blue-500"
                                                            : "bg-amber-400"
                                                    : "bg-slate-100"
                                                }`}
                                        />
                                    ))}
                                    <span className="text-xs text-slate-400 ml-2">
                                        {password.length >= 10 ? "Strong" : password.length >= 6 ? "Good" : "Weak"}
                                    </span>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition shadow-lg shadow-blue-100 mt-2"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                    Creating account...
                                </span>
                            ) : "Create free account →"}
                        </button>
                    </form>

                    {/* Terms */}
                    <p className="text-xs text-slate-400 text-center mt-4">
                        By creating an account you agree to our{" "}
                        <span className="text-slate-500 underline cursor-pointer">Terms</span> and{" "}
                        <span className="text-slate-500 underline cursor-pointer">Privacy Policy</span>
                    </p>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-xs text-slate-400">already have an account?</span>
                        <div className="flex-1 h-px bg-slate-100" />
                    </div>

                    <Link
                        href="/login"
                        className="w-full flex items-center justify-center border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-600 font-medium py-3 rounded-xl text-sm transition"
                    >
                        Sign in instead →
                    </Link>
                </div>
            </div>
        </div>
    );
}