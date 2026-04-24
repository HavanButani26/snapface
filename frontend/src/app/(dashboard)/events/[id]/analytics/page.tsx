"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { analyticsService, EventAnalyticsData } from "@/lib/analytics";
import { eventService } from "@/lib/events";
import type { Event } from "@/types";

const actionColors: Record<string, string> = {
    qr_scan: "bg-blue-100 text-blue-700",
    selfie_match: "bg-green-100 text-green-700",
    no_match: "bg-red-100 text-red-700",
    photo_download: "bg-violet-100 text-violet-700",
    gallery_view: "bg-amber-100 text-amber-700",
    gallery_share: "bg-pink-100 text-pink-700",
};

const actionIcons: Record<string, string> = {
    qr_scan: "📱",
    selfie_match: "✅",
    no_match: "😔",
    photo_download: "📥",
    gallery_view: "👁️",
    gallery_share: "🔗",
};

function StatCard({
    label, value, sub, icon, color,
}: {
    label: string; value: string | number;
    sub?: string; icon: string; color: string;
}) {
    return (
        <div className={`${color} border border-white rounded-2xl p-4 flex items-center gap-3`}>
            <div className="w-10 h-10 bg-white/60 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xl font-bold leading-tight">{value}</p>
                <p className="text-xs font-medium opacity-80 mt-0.5">{label}</p>
                {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
            <p className="font-semibold text-slate-900 mb-1">{label}</p>
            {payload.map((p: any) => (
                <div key={p.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                    <span className="text-slate-500">{p.name}:</span>
                    <span className="font-semibold">{p.value}</span>
                </div>
            ))}
        </div>
    );
}

export default function EventAnalyticsPage() {
    const { id } = useParams<{ id: string }>();
    const [event, setEvent] = useState<Event | null>(null);
    const [data, setData] = useState<EventAnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            eventService.get(id),
            analyticsService.getEventAnalytics(id),
        ]).then(([ev, ana]) => {
            setEvent(ev);
            setData(ana);
            setLoading(false);
        });
    }, [id]);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (!data) return null;

    const { summary } = data;

    // Peak hour
    const peakHour = data.hourly_distribution.reduce(
        (max, h) => h.visits > max.visits ? h : max,
        { hour: "—", visits: 0 }
    );

    return (
        <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-6">
                <Link href={`/events/${id}`} className="text-slate-400 hover:text-slate-700 text-sm transition">
                    ← Back to event
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-sm text-slate-600 font-medium">Analytics</span>
            </div>

            <div className="flex items-start justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Event analytics</h1>
                    <p className="text-slate-500 text-sm mt-1">{event?.name}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-center">
                    <p className="text-2xl font-bold text-blue-600">{summary.match_rate}%</p>
                    <p className="text-xs text-blue-500 font-medium">Match rate</p>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <StatCard label="QR scans" value={summary.qr_scans} icon="📱" color="bg-blue-50 text-blue-800" />
                <StatCard label="Guests matched" value={summary.selfie_matches} icon="✅" color="bg-green-50 text-green-800" />
                <StatCard label="No match" value={summary.no_matches} icon="😔" color="bg-red-50 text-red-800" />
                <StatCard label="Downloads" value={summary.photo_downloads} icon="📥" color="bg-violet-50 text-violet-800" />
                <StatCard label="Galleries" value={summary.total_galleries} icon="🔗" color="bg-amber-50 text-amber-800" />
                <StatCard label="Gallery views" value={summary.gallery_views} icon="👁️" color="bg-pink-50 text-pink-800" />
                <StatCard label="Total photos" value={summary.total_photos} icon="📸" color="bg-slate-100 text-slate-800" />
                <StatCard
                    label="Peak hour"
                    value={peakHour.visits > 0 ? peakHour.hour : "—"}
                    sub={peakHour.visits > 0 ? `${peakHour.visits} visits` : "No data"}
                    icon="⏰"
                    color="bg-indigo-50 text-indigo-800"
                />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">

                {/* Daily visits area chart */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="mb-4">
                        <h2 className="text-sm font-semibold text-slate-900">Guest visits</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Last 14 days</p>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={data.daily_visits} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="visitGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                            <XAxis
                                dataKey="short_date"
                                tick={{ fontSize: 10, fill: "#94A3B8" }}
                                axisLine={false} tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: "#94A3B8" }}
                                axisLine={false} tickLine={false}
                                allowDecimals={false} width={24}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="visits"
                                name="visits"
                                stroke="#2563EB"
                                strokeWidth={2}
                                fill="url(#visitGrad)"
                                dot={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Hourly distribution */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="mb-4">
                        <h2 className="text-sm font-semibold text-slate-900">Peak hours</h2>
                        <p className="text-xs text-slate-400 mt-0.5">When guests visit most</p>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart
                            data={data.hourly_distribution.filter((_, i) => i % 2 === 0)}
                            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                            barCategoryGap="20%"
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                            <XAxis
                                dataKey="hour"
                                tick={{ fontSize: 9, fill: "#94A3B8" }}
                                axisLine={false} tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: "#94A3B8" }}
                                axisLine={false} tickLine={false}
                                allowDecimals={false} width={24}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="visits" name="visits" fill="#2563EB" radius={[3, 3, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Top downloaded photos */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-900 mb-4">Most downloaded photos</h2>
                    {data.top_photos.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm">
                            No downloads yet
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {data.top_photos.map((photo, idx) => (
                                <div key={photo.id} className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-slate-400 w-4">#{idx + 1}</span>
                                    <img
                                        src={photo.thumbnail_url || photo.url}
                                        alt=""
                                        className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-slate-100"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-600 rounded-full"
                                                style={{
                                                    width: `${Math.round((photo.downloads / Math.max(...data.top_photos.map(p => p.downloads), 1)) * 100)}%`
                                                }}
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {photo.downloads} download{photo.downloads !== 1 ? "s" : ""}
                                            {photo.dominant_emotion && (
                                                <span className="ml-2">{photo.dominant_emotion}</span>
                                            )}
                                        </p>
                                    </div>
                                    <a
                                        href={photo.url}
                                        target="_blank"
                                        className="text-xs text-blue-600 hover:text-blue-700 flex-shrink-0"
                                    >
                                        View
                                    </a>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent activity feed */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-900 mb-4">Recent activity</h2>
                    {data.recent_activity.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm">
                            No activity yet. Share the QR code with guests!
                        </div>
                    ) : (
                        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                            {data.recent_activity.map((log, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${actionColors[log.action] || "bg-slate-100 text-slate-600"
                                        }`}>
                                        {actionIcons[log.action] || "•"}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium text-slate-900 truncate">
                                            {log.guest_name !== "Anonymous" ? log.guest_name : "A guest"}{" "}
                                            <span className="font-normal text-slate-500">{log.label.toLowerCase()}</span>
                                        </p>
                                    </div>
                                    <span className="text-xs text-slate-400 flex-shrink-0">{log.time_ago}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}