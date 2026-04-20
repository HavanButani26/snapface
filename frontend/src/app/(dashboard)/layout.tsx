"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { authService } from "@/lib/auth";
import type { User } from "@/types";

// ✅ Define OUTSIDE the component — stable on both server and client
const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: "🏠" },
    { href: "/events", label: "Events", icon: "📅" },
    { href: "/billing", label: "Billing", icon: "💰" },
    { href: "/subscription", label: "Subscription", icon: "⭐" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        if (!authService.isLoggedIn()) {
            router.push("/login");
            return;
        }
        setUser(authService.getUser());
    }, []);

    useEffect(() => {
        setMenuOpen(false);
    }, [pathname]);

    function handleLogout() {
        authService.clearSession();
        router.push("/login");
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
                <div className="w-full px-4 sm:px-6">
                    <div className="flex items-center justify-between h-14">

                        <div className="flex items-center gap-6">
                            <Link href="/dashboard" className="text-lg font-bold text-blue-600 flex-shrink-0">
                                SnapFace
                            </Link>
                            <div className="hidden sm:flex">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={`px-4 py-4 text-sm font-medium border-b-2 transition ${pathname === link.href
                                            ? "border-blue-600 text-blue-600"
                                            : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
                                            }`}
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="hidden sm:flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold">
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-sm text-slate-700 font-medium">{user?.name}</span>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="text-sm text-slate-400 hover:text-slate-700 transition border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-lg font-medium"
                                >
                                    Logout
                                </button>
                            </div>

                            <div className="flex sm:hidden items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold">
                                    {user?.name?.charAt(0).toUpperCase()}
                                </div>
                                <button
                                    onClick={() => setMenuOpen(!menuOpen)}
                                    className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
                                >
                                    <span className={`w-4 h-0.5 bg-slate-600 transition-all ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
                                    <span className={`w-4 h-0.5 bg-slate-600 transition-all ${menuOpen ? "opacity-0" : ""}`} />
                                    <span className={`w-4 h-0.5 bg-slate-600 transition-all ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {menuOpen && (
                    <div className="sm:hidden border-t border-slate-100 bg-white">
                        <div className="px-4 py-2">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition ${pathname === link.href
                                        ? "bg-blue-50 text-blue-600"
                                        : "text-slate-600 hover:bg-slate-50"
                                        }`}
                                >
                                    <span>{link.icon}</span>
                                    {link.label}
                                    {pathname === link.href && (
                                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
                                    )}
                                </Link>
                            ))}
                        </div>
                        <div className="px-4 py-3 border-t border-slate-100">
                            <div className="flex items-center gap-3 mb-3 px-3">
                                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                    {user?.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                                    <p className="text-xs text-slate-400">{user?.email}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition"
                            >
                                <span>🚪</span> Sign out
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            <main className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
                {children}
            </main>
        </div>
    );
}