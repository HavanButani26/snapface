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
                    <h1 className="text-2xl font-semibold">Events</h1>
                    <p className="text-zinc-400 text-sm mt-1">Manage all your photo events</p>
                </div>
                <Link
                    href="/events/new"
                    className="bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-2 rounded-lg transition"
                >
                    + New event
                </Link>
            </div>

            {loading ? (
                <div className="text-zinc-500 text-sm">Loading...</div>
            ) : events.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
                    <p className="text-zinc-400 mb-4">No events yet. Create one to get started.</p>
                    <Link href="/events/new" className="bg-violet-600 hover:bg-violet-500 text-white text-sm px-5 py-2.5 rounded-lg transition">
                        Create event
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {events.map((event) => (
                        <div
                            key={event.id}
                            className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center justify-between"
                        >
                            <div>
                                <p className="font-medium text-white">{event.name}</p>
                                <p className="text-sm text-zinc-400 mt-0.5">
                                    {event.photo_count} photos ·{" "}
                                    {event.event_date
                                        ? new Date(event.event_date).toLocaleDateString()
                                        : "No date"}
                                    {event.is_password_protected && " · 🔒 Password protected"}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-xs px-2.5 py-1 rounded-full ${event.is_active ? "bg-green-500/10 text-green-400" : "bg-zinc-700 text-zinc-400"
                                    }`}>
                                    {event.is_active ? "Active" : "Inactive"}
                                </span>
                                <Link
                                    href={`/events/${event.id}`}
                                    className="text-sm text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition"
                                >
                                    Open
                                </Link>
                                <button
                                    onClick={() => handleDelete(event.id)}
                                    className="text-sm text-red-500 hover:text-red-400 border border-zinc-700 hover:border-red-800 px-3 py-1.5 rounded-lg transition"
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