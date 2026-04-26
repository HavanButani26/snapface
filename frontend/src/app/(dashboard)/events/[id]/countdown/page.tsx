"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { eventService } from "@/lib/events";
import { useModal } from "@/lib/modal";
import type { Event } from "@/types";

interface Registration {
    email: string;
    name: string;
    registered_at: string;
}

export default function CountdownPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { toast, confirm } = useModal();

    const [event, setEvent] = useState<Event | null>(null);
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notifying, setNotifying] = useState(false);

    const [photosReadyAt, setPhotosReadyAt] = useState("");
    const [countdownMessage, setCountdownMessage] = useState("");
    const [hasCountdown, setHasCountdown] = useState(false);

    useEffect(() => {
        Promise.all([
            eventService.get(id),
            api.get(`/events/${id}/countdown/registrations`).catch(() => ({ data: { registrations: [] } })),
        ]).then(([ev, reg]) => {
            setEvent(ev);
            setRegistrations(reg.data.registrations || []);
            setLoading(false);
        });
    }, [id]);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            await api.patch(`/events/${id}/countdown`, {
                photos_ready_at: photosReadyAt ? new Date(photosReadyAt).toISOString() : null,
                countdown_message: countdownMessage || null,
            });
            setHasCountdown(!!photosReadyAt);
            toast("Countdown saved! Guests will see it when they scan the QR code.", "success");
        } catch {
            toast("Failed to save countdown", "error");
        } finally {
            setSaving(false);
        }
    }

    async function handleRemoveCountdown() {
        const ok = await confirm({
            title: "Remove countdown?",
            message: "Guests will go directly to the selfie upload instead of seeing a countdown.",
            confirmLabel: "Remove",
            variant: "warning",
        });
        if (!ok) return;
        try {
            await api.patch(`/events/${id}/countdown`, {
                photos_ready_at: null,
                countdown_message: null,
            });
            setPhotosReadyAt("");
            setCountdownMessage("");
            setHasCountdown(false);
            toast("Countdown removed", "success");
        } catch {
            toast("Failed to remove countdown", "error");
        }
    }

    async function handleNotifyAll() {
        if (registrations.length === 0) {
            toast("No registered guests to notify", "warning");
            return;
        }
        const ok = await confirm({
            title: `Notify ${registrations.length} guests?`,
            message: "All registered guests will receive an email that photos are ready.",
            confirmLabel: "Send notifications",
            variant: "info",
        });
        if (!ok) return;
        setNotifying(true);
        try {
            const res = await api.post(`/events/${id}/countdown/notify-all`);
            toast(res.data.message, "success");
        } catch {
            toast("Failed to send notifications", "error");
        } finally {
            setNotifying(false);
        }
    }

    const inputClass = "w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-slate-50 focus:bg-white";

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="max-w-2xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-6">
                <Link href={`/events/${id}`} className="text-slate-400 hover:text-slate-700 text-sm transition">
                    ← Back to event
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-sm text-slate-600 font-medium">Event countdown</span>
            </div>

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">⏰ Event countdown</h1>
                <p className="text-slate-500 text-sm mt-1">
                    Show guests a countdown while you process photos. They can register to be notified when ready.
                </p>
            </div>

            {/* Setup form */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-5">
                <h2 className="text-sm font-semibold text-slate-900 mb-5">Countdown settings</h2>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Photos ready date & time
                        </label>
                        <input
                            type="datetime-local"
                            value={photosReadyAt}
                            onChange={(e) => setPhotosReadyAt(e.target.value)}
                            className={inputClass}
                        />
                        <p className="text-xs text-slate-400 mt-1">
                            Guests see a countdown until this date. After it passes, they go straight to selfie upload.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Message to guests (optional)
                        </label>
                        <textarea
                            value={countdownMessage}
                            onChange={(e) => setCountdownMessage(e.target.value)}
                            rows={3}
                            className={`${inputClass} resize-none`}
                            placeholder="e.g. Thanks for attending! We're editing your photos with love. Come back soon! ❤️"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition"
                        >
                            {saving ? "Saving..." : "⏰ Set countdown"}
                        </button>
                        {hasCountdown && (
                            <button
                                type="button"
                                onClick={handleRemoveCountdown}
                                className="px-5 border border-red-200 text-red-500 hover:bg-red-50 rounded-xl text-sm transition font-medium"
                            >
                                Remove
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Registrations */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900">
                            Registered guests
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {registrations.length} guest{registrations.length !== 1 ? "s" : ""} waiting for photos
                        </p>
                    </div>
                    {registrations.length > 0 && (
                        <button
                            onClick={handleNotifyAll}
                            disabled={notifying}
                            className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
                        >
                            {notifying ? "Sending..." : `📧 Notify all (${registrations.length})`}
                        </button>
                    )}
                </div>

                {registrations.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="text-3xl mb-3">📭</div>
                        <p className="text-slate-500 text-sm">
                            No guests registered yet. They'll register when they scan the QR code during the countdown.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                        {registrations.map((reg, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100"
                            >
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold flex-shrink-0">
                                    {(reg.name || reg.email).charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    {reg.name && (
                                        <p className="text-sm font-medium text-slate-900 truncate">{reg.name}</p>
                                    )}
                                    <p className="text-xs text-slate-500 truncate">{reg.email}</p>
                                </div>
                                <p className="text-xs text-slate-400 flex-shrink-0">
                                    {new Date(reg.registered_at).toLocaleDateString("en-IN", {
                                        day: "numeric", month: "short",
                                    })}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}