"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { photoService } from "@/lib/photos";
import Link from "next/link";
import type { Photo } from "@/types";

const EMOTIONS = ["all", "happy", "sad", "angry", "surprised", "neutral", "fear", "disgust"];

const emotionEmoji: Record<string, string> = {
    all: "🖼️", happy: "😊", sad: "😢", angry: "😠",
    surprised: "😲", neutral: "😐", fear: "😨", disgust: "🤢",
};

export default function PhotosPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);
    const [emotion, setEmotion] = useState("all");
    const [deleting, setDeleting] = useState<string | null>(null);
    const [selected, setSelected] = useState<Photo | null>(null);

    useEffect(() => {
        setLoading(true);
        photoService
            .getEventPhotos(id, emotion === "all" ? undefined : emotion)
            .then((data) => {
                setPhotos(data);
                setLoading(false);
            });
    }, [id, emotion]);

    async function handleDelete(photoId: string) {
        if (!confirm("Delete this photo?")) return;
        setDeleting(photoId);
        await photoService.delete(photoId);
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        setDeleting(null);
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center gap-2 mb-6">
                <Link href={`/events/${id}`} className="text-slate-400 hover:text-slate-700 text-sm transition">
                    ← Back to event
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-sm text-slate-600 font-medium">All photos</span>
            </div>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Photo gallery</h1>
                    <p className="text-slate-500 text-sm mt-1">{photos.length} photos</p>
                </div>
                <Link
                    href={`/events/${id}/upload`}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition font-medium"
                >
                    + Upload more
                </Link>
            </div>

            {/* Emotion filter — our unique feature */}
            <div className="flex gap-2 mb-6 flex-wrap">
                {EMOTIONS.map((e) => (
                    <button
                        key={e}
                        onClick={() => setEmotion(e)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${emotion === e
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                            }`}
                    >
                        <span>{emotionEmoji[e]}</span>
                        <span className="capitalize">{e}</span>
                    </button>
                ))}
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-4 gap-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="aspect-square bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : photos.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-16 text-center">
                    <div className="text-4xl mb-3">📷</div>
                    <p className="text-slate-500 text-sm">
                        {emotion === "all" ? "No photos yet. Upload some!" : `No ${emotion} photos found.`}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-4 gap-3">
                    {photos.map((photo) => (
                        <div
                            key={photo.id}
                            className="group relative aspect-square bg-slate-100 rounded-xl overflow-hidden cursor-pointer"
                            onClick={() => setSelected(photo)}
                        >
                            <img
                                src={photo.thumbnail_url || photo.url}
                                alt=""
                                className="w-full h-full object-cover transition group-hover:scale-105"
                            />
                            {/* Emotion badge */}
                            {photo.dominant_emotion && (
                                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-xs px-2 py-0.5 rounded-full font-medium text-slate-700 border border-white">
                                    {emotionEmoji[photo.dominant_emotion]} {photo.dominant_emotion}
                                </div>
                            )}
                            {/* Face count */}
                            {photo.face_count > 0 && (
                                <div className="absolute top-2 right-2 bg-blue-600/90 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                                    👤 {photo.face_count}
                                </div>
                            )}
                            {/* Delete on hover */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-end justify-end p-2">
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
                                {selected.dominant_emotion && (
                                    <span className="flex items-center gap-1">
                                        {emotionEmoji[selected.dominant_emotion]}
                                        <span className="capitalize">{selected.dominant_emotion}</span>
                                    </span>
                                )}
                                {selected.face_count > 0 && (
                                    <span>👤 {selected.face_count} face{selected.face_count > 1 ? "s" : ""}</span>
                                )}
                                {selected.sharpness_score && (
                                    <span>
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
                                    Download
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