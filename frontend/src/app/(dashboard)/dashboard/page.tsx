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
                <h1 className="text-2xl font-bold text-slate-900">
                    Welcome back, {user?.name} 👋
                </h1>
                <p className="text-slate-500 mt-1 text-sm">Here's an overview of your work</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-10">
                {[
                    { label: "Total events", value: events.length, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Active events", value: activeEvents, color: "text-green-600", bg: "bg-green-50" },
                    { label: "Total photos", value: totalPhotos, color: "text-violet-600", bg: "bg-violet-50" },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                        <div className={`inline-flex w-10 h-10 rounded-lg ${stat.bg} items-center justify-center mb-3`}>
                            <span className={`text-lg font-bold ${stat.color}`}>{stat.value}</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                        <p className="text-slate-500 text-sm mt-0.5">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Recent events */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Recent events</h2>
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
                    <div className="text-4xl mb-4">📸</div>
                    <p className="text-slate-500 mb-4">No events yet. Create your first one!</p>
                    <Link
                        href="/events/new"
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2.5 rounded-lg transition font-medium"
                    >
                        Create your first event
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {events.slice(0, 5).map((event) => (
                        <Link
                            key={event.id}
                            href={`/events/${event.id}`}
                            className="bg-white border border-slate-200 hover:border-blue-300 hover:shadow-sm rounded-xl p-5 flex items-center justify-between transition group"
                        >
                            <div>
                                <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition">
                                    {event.name}
                                </p>
                                <p className="text-sm text-slate-400 mt-0.5">
                                    {event.photo_count} photos ·{" "}
                                    {event.event_date
                                        ? new Date(event.event_date).toLocaleDateString("en-IN")
                                        : "No date set"}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${event.is_active
                                    ? "bg-green-50 text-green-700 border border-green-200"
                                    : "bg-slate-100 text-slate-500"
                                    }`}>
                                    {event.is_active ? "Active" : "Inactive"}
                                </span>
                                <span className="text-slate-300 group-hover:text-blue-400 transition text-lg">→</span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}