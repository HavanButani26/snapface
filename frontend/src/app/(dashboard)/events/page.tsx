"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { eventService } from "@/lib/events";
import type { Event } from "@/types";

export default function EventsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        eventService.list().then((data) => {
            setEvents(data);
            setLoading(false);
        });
    }, []);

    async function handleDelete(id: string) {
        if (!confirm("Delete this event? This cannot be undone.")) return;
        await eventService.delete(id);
        setEvents((prev) => prev.filter((e) => e.id !== id));
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Events</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage all your photo events</p>
                </div>
                <Link
                    href="/events/new"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition font-medium"
                >
                    + New event
                </Link>
            </div>

            {loading ? (
                <div className="text-slate-400 text-sm">Loading...</div>
            ) : events.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-16 text-center shadow-sm">
                    <div className="text-4xl mb-4">📷</div>
                    <p className="text-slate-500 mb-4">No events yet. Create one to get started.</p>
                    <Link
                        href="/events/new"
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2.5 rounded-lg transition font-medium"
                    >
                        Create event
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {events.map((event) => (
                        <div
                            key={event.id}
                            className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between shadow-sm"
                        >
                            <div>
                                <p className="font-semibold text-slate-900">{event.name}</p>
                                <p className="text-sm text-slate-400 mt-0.5">
                                    {event.photo_count} photos ·{" "}
                                    {event.event_date
                                        ? new Date(event.event_date).toLocaleDateString("en-IN")
                                        : "No date"}
                                    {event.is_password_protected && (
                                        <span className="ml-2 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                                            🔒 Protected
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${event.is_active
                                        ? "bg-green-50 text-green-700 border border-green-200"
                                        : "bg-slate-100 text-slate-500"
                                    }`}>
                                    {event.is_active ? "Active" : "Inactive"}
                                </span>
                                <Link
                                    href={`/events/${event.id}`}
                                    className="text-sm text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-300 px-3 py-1.5 rounded-lg transition font-medium"
                                >
                                    Open
                                </Link>
                                <button
                                    onClick={() => handleDelete(event.id)}
                                    className="text-sm text-red-500 hover:text-red-600 border border-slate-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition font-medium"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}