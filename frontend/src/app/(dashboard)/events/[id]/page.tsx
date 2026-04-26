"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { eventService } from "@/lib/events";
import Link from "next/link";
import type { Event } from "@/types";

export default function EventDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [event, setEvent] = useState<Event | null>(null);
    const [qr, setQr] = useState<{ qr_base64: string; guest_url: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [generatingReel, setGeneratingReel] = useState(false);

    async function handleGenerateReel() {
        setGeneratingReel(true);
        try {
            const token = localStorage.getItem("token") || "";
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/reel/generate/${id}`,
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            if (!res.ok) throw new Error("Failed");
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `snapface_reel.mp4`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            alert("Reel generation failed. Make sure you have at least 3 processed photos.");
        } finally {
            setGeneratingReel(false);
        }
    }

    useEffect(() => {
        Promise.all([eventService.get(id), eventService.getQR(id)]).then(
            ([eventData, qrData]) => {
                setEvent(eventData);
                setQr(qrData);
                setLoading(false);
            }
        );
    }, [id]);

    function handleCopy() {
        if (!qr) return;
        navigator.clipboard.writeText(qr.guest_url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    if (loading) return (
        <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading...</div>
    );
    if (!event) return (
        <div className="text-slate-400 text-sm">Event not found</div>
    );

    return (
        <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-6">
                <Link href="/events" className="text-slate-400 hover:text-slate-700 text-sm transition">
                    ← Events
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-sm text-slate-600 font-medium truncate max-w-xs">{event.name}</span>
            </div>

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{event.name}</h1>
                    {event.description && (
                        <p className="text-slate-500 text-sm mt-1">{event.description}</p>
                    )}
                </div>
                <span className={`text-xs px-3 py-1.5 rounded-full font-medium border ${event.is_active
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}>
                    {event.is_active ? "Active" : "Inactive"}
                </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                    { label: "Photos", value: event.photo_count, icon: "📸" },
                    {
                        label: "Event date",
                        value: event.event_date
                            ? new Date(event.event_date).toLocaleDateString("en-IN")
                            : "Not set",
                        icon: "📅",
                    },
                    {
                        label: "Access",
                        value: event.is_password_protected ? "Protected" : "Open",
                        icon: event.is_password_protected ? "🔒" : "🔓",
                    },
                ].map((s) => (
                    <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                        <p className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                            <span>{s.icon}</span> {s.label}
                        </p>
                        <p className="text-lg font-semibold text-slate-900">{s.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* QR Code */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <h2 className="font-semibold text-slate-900 mb-4">Guest QR code</h2>
                    {qr && (
                        <div className="flex flex-col items-center gap-4">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <img
                                    src={`data:image/png;base64,${qr.qr_base64}`}
                                    alt="QR Code"
                                    className="w-36 h-36"
                                />
                            </div>
                            <p className="text-xs text-slate-400 text-center break-all">{qr.guest_url}</p>
                            <button
                                onClick={handleCopy}
                                className={`w-full text-sm py-2 rounded-lg border transition font-medium ${copied
                                    ? "bg-green-50 border-green-200 text-green-700"
                                    : "border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600"
                                    }`}
                            >
                                {copied ? "✓ Copied!" : "Copy guest link"}
                            </button>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <h2 className="font-semibold text-slate-900 mb-4">Actions</h2>
                    <div className="space-y-2.5">
                        <button
                            onClick={() => router.push(`/events/${id}/upload`)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2.5 rounded-lg transition font-medium"
                        >
                            📤 Upload photos
                        </button>
                        <button
                            onClick={() => window.open(`/guest/${event.qr_token}`, "_blank")}
                            className="w-full border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 text-sm py-2.5 rounded-lg transition font-medium"
                        >
                            👁 Preview guest view
                        </button>
                        <button
                            onClick={() => router.push(`/events/${id}/photos`)}
                            className="w-full border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 text-sm py-2.5 rounded-lg transition font-medium"
                        >
                            🖼 View all photos
                        </button>
                        <button
                            onClick={() => router.push(`/events/${id}/capsule`)}
                            className="w-full border border-slate-200 hover:border-amber-300 text-slate-600 hover:text-amber-600 text-sm py-2.5 rounded-lg transition font-medium"
                        >
                            ⏳ Time capsule
                        </button>
                        <button
                            onClick={() => router.push(`/events/${id}/reel`)}
                            className="w-full border border-slate-200 hover:border-violet-300 text-slate-600 hover:text-violet-600 text-sm py-2.5 rounded-lg transition font-medium"
                        >
                            🎬 Reel studio
                        </button>
                        <button
                            onClick={() => router.push(`/events/${id}/analytics`)}
                            className="w-full border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 text-sm py-2.5 rounded-lg transition font-medium"
                        >
                            📊 View analytics
                        </button>
                        <button
                            onClick={() => router.push(`/events/${id}/smart-album`)}
                            className="w-full border border-slate-200 hover:border-emerald-300 text-slate-600 hover:text-emerald-600 text-sm py-2.5 rounded-lg transition font-medium"
                        >
                            🤖 Smart album
                        </button>
                        <button
                            onClick={() => router.push(`/events/${id}/duplicates`)}
                            className="w-full border border-slate-200 hover:border-red-300 text-slate-600 hover:text-red-600 text-sm py-2.5 rounded-lg transition font-medium"
                        >
                            🔍 Duplicate detector
                        </button>
                        <button
                            onClick={() => router.push(`/events/${id}/countdown`)}
                            className="w-full border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 text-sm py-2.5 rounded-lg transition font-medium"
                        >
                            ⏰ Event countdown
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}