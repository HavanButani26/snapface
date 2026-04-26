"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { duplicateService, DuplicatePair, DuplicatesData } from "@/lib/duplicates";
import { useModal } from "@/lib/modal";

function QualityBadge({ score, label }: { score: number | null; label: string }) {
    if (!score) return null;
    const normalized = Math.min(score / 1000, 1.0);
    const color =
        normalized > 0.7 ? "bg-green-100 text-green-700" :
            normalized > 0.4 ? "bg-amber-100 text-amber-700" :
                "bg-red-100 text-red-700";
    return (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
            {label}: {Math.round(normalized * 100)}%
        </span>
    );
}

export default function DuplicatesPage() {
    const { id } = useParams<{ id: string }>();
    const { confirm, toast } = useModal();

    const [data, setData] = useState<DuplicatesData | null>(null);
    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [resolving, setResolving] = useState<string | null>(null);
    const [resolvingAll, setResolvingAll] = useState(false);
    const [scanned, setScanned] = useState(false);

    async function handleScan() {
        setScanning(true);
        setData(null);
        setScanned(false);
        try {
            await duplicateService.scan(id);
            toast("Scanning photos for duplicates... This may take a minute.", "info");

            // Poll for results
            let attempts = 0;
            const poll = setInterval(async () => {
                attempts++;
                try {
                    const result = await duplicateService.getDuplicates(id);
                    setData(result);
                    setScanned(true);
                    setScanning(false);
                    clearInterval(poll);

                    if (result.total === 0) {
                        toast("No duplicates found! Your album is clean. ✓", "success");
                    } else {
                        toast(`Found ${result.total} duplicate pair${result.total !== 1 ? "s" : ""}`, "warning");
                    }
                } catch {
                    if (attempts > 20) {
                        clearInterval(poll);
                        setScanning(false);
                        toast("Scan timed out. Please try again.", "error");
                    }
                }
            }, 3000);

        } catch (err: any) {
            toast(err.response?.data?.detail || "Scan failed", "error");
            setScanning(false);
        }
    }

    async function handleResolve(dup: DuplicatePair, keepId: string) {
        const deleteId = keepId === dup.photo_a.id ? dup.photo_b.id : dup.photo_a.id;
        const ok = await confirm({
            title: "Delete duplicate photo?",
            message: "The lower quality photo will be permanently deleted from Cloudinary. This cannot be undone.",
            confirmLabel: "Delete duplicate",
            variant: "danger",
        });
        if (!ok) return;

        setResolving(dup.id);
        try {
            await duplicateService.resolve(dup.id, keepId);
            setData((prev) =>
                prev
                    ? { ...prev, duplicates: prev.duplicates.filter((d) => d.id !== dup.id), total: prev.total - 1 }
                    : prev
            );
            toast("Duplicate removed ✓", "success");
        } catch {
            toast("Failed to resolve duplicate", "error");
        } finally {
            setResolving(null);
        }
    }

    async function handleResolveAll() {
        if (!data || data.total === 0) return;
        const ok = await confirm({
            title: `Auto-resolve ${data.total} duplicates?`,
            message: "AI will keep the best quality photo in each pair and delete the rest. This cannot be undone.",
            confirmLabel: "Auto-resolve all",
            variant: "warning",
        });
        if (!ok) return;

        setResolvingAll(true);
        try {
            const res = await duplicateService.resolveAll(id);
            toast(res.message, "success");
            setData({ total: 0, duplicates: [] });
        } catch {
            toast("Auto-resolve failed", "error");
        } finally {
            setResolvingAll(false);
        }
    }

    return (
        <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-6">
                <Link href={`/events/${id}`} className="text-slate-400 hover:text-slate-700 text-sm transition">
                    ← Back to event
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-sm text-slate-600 font-medium">Duplicate detector</span>
            </div>

            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">🔍 Duplicate detector</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        AI finds near-duplicate photos and recommends which to keep
                    </p>
                </div>
                {data && data.total > 0 && (
                    <button
                        onClick={handleResolveAll}
                        disabled={resolvingAll}
                        className="text-sm bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white px-4 py-2 rounded-xl transition font-semibold"
                    >
                        {resolvingAll ? "Resolving..." : `⚡ Auto-resolve all (${data.total})`}
                    </button>
                )}
            </div>

            {/* How it works card */}
            {!scanned && !scanning && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
                    <h2 className="font-semibold text-slate-900 mb-4">How it works</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        {[
                            { icon: "🔍", title: "Perceptual hashing", desc: "Compares image fingerprints to find visually similar photos" },
                            { icon: "📊", title: "Quality scoring", desc: "Rates each photo by sharpness, face detection and emotion" },
                            { icon: "✅", title: "Smart recommendation", desc: "Recommends which duplicate to keep — the sharper, more expressive one" },
                        ].map((s) => (
                            <div key={s.title} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <div className="text-2xl mb-2">{s.icon}</div>
                                <p className="text-sm font-semibold text-slate-900 mb-1">{s.title}</p>
                                <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={handleScan}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-sm transition shadow-sm"
                    >
                        🔍 Scan for duplicates
                    </button>
                </div>
            )}

            {/* Scanning state */}
            {scanning && (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 shadow-sm text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-5" />
                    <h2 className="text-lg font-bold text-slate-900 mb-2">Scanning for duplicates...</h2>
                    <p className="text-slate-500 text-sm">
                        Downloading and comparing all photos using perceptual hashing.
                        This may take 1-2 minutes for large albums.
                    </p>
                </div>
            )}

            {/* Results */}
            {scanned && data && (
                <>
                    {/* Summary */}
                    <div className={`rounded-2xl p-5 mb-6 border ${data.total === 0
                        ? "bg-green-50 border-green-200"
                        : "bg-amber-50 border-amber-200"
                        }`}>
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{data.total === 0 ? "✅" : "⚠️"}</span>
                            <div className="flex-1">
                                <p className="font-bold text-slate-900">
                                    {data.total === 0
                                        ? "No duplicates found!"
                                        : `${data.total} duplicate pair${data.total !== 1 ? "s" : ""} found`}
                                </p>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    {data.total === 0
                                        ? "Your album is clean — every photo is unique."
                                        : `Resolving all duplicates will free up storage space.`}
                                </p>
                            </div>
                            <button
                                onClick={handleScan}
                                className="text-xs border border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-white transition"
                            >
                                Re-scan
                            </button>
                        </div>
                    </div>

                    {/* Duplicate pairs */}
                    <div className="space-y-4">
                        {data.duplicates.map((dup) => (
                            <div
                                key={dup.id}
                                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"
                            >
                                {/* Similarity header */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${dup.similarity > 0.97
                                            ? "bg-red-50 text-red-700 border-red-200"
                                            : dup.similarity > 0.93
                                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                                : "bg-yellow-50 text-yellow-700 border-yellow-200"
                                            }`}>
                                            {dup.similarity_percent} similar
                                        </div>
                                        {dup.similarity > 0.97 && (
                                            <span className="text-xs text-red-500 font-medium">Near-identical</span>
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-400">
                                        AI recommends keeping the{" "}
                                        <span className="font-semibold text-blue-600">
                                            {dup.recommended_keep === dup.photo_a.id ? "left" : "right"}
                                        </span>{" "}
                                        photo
                                    </span>
                                </div>

                                {/* Photo comparison */}
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { photo: dup.photo_a, side: "A", label: "left" },
                                        { photo: dup.photo_b, side: "B", label: "right" },
                                    ].map(({ photo, side, label }) => {
                                        const isRecommended = dup.recommended_keep === photo.id;
                                        return (
                                            <div
                                                key={`${dup.id}-${side}`}  // ← use dup.id + side for unique key
                                                className={`rounded-xl overflow-hidden border-2 transition ${isRecommended ? "border-green-400" : "border-slate-200"
                                                    }`}
                                            >
                                                {/* Recommended badge */}
                                                {isRecommended && (
                                                    <div className="bg-green-500 text-white text-xs font-bold px-3 py-1.5 text-center">
                                                        ⭐ AI recommends keeping this
                                                    </div>
                                                )}

                                                {/* Photo */}
                                                <div className="relative aspect-square bg-slate-100">
                                                    <img
                                                        src={photo.thumbnail_url || photo.url}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>

                                                {/* Stats */}
                                                <div className="p-3 space-y-2">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        <QualityBadge score={photo.sharpness_score} label="Sharpness" />
                                                        {photo.face_count > 0 && (
                                                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                                                👤 {photo.face_count}
                                                            </span>
                                                        )}
                                                        {photo.dominant_emotion && (
                                                            <span className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full capitalize">
                                                                {photo.dominant_emotion}
                                                            </span>
                                                        )}
                                                        {photo.scene_category && (
                                                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">
                                                                {photo.scene_category}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Action buttons */}
                                                    <div className="flex gap-2 pt-1">
                                                        <button
                                                            onClick={() => handleResolve(dup, photo.id)}
                                                            disabled={resolving === dup.id}
                                                            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg transition"
                                                        >
                                                            {resolving === dup.id ? "..." : "✓ Keep this"}
                                                        </button>
                                                        <a
                                                            href={photo.url}
                                                            target="_blank"
                                                            className="text-xs border border-slate-200 text-slate-600 px-3 py-2 rounded-lg hover:border-slate-300 transition"
                                                        >
                                                            View
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}