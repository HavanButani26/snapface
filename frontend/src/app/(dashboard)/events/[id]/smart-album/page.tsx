"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { photoService } from "@/lib/photos";
import { eventService } from "@/lib/events";
import { useModal } from "@/lib/modal";
import type { Photo, Event } from "@/types";

const SCENES = [
    { key: "all", label: "All photos", icon: "🖼️", color: "bg-slate-100 text-slate-700 border-slate-200" },
    { key: "portrait", label: "Portrait", icon: "🧑", color: "bg-blue-50 text-blue-700 border-blue-200" },
    { key: "group", label: "Group", icon: "👥", color: "bg-violet-50 text-violet-700 border-violet-200" },
    { key: "outdoor", label: "Outdoor", icon: "🌤️", color: "bg-sky-50 text-sky-700 border-sky-200" },
    { key: "indoor", label: "Indoor", icon: "🏠", color: "bg-amber-50 text-amber-700 border-amber-200" },
    { key: "candid", label: "Candid", icon: "📸", color: "bg-green-50 text-green-700 border-green-200" },
    { key: "ceremony", label: "Ceremony", icon: "💍", color: "bg-pink-50 text-pink-700 border-pink-200" },
    { key: "celebration", label: "Celebration", icon: "🎉", color: "bg-orange-50 text-orange-700 border-orange-200" },
    { key: "nature", label: "Nature", icon: "🌿", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { key: "night", label: "Night", icon: "🌙", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
];

export default function SmartAlbumPage() {
    const { id } = useParams<{ id: string }>();
    const { confirm, toast } = useModal();

    const [event, setEvent] = useState<Event | null>(null);
    const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeScene, setActiveScene] = useState("all");
    const [selected, setSelected] = useState<Photo | null>(null);

    useEffect(() => {
        Promise.all([
            eventService.get(id),
            photoService.getEventPhotos(id),
        ]).then(([ev, ph]) => {
            setEvent(ev);
            setAllPhotos(ph);
            setLoading(false);
        });
    }, [id]);

    // Get scene counts from all photos
    const sceneCounts = SCENES.reduce((acc, scene) => {
        if (scene.key === "all") {
            acc[scene.key] = allPhotos.length;
        } else {
            acc[scene.key] = allPhotos.filter(
                (p) => p.scene_category === scene.key
            ).length;
        }
        return acc;
    }, {} as Record<string, number>);

    // Filter photos by active scene
    const filteredPhotos = activeScene === "all"
        ? allPhotos
        : allPhotos.filter((p) => p.scene_category === activeScene);

    // Only show scenes that have photos
    const availableScenes = SCENES.filter(
        (s) => s.key === "all" || sceneCounts[s.key] > 0
    );

    const activeSceneData = SCENES.find((s) => s.key === activeScene);

    return (
        <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-6">
                <Link href={`/events/${id}`} className="text-slate-400 hover:text-slate-700 text-sm transition">
                    ← Back to event
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-sm text-slate-600 font-medium">Smart album</span>
            </div>

            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">🤖 Smart album</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        AI automatically grouped {allPhotos.length} photos into scenes
                    </p>
                </div>
                <Link
                    href={`/events/${id}/photos`}
                    className="text-sm border border-slate-200 hover:border-slate-300 text-slate-600 px-4 py-2 rounded-xl transition font-medium"
                >
                    All photos →
                </Link>
            </div>

            {/* Scene overview cards */}
            {!loading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                    {availableScenes.filter((s) => s.key !== "all").map((scene) => (
                        <button
                            key={scene.key}
                            onClick={() => setActiveScene(scene.key)}
                            className={`p-4 rounded-2xl border-2 text-left transition ${activeScene === scene.key
                                    ? "border-blue-500 bg-blue-50"
                                    : `${scene.color} border hover:border-blue-300`
                                }`}
                        >
                            <div className="text-2xl mb-2">{scene.icon}</div>
                            <p className="text-sm font-semibold text-slate-900">{scene.label}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {sceneCounts[scene.key]} photo{sceneCounts[scene.key] !== 1 ? "s" : ""}
                            </p>
                        </button>
                    ))}
                </div>
            )}

            {/* Scene filter pills */}
            <div className="flex gap-2 flex-wrap mb-5">
                {availableScenes.map((scene) => (
                    <button
                        key={scene.key}
                        onClick={() => setActiveScene(scene.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${activeScene === scene.key
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                            }`}
                    >
                        <span>{scene.icon}</span>
                        <span>{scene.label}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeScene === scene.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                            }`}>
                            {sceneCounts[scene.key]}
                        </span>
                    </button>
                ))}
            </div>

            {/* Active scene header */}
            {activeSceneData && activeScene !== "all" && (
                <div className={`${activeSceneData.color} border rounded-xl px-4 py-3 mb-5 flex items-center gap-3`}>
                    <span className="text-2xl">{activeSceneData.icon}</span>
                    <div>
                        <p className="text-sm font-semibold">{activeSceneData.label}</p>
                        <p className="text-xs opacity-70">
                            {filteredPhotos.length} photo{filteredPhotos.length !== 1 ? "s" : ""} detected in this scene
                        </p>
                    </div>
                </div>
            )}

            {/* Photos grid */}
            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="aspect-square bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : filteredPhotos.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
                    <div className="text-5xl mb-4">{activeSceneData?.icon || "📷"}</div>
                    <p className="text-slate-600 font-medium mb-1">
                        No {activeSceneData?.label?.toLowerCase()} photos yet
                    </p>
                    <p className="text-slate-400 text-sm">
                        Upload more photos and reprocess to detect scenes.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredPhotos.map((photo) => {
                        const sceneData = SCENES.find((s) => s.key === photo.scene_category);
                        return (
                            <div
                                key={photo.id}
                                className="group relative aspect-square bg-slate-100 rounded-xl overflow-hidden cursor-pointer"
                                onClick={() => setSelected(photo)}
                            >
                                <img
                                    src={photo.thumbnail_url || photo.url}
                                    alt=""
                                    className="w-full h-full object-cover group-hover:scale-105 transition"
                                />

                                {/* Scene badge */}
                                {photo.scene_category && photo.scene_category !== activeScene && (
                                    <div className="absolute top-2 left-2 bg-white/90 text-xs px-2 py-0.5 rounded-full font-medium text-slate-700 border border-white/50">
                                        {SCENES.find((s) => s.key === photo.scene_category)?.icon}{" "}
                                        {photo.scene_category}
                                    </div>
                                )}

                                {/* Face count */}
                                {photo.face_count > 0 && (
                                    <div className="absolute top-2 right-2 bg-blue-600/90 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                                        👤 {photo.face_count}
                                    </div>
                                )}

                                {/* Confidence indicator */}
                                {photo.scene_confidence && (
                                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                                        {Math.round(photo.scene_confidence * 100)}%
                                    </div>
                                )}

                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                            </div>
                        );
                    })}
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
                        <div className="p-4">
                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                                {selected.scene_category && (
                                    <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${SCENES.find((s) => s.key === selected.scene_category)?.color || ""
                                        }`}>
                                        {SCENES.find((s) => s.key === selected.scene_category)?.icon}{" "}
                                        {selected.scene_category}
                                        {selected.scene_confidence && (
                                            <span className="opacity-60 ml-1">
                                                {Math.round(selected.scene_confidence * 100)}%
                                            </span>
                                        )}
                                    </span>
                                )}
                                {selected.face_count > 0 && (
                                    <span className="text-xs text-slate-500">
                                        👤 {selected.face_count} face{selected.face_count > 1 ? "s" : ""}
                                    </span>
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
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-xl text-center transition"
                                >
                                    📥 Download
                                </a>
                                <button
                                    onClick={() => setSelected(null)}
                                    className="px-5 border border-slate-200 text-slate-600 text-sm rounded-xl hover:border-slate-300 transition"
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