"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { eventService } from "@/lib/events";
import { authService } from "@/lib/auth";
import type { Event } from "@/types";
import { subscriptionService } from "@/lib/subscription";
import { useModal } from "@/lib/modal";

export default function DashboardPage() {
    const router = useRouter();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<ReturnType<typeof authService.getUser>>(null);
    const [sub, setSub] = useState<any>(null);
    const { confirm, toast } = useModal();

    useEffect(() => {
        setUser(authService.getUser());
        Promise.all([
            eventService.list(),
            subscriptionService.getMySubscription(),
        ]).then(([data, subData]) => {
            setEvents(data);
            setSub(subData);
            setLoading(false);
        });
    }, []);

    // useEffect(() => {
    //     setUser(authService.getUser());
    //     eventService.list().then((data) => {
    //         setEvents(data);
    //         setLoading(false);
    //     });
    // }, []);

    const totalPhotos = events.reduce((sum, e) => sum + e.photo_count, 0);
    const activeEvents = events.filter((e) => e.is_active).length;

    async function handleDelete(id: string, e: React.MouseEvent) {
        e.stopPropagation();
        const ok = await confirm({
            title: "Delete event?",
            message: "This will permanently delete the event and all its photos. This cannot be undone.",
            confirmLabel: "Yes, delete",
            cancelLabel: "Keep it",
            variant: "danger",
        });
        if (!ok) return;
        await eventService.delete(id);
        setEvents((prev) => prev.filter((ev) => ev.id !== id));
        toast("Event deleted successfully", "success");
    }

    const stats = [
        { icon: "📅", label: "Total events", value: events.length, bg: "bg-blue-50", iconBg: "bg-blue-100", text: "text-blue-700" },
        { icon: "✅", label: "Active events", value: activeEvents, bg: "bg-green-50", iconBg: "bg-green-100", text: "text-green-700" },
        { icon: "📸", label: "Total photos", value: totalPhotos, bg: "bg-violet-50", iconBg: "bg-violet-100", text: "text-violet-700" },
        { icon: "🤖", label: "AI accuracy", value: "99.9%", bg: "bg-amber-50", iconBg: "bg-amber-100", text: "text-amber-700" },
    ];

    return (
        <div>
            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-3 mb-6">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
                        Welcome back, {user?.name?.split(" ")[0]} 👋
                    </h1>
                    <p className="text-slate-500 text-xs sm:text-sm mt-1">
                        Here's what's happening with your events today.
                    </p>
                </div>
                <Link
                    href="/events/new"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl transition font-semibold shadow-sm shadow-blue-200 flex items-center gap-1.5 flex-shrink-0"
                >
                    <span className="text-base leading-none">+</span>
                    <span className="hidden sm:inline">New event</span>
                    <span className="sm:hidden">New</span>
                </Link>
            </div>

            {/* ── Stat cards — 2x2 on mobile, 4 across on desktop ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {stats.map((s) => (
                    <div
                        key={s.label}
                        className={`${s.bg} border border-white rounded-2xl p-3 sm:p-4 flex items-center gap-3`}
                    >
                        <div className={`${s.iconBg} w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-lg sm:text-xl flex-shrink-0`}>
                            {s.icon}
                        </div>
                        <div className="min-w-0">
                            <p className={`text-lg sm:text-xl font-bold ${s.text} leading-tight`}>{s.value}</p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5 leading-tight">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {sub && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">Storage</span>
                            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-medium">
                                {sub.plan_label}
                            </span>
                        </div>
                        <Link href="/subscription" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                            {sub.plan_name === "free" ? "Upgrade →" : "Manage →"}
                        </Link>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                        <span>{sub.storage_used_label} used</span>
                        <span>{sub.storage_limit_label}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${sub.storage_percent >= 90 ? "bg-red-500" :
                                sub.storage_percent >= 70 ? "bg-amber-500" : "bg-blue-600"
                                }`}
                            style={{ width: `${Math.min(sub.storage_percent, 100)}%` }}
                        />
                    </div>
                </div>
            )}

            {/* ── Events section ── */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Section header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100">
                    <div>
                        <h2 className="text-sm sm:text-base font-semibold text-slate-900">Recent events</h2>
                        <p className="text-xs text-slate-400 mt-0.5">{events.length} total</p>
                    </div>
                    <Link href="/events" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                        View all →
                    </Link>
                </div>

                {loading ? (
                    <div className="px-6 py-16 text-center">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">Loading events...</p>
                    </div>
                ) : events.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <div className="text-5xl mb-4">📷</div>
                        <p className="text-slate-600 font-medium mb-1">No events yet</p>
                        <p className="text-slate-400 text-sm mb-5">Create your first event to get started</p>
                        <Link
                            href="/events/new"
                            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2.5 rounded-xl transition font-medium inline-block"
                        >
                            Create event
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* ── Desktop table (md and above) ── */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        {["Event name", "Photos", "Date", "Status", "Access", "Actions"].map((h) => (
                                            <th
                                                key={h}
                                                className={`text-left text-xs font-semibold text-slate-500 uppercase tracking-wide py-3 ${h === "Event name" ? "px-6" : h === "Actions" ? "px-6 text-right" : "px-4"
                                                    }`}
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {events.map((event) => (
                                        <tr
                                            key={event.id}
                                            onClick={() => router.push(`/events/${event.id}`)}
                                            className="hover:bg-slate-50 cursor-pointer transition group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold flex-shrink-0">
                                                        {event.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition truncate max-w-[160px]">
                                                            {event.name}
                                                        </p>
                                                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[160px]">
                                                            {event.description || "No description"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-sm font-semibold text-slate-900">{event.photo_count}</span>
                                                <span className="text-xs text-slate-400 ml-1">photos</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="text-sm text-slate-600">
                                                    {event.event_date
                                                        ? new Date(event.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                                                        : "—"}
                                                </p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${event.is_active
                                                    ? "bg-green-50 text-green-700 border border-green-200"
                                                    : "bg-slate-100 text-slate-500 border border-slate-200"
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${event.is_active ? "bg-green-500" : "bg-slate-400"}`} />
                                                    {event.is_active ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                                    {event.is_password_protected ? <><span>🔒</span> Protected</> : <><span>🔓</span> Open</>}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => router.push(`/events/${event.id}/upload`)}
                                                        className="text-xs text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-200 px-3 py-1.5 rounded-lg transition font-medium"
                                                    >
                                                        Upload
                                                    </button>
                                                    <button
                                                        onClick={() => router.push(`/events/${event.id}`)}
                                                        className="text-xs text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-200 px-3 py-1.5 rounded-lg transition font-medium"
                                                    >
                                                        Open
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDelete(event.id, e)}
                                                        className="text-xs text-slate-400 hover:text-red-500 border border-slate-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition font-medium"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* ── Mobile cards (below md) ── */}
                        <div className="md:hidden divide-y divide-slate-100">
                            {events.map((event) => (
                                <div
                                    key={event.id}
                                    onClick={() => router.push(`/events/${event.id}`)}
                                    className="px-4 py-4 hover:bg-slate-50 transition cursor-pointer"
                                >
                                    {/* Top row */}
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold flex-shrink-0">
                                                {event.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-900 truncate">{event.name}</p>
                                                <p className="text-xs text-slate-400 truncate">{event.description || "No description"}</p>
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${event.is_active
                                            ? "bg-green-50 text-green-700 border border-green-200"
                                            : "bg-slate-100 text-slate-500 border border-slate-200"
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${event.is_active ? "bg-green-500" : "bg-slate-400"}`} />
                                            {event.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </div>

                                    {/* Meta row */}
                                    <div className="flex items-center gap-4 mb-3 text-xs text-slate-500">
                                        <span>📸 {event.photo_count} photos</span>
                                        <span>
                                            📅 {event.event_date
                                                ? new Date(event.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                                                : "No date"}
                                        </span>
                                        <span>{event.is_password_protected ? "🔒 Protected" : "🔓 Open"}</span>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => router.push(`/events/${event.id}/upload`)}
                                            className="flex-1 text-xs text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 py-2 rounded-lg transition font-medium"
                                        >
                                            Upload
                                        </button>
                                        <button
                                            onClick={() => router.push(`/events/${event.id}`)}
                                            className="flex-1 text-xs text-slate-600 border border-slate-200 hover:bg-slate-50 py-2 rounded-lg transition font-medium"
                                        >
                                            Open
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(event.id, e)}
                                            className="flex-1 text-xs text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 py-2 rounded-lg transition font-medium"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        {events.length > 5 && (
                            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 text-center">
                                <Link href="/events" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                                    View all {events.length} events →
                                </Link>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}