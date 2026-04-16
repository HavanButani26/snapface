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
        <div className="min-h-screen bg-black text-white">
            <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <span className="text-lg font-semibold text-violet-400">SnapFace</span>
                    <div className="flex gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-3 py-1.5 rounded-lg text-sm transition ${pathname === link.href
                                        ? "bg-zinc-800 text-white"
                                        : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-zinc-400">{user?.name}</span>
                    <button
                        onClick={handleLogout}
                        className="text-sm text-zinc-500 hover:text-white transition"
                    >
                        Logout
                    </button>
                </div>
            </nav>
            <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
        </div>
    );
}