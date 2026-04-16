"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { authService } from "@/lib/auth";
import type { User } from "@/types";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        if (!authService.isLoggedIn()) {
            router.push("/login");
            return;
        }
        setUser(authService.getUser());
    }, []);

    function handleLogout() {
        authService.clearSession();
        router.push("/login");
    }

    const navLinks = [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/events", label: "Events" },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="bg-white border-b border-slate-200 px-6 py-0 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto flex items-center justify-between h-14">
                    <div className="flex items-center gap-8">
                        <Link href="/dashboard" className="text-lg font-bold text-blue-600">
                            SnapFace
                        </Link>
                        <div className="flex">
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
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-semibold">
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-slate-700 font-medium">{user?.name}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-sm text-slate-500 hover:text-slate-900 transition"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </nav>
            <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
        </div>
    );
}