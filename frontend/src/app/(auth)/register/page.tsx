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

    return (
        <div className="min-h-screen flex items-center justify-center bg-black px-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-semibold text-white">SnapFace</h1>
                    <p className="text-zinc-400 mt-2 text-sm">Create your photographer account</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-5">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm text-zinc-400 mb-1.5">Full name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition"
                            placeholder="Your name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-400 mb-1.5">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-400 mb-1.5">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition"
                            placeholder="Min 6 characters"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition"
                    >
                        {loading ? "Creating account..." : "Create account"}
                    </button>

                    <p className="text-center text-sm text-zinc-500">
                        Already have an account?{" "}
                        <Link href="/login" className="text-violet-400 hover:text-violet-300">
                            Sign in
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}