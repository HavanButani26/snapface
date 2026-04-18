"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { eventService } from "@/lib/events";
import Link from "next/link";

export default function NewEventPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [isPasswordProtected, setIsPasswordProtected] = useState(false);
    const [albumPassword, setAlbumPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const event = await eventService.create({
                name,
                description: description || undefined,
                event_date: eventDate ? `${eventDate}T00:00:00` : undefined,
                is_password_protected: isPasswordProtected,
                album_password: isPasswordProtected ? albumPassword : undefined,
            });
            router.push(`/events/${event.id}`);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to create event");
        } finally {
            setLoading(false);
        }
    }

    const inputClass =
        "w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white";

    return (
        <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-6">
                <Link href="/events" className="text-slate-400 hover:text-slate-700 text-sm transition">
                    ← Events
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-sm text-slate-600 font-medium">New event</span>
            </div>

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Create new event</h1>
                <p className="text-slate-500 text-sm mt-1">Set up a new photo album for your event</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Row 1 — Event name + Event date */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Event name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className={inputClass}
                                placeholder="e.g. Raj & Priya Wedding"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Event date
                            </label>
                            <input
                                type="date"
                                value={eventDate}
                                onChange={(e) => setEventDate(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                    </div>

                    {/* Row 2 — Description full width */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            className={`${inputClass} resize-none`}
                            placeholder="Optional description for your guests"
                        />
                    </div>

                    {/* Row 3 — Password protect toggle */}
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <input
                            type="checkbox"
                            id="password-protect"
                            checked={isPasswordProtected}
                            onChange={(e) => setIsPasswordProtected(e.target.checked)}
                            className="w-4 h-4 accent-blue-600 cursor-pointer"
                        />
                        <div>
                            <label htmlFor="password-protect" className="text-sm font-medium text-slate-700 cursor-pointer">
                                Password protect this album
                            </label>
                            <p className="text-xs text-slate-400 mt-0.5">Guests will need a password to access photos</p>
                        </div>
                    </div>

                    {/* Row 4 — Album password (conditional) */}
                    {isPasswordProtected && (
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Album password <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={albumPassword}
                                    onChange={(e) => setAlbumPassword(e.target.value)}
                                    required={isPasswordProtected}
                                    className={inputClass}
                                    placeholder="Guests will need this to access"
                                />
                            </div>
                            <div className="flex items-end pb-0.5">
                                <div className="w-full p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 leading-relaxed">
                                    Share this password only with your guests. It cannot be recovered if lost.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Divider */}
                    <div className="border-t border-slate-100 pt-4">
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-3 rounded-xl text-sm transition"
                            >
                                {loading ? "Creating event..." : "Create event"}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-8 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 rounded-xl text-sm transition font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>

                </form>
            </div>
        </div>
    );
}