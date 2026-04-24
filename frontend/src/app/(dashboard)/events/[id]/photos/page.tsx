"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { photoService } from "@/lib/photos";
import { eventService } from "@/lib/events";
import { useModal } from "@/lib/modal";
import Link from "next/link";
import type { Photo, Event } from "@/types";

export default function PhotosPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { confirm, toast } = useModal();
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [selected, setSelected] = useState<Photo | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        Promise.all([
            photoService.getEventPhotos(id),
            eventService.get(id),
        ]).then(([ph, ev]) => {
            setPhotos(ph);
            setEvent(ev);
            setLoading(false);
        });
    }, [id]);

    async function handleDelete(photoId: string) {
        const ok = await confirm({
            title: "Delete photo?",
            message: "This photo will be permanently removed and cannot be recovered.",
            confirmLabel: "Delete photo",
            variant: "danger",
        });
        if (!ok) return;
        setDeleting(photoId);
        await photoService.delete(photoId);
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        setDeleting(null);
        toast("Photo deleted", "success");
    }

    async function handleDeleteSelected() {
        if (selectedIds.size === 0) return;
        const ok = await confirm({
            title: `Delete ${selectedIds.size} photos?`,
            message: "These photos will be permanently removed and cannot be recovered.",
            confirmLabel: `Delete ${selectedIds.size} photos`,
            variant: "danger",
        });
        if (!ok) return;
        for (const photoId of selectedIds) {
            await photoService.delete(photoId);
        }
        setPhotos((prev) => prev.filter((p) => !selectedIds.has(p.id)));
        setSelectedIds(new Set());
        setSelectMode(false);
        toast(`${selectedIds.size} photos deleted`, "success");
    }

    async function handleDownloadAll() {
        if (!event) return;
        setDownloading(true);
        try {
            await photoService.downloadAll(id, event.name);
            toast("ZIP downloaded successfully! 📦", "success");
        } catch {
            toast("Download failed. Please try again.", "error");
        } finally {
            setDownloading(false);
        }
    }

    async function handleDownloadSelected() {
        if (selectedIds.size === 0 || !event) return;
        setDownloading(true);
        try {
            const JSZip = (await import("jszip")).default;
            const zip = new JSZip();
            const folder = zip.folder(event.name.replace(/\s/g, "_"))!;
            const selectedPhotos = photos.filter((p) => selectedIds.has(p.id));

            await Promise.all(
                selectedPhotos.map(async (photo, idx) => {
                    const res = await fetch(photo.url);
                    const blob = await res.blob();
                    const ext = photo.url.split(".").pop()?.split("?")[0] || "jpg";
                    const emotion = photo.dominant_emotion ? `_${photo.dominant_emotion}` : "";
                    folder.file(`photo_${idx + 1}${emotion}.${ext}`, blob);
                })
            );

            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${event.name.replace(/\s/g, "_")}_selected.zip`;
            a.click();
            URL.revokeObjectURL(url);
            toast(`${selectedIds.size} photos downloaded! 📦`, "success");
        } catch {
            toast("Download failed. Please try again.", "error");
        } finally {
            setDownloading(false);
        }
    }

    function toggleSelect(photoId: string) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(photoId) ? next.delete(photoId) : next.add(photoId);
            return next;
        });
    }

    function selectAll() {
        setSelectedIds(new Set(photos.map((p) => p.id)));
    }

    function clearSelection() {
        setSelectedIds(new Set());
        setSelectMode(false);
    }

    return (
        <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-6">
                <Link href={`/events/${id}`} className="text-slate-400 hover:text-slate-700 text-sm transition">
                    ← Back to event
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-sm text-slate-600 font-medium">All photos</span>
            </div>

            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Photo gallery</h1>
                    <p className="text-slate-500 text-sm mt-1">{photos.length} photos</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                    {!selectMode ? (
                        <>
                            {/* Download all ZIP */}
                            <button
                                onClick={handleDownloadAll}
                                disabled={downloading || photos.length === 0}
                                className="flex items-center gap-1.5 text-xs sm:text-sm border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 px-3 py-2 rounded-xl transition font-medium disabled:opacity-50"
                            >
                                {downloading ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                        Zipping...
                                    </>
                                ) : (
                                    <>📦 Download all</>
                                )}
                            </button>
                            {/* Select mode */}
                            <button
                                onClick={() => setSelectMode(true)}
                                className="text-xs sm:text-sm border border-slate-200 hover:border-slate-300 text-slate-600 px-3 py-2 rounded-xl transition font-medium"
                            >
                                ☑️ Select
                            </button>
                            {/* Upload more */}
                            <Link
                                href={`/events/${id}/upload`}
                                className="text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-xl transition font-medium"
                            >
                                + Upload
                            </Link>
                        </>
                    ) : (
                        <>
                            {/* Select all */}
                            <button
                                onClick={selectAll}
                                className="text-xs border border-slate-200 text-slate-600 px-3 py-2 rounded-xl transition"
                            >
                                All ({photos.length})
                            </button>
                            {/* Download selected */}
                            {selectedIds.size > 0 && (
                                <>
                                    <button
                                        onClick={handleDownloadSelected}
                                        disabled={downloading}
                                        className="text-xs border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-2 rounded-xl transition font-medium"
                                    >
                                        📦 Download ({selectedIds.size})
                                    </button>
                                    <button
                                        onClick={handleDeleteSelected}
                                        className="text-xs border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-xl transition font-medium"
                                    >
                                        🗑 Delete ({selectedIds.size})
                                    </button>
                                </>
                            )}
                            {/* Cancel */}
                            <button
                                onClick={clearSelection}
                                className="text-xs border border-slate-200 text-slate-500 px-3 py-2 rounded-xl transition"
                            >
                                Cancel
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Selection info bar */}
            {selectMode && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between">
                    <p className="text-sm text-blue-700 font-medium">
                        {selectedIds.size === 0
                            ? "Tap photos to select them"
                            : `${selectedIds.size} photo${selectedIds.size !== 1 ? "s" : ""} selected`}
                    </p>
                    {selectedIds.size > 0 && (
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="text-xs text-blue-500 hover:text-blue-700"
                        >
                            Clear
                        </button>
                    )}
                </div>
            )}

            {/* Download progress */}
            {downloading && (
                <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    <p className="text-sm text-slate-600">
                        Preparing your ZIP file — this may take a moment for large events...
                    </p>
                </div>
            )}

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="aspect-square bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : photos.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-16 text-center">
                    <div className="text-4xl mb-3">📷</div>
                    <p className="text-slate-500 text-sm mb-4">No photos yet.</p>
                    <Link
                        href={`/events/${id}/upload`}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2.5 rounded-xl transition font-medium inline-block"
                    >
                        Upload photos
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {photos.map((photo) => (
                        <div
                            key={photo.id}
                            className={`group relative aspect-square bg-slate-100 rounded-xl overflow-hidden cursor-pointer transition ${selectMode && selectedIds.has(photo.id)
                                    ? "ring-2 ring-blue-600 ring-offset-2"
                                    : ""
                                }`}
                            onClick={() => selectMode ? toggleSelect(photo.id) : setSelected(photo)}
                        >
                            <img
                                src={photo.thumbnail_url || photo.url}
                                alt=""
                                className="w-full h-full object-cover transition group-hover:scale-105"
                            />

                            {/* Select mode checkbox */}
                            {selectMode && (
                                <div className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${selectedIds.has(photo.id)
                                        ? "bg-blue-600 border-blue-600"
                                        : "bg-white/80 border-white"
                                    }`}>
                                    {selectedIds.has(photo.id) && (
                                        <span className="text-white text-xs font-bold">✓</span>
                                    )}
                                </div>
                            )}

                            {/* Face count badge */}
                            {!selectMode && photo.face_count > 0 && (
                                <div className="absolute top-2 right-2 bg-blue-600/90 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                                    👤 {photo.face_count}
                                </div>
                            )}

                            {/* AI processed indicator */}
                            {!selectMode && photo.sharpness_score && (
                                <div className="absolute top-2 left-2 bg-green-500/80 text-white text-xs px-1.5 py-0.5 rounded-full">
                                    ✓ AI
                                </div>
                            )}

                            {/* Hover overlay — delete button */}
                            {!selectMode && (
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-end justify-between p-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const url = photo.url;
                                            const a = document.createElement("a");
                                            a.href = url;
                                            a.download = `photo_${photo.id}.jpg`;
                                            a.target = "_blank";
                                            a.click();
                                        }}
                                        className="opacity-0 group-hover:opacity-100 bg-white/90 hover:bg-white text-slate-800 text-xs px-2 py-1 rounded-lg transition font-medium"
                                    >
                                        📥
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(photo.id);
                                        }}
                                        disabled={deleting === photo.id}
                                        className="opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white text-xs px-2.5 py-1 rounded-lg transition font-medium"
                                    >
                                        {deleting === photo.id ? "..." : "Delete"}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Lightbox */}
            {selected && (
                <div
                    className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
                    onClick={() => setSelected(null)}
                >
                    <div
                        className="bg-white rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={selected.url}
                            alt=""
                            className="w-full max-h-[60vh] object-contain bg-slate-50"
                        />
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                {selected.face_count > 0 && (
                                    <span>👤 {selected.face_count} face{selected.face_count > 1 ? "s" : ""}</span>
                                )}
                                {selected.sharpness_score && (
                                    <span className="text-xs text-slate-400">
                                        Sharpness: {Math.round(selected.sharpness_score)}
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <a
                                    href={selected.url}
                                    download
                                    target="_blank"
                                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition font-medium"
                                >
                                    📥 Download
                                </a>
                                <button
                                    onClick={() => setSelected(null)}
                                    className="text-sm border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:border-slate-300 transition"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}