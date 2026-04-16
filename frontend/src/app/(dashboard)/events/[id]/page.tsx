"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { eventService } from "@/lib/events";
import type { Event } from "@/types";

export default function EventDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [event, setEvent] = useState<Event | null>(null);
    const [qr, setQr] = useState<{ qr_base64: string; guest_url: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([eventService.get(id), eventService.getQR(id)]).then(
            ([eventData, qrData]) => {
                setEvent(eventData);
                setQr(qrData);
                setLoading(false);
            }
        );
    }, [id]);

    if (loading) return <div className="text-zinc-500 text-sm">Loading...</div>;
    if (!event) return <div className="text-zinc-500 text-sm">Event not found</div>;

    return (
        <div>
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => router.back()} className="text-zinc-500 hover:text-white text-sm transition">
                    ← Back
                </button>
                <span className="text-zinc-700">/</span>
                <h1 className="text-xl font-semibold">{event.name}</h1>
                <span className={`text-xs px-2.5 py-1 rounded-full ${event.is_active ? "bg-green-500/10 text-green-400" : "bg-zinc-700 text-zinc-400"
                    }`}>
                    {event.is_active ? "Active" : "Inactive"}
                </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                    { label: "Photos", value: event.photo_count },
                    { label: "Date", value: event.event_date ? new Date(event.event_date).toLocaleDateString() : "—" },
                    { label: "Password", value: event.is_password_protected ? "Protected" : "Open" },
                ].map((s) => (
                    <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                        <p className="text-zinc-400 text-xs mb-1">{s.label}</p>
                        <p className="text-lg font-medium">{s.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* QR Code card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h2 className="font-medium mb-4">Guest QR code</h2>
                    {qr && (
                        <div className="flex flex-col items-center gap-4">
                            <img
                                src={`data:image/png;base64,${qr.qr_base64}`}
                                alt="QR Code"
                                className="w-40 h-40 rounded-lg"
                            />
                            <p className="text-xs text-zinc-500 text-center break-all">{qr.guest_url}</p>
                            <button
                                onClick={() => navigator.clipboard.writeText(qr.guest_url)}
                                className="w-full border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white text-sm py-2 rounded-lg transition"
                            >
                                Copy guest link
                            </button>
                        </div>
                    )}
                </div>

                {/* Quick actions */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h2 className="font-medium mb-4">Actions</h2>
                    <div className="space-y-2">
                        <button
                            onClick={() => router.push(`/events/${id}/upload`)}
                            className="w-full bg-violet-600 hover:bg-violet-500 text-white text-sm py-2.5 rounded-lg transition"
                        >
                            Upload photos
                        </button>
                        <button
                            onClick={() => window.open(`/guest/${event.qr_token}`, "_blank")}
                            className="w-full border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white text-sm py-2.5 rounded-lg transition"
                        >
                            Preview guest view
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}