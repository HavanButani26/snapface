"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { capsuleService, CapsuleData } from "@/lib/capsule";
import Link from "next/link";

function Countdown({ seconds }: { seconds: number }) {
    const [remaining, setRemaining] = useState(seconds);

    useEffect(() => {
        if (remaining <= 0) return;
        const timer = setInterval(() => setRemaining((s) => Math.max(0, s - 1)), 1000);
        return () => clearInterval(timer);
    }, []);

    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);
    const mins = Math.floor((remaining % 3600) / 60);
    const secs = remaining % 60;

    return (
        <div className="grid grid-cols-4 gap-3 my-6">
            {[
                { val: days, label: "Days" },
                { val: hours, label: "Hours" },
                { val: mins, label: "Minutes" },
                { val: secs, label: "Seconds" },
            ].map((u) => (
                <div key={u.label} className="bg-blue-600 rounded-xl p-4 text-center text-white">
                    <div className="text-3xl font-bold">{String(u.val).padStart(2, "0")}</div>
                    <div className="text-xs text-blue-200 mt-1">{u.label}</div>
                </div>
            ))}
        </div>
    );
}

export default function CapsulePage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [capsule, setCapsule] = useState<CapsuleData | null>(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Form state
    const [unlockDate, setUnlockDate] = useState("");
    const [message, setMessage] = useState("");
    const [emails, setEmails] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        capsuleService
            .get(id)
            .then((data) => {
                setCapsule(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [id]);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setCreating(true);
        try {
            const emailList = emails
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);

            const data = await capsuleService.create(id, {
                unlock_at: new Date(unlockDate).toISOString(),
                message: message || undefined,
                notify_emails: emailList,
            });
            setCapsule(data);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to create capsule");
        } finally {
            setCreating(false);
        }
    }

    async function handleDelete() {
        if (!confirm("Delete this time capsule? This cannot be undone.")) return;
        setDeleting(true);
        await capsuleService.delete(id);
        setCapsule(null);
        setDeleting(false);
    }

    const inputClass =
        "w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

    return (
        <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-6">
                <Link href={`/events/${id}`} className="text-slate-400 hover:text-slate-700 text-sm transition">
                    ← Back to event
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-sm text-slate-600 font-medium">Time capsule</span>
            </div>

            <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">⏳</span>
                    <h1 className="text-2xl font-bold text-slate-900">Memory time capsule</h1>
                </div>
                <p className="text-slate-500 text-sm">
                    Lock this event's photos until a future date. Guests see a countdown and get access when the capsule unlocks.
                </p>
            </div>

            {loading ? (
                <div className="text-slate-400 text-sm">Loading...</div>
            ) : capsule ? (
                /* ── Existing capsule ── */
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-4 ${capsule.is_unlocked
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                        {capsule.is_unlocked ? "🔓 Unlocked" : "🔒 Locked"}
                    </div>

                    {!capsule.is_unlocked && (
                        <Countdown seconds={capsule.seconds_remaining} />
                    )}

                    {capsule.is_unlocked && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 my-4 text-center">
                            <p className="text-green-700 font-medium">🎉 Capsule is now unlocked!</p>
                            <p className="text-green-600 text-sm mt-1">Guests can now access all photos.</p>
                        </div>
                    )}

                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-500">Unlocks on</span>
                            <span className="font-medium text-slate-900">
                                {new Date(capsule.unlock_at).toLocaleString("en-IN")}
                            </span>
                        </div>
                        {capsule.message && (
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500">Message</span>
                                <span className="font-medium text-slate-900 max-w-xs text-right">{capsule.message}</span>
                            </div>
                        )}
                        {capsule.notify_emails && capsule.notify_emails.length > 0 && (
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500">Notify emails</span>
                                <span className="font-medium text-slate-900">{capsule.notify_emails.join(", ")}</span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="mt-6 w-full border border-red-200 hover:border-red-300 text-red-500 hover:text-red-600 text-sm py-2.5 rounded-xl transition font-medium"
                    >
                        {deleting ? "Deleting..." : "Delete capsule"}
                    </button>
                </div>
            ) : (
                /* ── Create capsule ── */
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                    <h2 className="font-semibold text-slate-900 mb-5">Set up a time capsule</h2>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-5">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleCreate} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Unlock date & time <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={unlockDate}
                                onChange={(e) => setUnlockDate(e.target.value)}
                                required
                                className={inputClass}
                            />
                            <p className="text-xs text-slate-400 mt-1">
                                Photos will be locked until this date.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Message to guests
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={3}
                                className={`${inputClass} resize-none`}
                                placeholder="e.g. These memories are locked until our 1st anniversary! ❤️"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Notify guests by email (optional)
                            </label>
                            <input
                                type="text"
                                value={emails}
                                onChange={(e) => setEmails(e.target.value)}
                                className={inputClass}
                                placeholder="guest1@example.com, guest2@example.com"
                            />
                            <p className="text-xs text-slate-400 mt-1">
                                Comma-separated. They'll be notified when the capsule unlocks.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={creating}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-3 rounded-xl text-sm transition"
                        >
                            {creating ? "Creating capsule..." : "⏳ Create time capsule"}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}