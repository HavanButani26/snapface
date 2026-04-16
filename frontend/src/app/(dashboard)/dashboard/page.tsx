"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { eventService } from "@/lib/events";
import { authService } from "@/lib/auth";
import type { Event } from "@/types";

export default function DashboardPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<ReturnType<typeof authService.getUser>>(null);

    useEffect(() => {
        setUser(authService.getUser());

        eventService.list().then((data) => {
            setEvents(data);
            setLoading(false);
        });
    }, []);

    const totalPhotos = events.reduce((sum, e) => sum + e.photo_count, 0);
    const activeEvents = events.filter((e) => e.is_active).length;

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-semibold">Welcome back, {user?.name} 👋</h1>
                <p className="text-zinc-400 mt-1 text-sm">Here's an overview of your work</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-10">
                {[
                    { label: "Total events", value: events.length },
                    { label: "Active events", value: activeEvents },
                    { label: "Total photos", value: totalPhotos },
                ].map((stat) => (
                    <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                        <p className="text-zinc-400 text-sm mb-1">{stat.label}</p>
                        <p className="text-3xl font-semibold text-white">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">Recent events</h2>
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
                    <p className="text-zinc-400 mb-4">No events yet</p>
                    <Link
                        href="/events/new"
                        className="bg-violet-600 hover:bg-violet-500 text-white text-sm px-5 py-2.5 rounded-lg transition"
                    >
                        Create your first event
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {events.slice(0, 5).map((event) => (
                        <Link
                            key={event.id}
                            href={`/events/${event.id}`}
                            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl p-5 flex items-center justify-between transition"
                        >
                            <div>
                                <p className="font-medium text-white">{event.name}</p>
                                <p className="text-sm text-zinc-400 mt-0.5">
                                    {event.photo_count} photos ·{" "}
                                    {event.event_date
                                        ? new Date(event.event_date).toLocaleDateString()
                                        : "No date set"}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span
                                    className={`text-xs px-2.5 py-1 rounded-full ${event.is_active
                                        ? "bg-green-500/10 text-green-400"
                                        : "bg-zinc-700 text-zinc-400"
                                        }`}
                                >
                                    {event.is_active ? "Active" : "Inactive"}
                                </span>
                                <span className="text-zinc-600">→</span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}