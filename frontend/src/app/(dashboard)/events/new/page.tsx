"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { eventService } from "@/lib/events";

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
                event_date: eventDate || undefined,
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

    return (
        <div className="max-w-xl">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold">Create new event</h1>
                <p className="text-zinc-400 text-sm mt-1">Set up a new photo album for your event</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm text-zinc-400 mb-1.5">Event name *</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition"
                        placeholder="e.g. Raj & Priya Wedding"
                    />
                </div>

                <div>
                    <label className="block text-sm text-zinc-400 mb-1.5">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition resize-none"
                        placeholder="Optional description"
                    />
                </div>

                <div>
                    <label className="block text-sm text-zinc-400 mb-1.5">Event date</label>
                    <input
                        type="datetime-local"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        id="password-protect"
                        checked={isPasswordProtected}
                        onChange={(e) => setIsPasswordProtected(e.target.checked)}
                        className="w-4 h-4 accent-violet-500"
                    />
                    <label htmlFor="password-protect" className="text-sm text-zinc-300 cursor-pointer">
                        Password protect this album
                    </label>
                </div>

                {isPasswordProtected && (
                    <div>
                        <label className="block text-sm text-zinc-400 mb-1.5">Album password</label>
                        <input
                            type="text"
                            value={albumPassword}
                            onChange={(e) => setAlbumPassword(e.target.value)}
                            required={isPasswordProtected}
                            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition"
                            placeholder="Guests will need this to access"
                        />
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition"
                    >
                        {loading ? "Creating..." : "Create event"}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-4 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white rounded-lg text-sm transition"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}