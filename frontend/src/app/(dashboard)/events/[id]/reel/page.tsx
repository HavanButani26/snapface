"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { eventService } from "@/lib/events";
import { photoService } from "@/lib/photos";
import type { Event, Photo } from "@/types";

const ASPECT_RATIOS = [
    { value: "9:16", label: "9:16 Vertical", desc: "Instagram Reels / TikTok" },
    { value: "1:1", label: "1:1 Square", desc: "Instagram Post" },
    { value: "16:9", label: "16:9 Wide", desc: "YouTube / Desktop" },
];

const TRANSITIONS = [
    { value: "fade", label: "Fade", icon: "🌅" },
    { value: "slide_left", label: "Slide Left", icon: "⬅️" },
    { value: "slide_right", label: "Slide Right", icon: "➡️" },
    { value: "zoom_in", label: "Zoom In", icon: "🔍" },
    { value: "flash", label: "Flash", icon: "⚡" },
];

const YOUTUBE_TRACKS = [
    { id: "yt_1", name: "Cinematic Background", url: "https://www.youtube.com/watch?v=aJOTlE1K90k", mood: "emotional" },
    { id: "yt_2", name: "Happy Ukulele", url: "https://www.youtube.com/watch?v=ZbZSe6N_BXs", mood: "happy" },
    { id: "yt_3", name: "Romantic Piano", url: "https://www.youtube.com/watch?v=450p7goxZqg", mood: "romantic" },
    { id: "yt_4", name: "Upbeat Pop", url: "https://www.youtube.com/watch?v=y6120QOlsfU", mood: "energetic" },
    { id: "yt_5", name: "Peaceful Acoustic", url: "https://www.youtube.com/watch?v=lFcSrYw-ARY", mood: "calm" },
];

const moodColors: Record<string, string> = {
    emotional: "bg-violet-50 text-violet-700 border-violet-200",
    happy: "bg-amber-50 text-amber-700 border-amber-200",
    romantic: "bg-pink-50 text-pink-700 border-pink-200",
    energetic: "bg-red-50 text-red-700 border-red-200",
    calm: "bg-blue-50 text-blue-700 border-blue-200",
};

export default function ReelStudioPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [event, setEvent] = useState<Event | null>(null);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Settings
    const [aspectRatio, setAspectRatio] = useState("9:16");
    const [transition, setTransition] = useState("fade");
    const [photoDuration, setPhotoDuration] = useState(2);
    const [titleText, setTitleText] = useState("");
    const [subtitleText, setSubtitleText] = useState("");
    const [overlayText, setOverlayText] = useState("");
    const [watermark, setWatermark] = useState("");
    const [kenBurns, setKenBurns] = useState(true);
    const [showIntro, setShowIntro] = useState(true);
    const [showOutro, setShowOutro] = useState(true);
    const [musicSource, setMusicSource] = useState<"none" | "preset" | "youtube">("none");
    const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
    const [youtubeUrl, setYoutubeUrl] = useState("");

    useEffect(() => {
        Promise.all([
            eventService.get(id),
            photoService.getEventPhotos(id),
        ]).then(([ev, ph]) => {
            setEvent(ev);
            setPhotos(ph);
            setTitleText(ev.name);
            // Select all photos by default
            setSelectedIds(new Set(ph.map((p) => p.id)));
            setLoading(false);
        });
    }, [id]);

    function togglePhoto(photoId: string) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(photoId)) next.delete(photoId);
            else next.add(photoId);
            return next;
        });
    }

    function selectAll() {
        setSelectedIds(new Set(photos.map((p) => p.id)));
    }

    function clearAll() {
        setSelectedIds(new Set());
    }

    async function handleGenerate() {
        if (selectedIds.size === 0) {
            alert("Select at least 1 photo.");
            return;
        }

        setGenerating(true);
        setProgress(0);
        setVideoUrl(null);

        try {
            const token = localStorage.getItem("token");
            const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

            const body = {
                photo_ids: Array.from(selectedIds),
                aspect_ratio: aspectRatio,
                transition,
                photo_duration: photoDuration,
                title_text: titleText,
                subtitle_text: subtitleText,
                overlay_text: overlayText,
                watermark,
                music_track_id: musicSource === "preset" ? selectedTrack : null,
                music_url: musicSource === "youtube" ? youtubeUrl : null,
                ken_burns: kenBurns,
                show_intro: showIntro,
                show_outro: showOutro,
                fps: 24,
            };

            // Simulate progress while waiting
            const progressInterval = setInterval(() => {
                setProgress((p) => Math.min(p + 2, 90));
            }, 800);

            const res = await fetch(`${BASE}/reel/generate/${id}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            clearInterval(progressInterval);
            setProgress(100);

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Generation failed");
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setVideoUrl(url);

            setTimeout(() => {
                videoRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 300);

        } catch (err: any) {
            alert(err.message || "Reel generation failed. Please try again.");
        } finally {
            setGenerating(false);
        }
    }

    function handleDownload() {
        if (!videoUrl) return;
        const a = document.createElement("a");
        a.href = videoUrl;
        a.download = `SnapFace_${event?.name?.replace(/\s/g, "_") || "reel"}.mp4`;
        a.click();
    }

    const inputClass = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-slate-50 focus:bg-white";
    const labelClass = "block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5";

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-6">
                <Link href={`/events/${id}`} className="text-slate-400 hover:text-slate-700 text-sm transition">
                    ← Back to event
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-sm text-slate-600 font-medium">Reel studio</span>
            </div>

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">🎬 Reel studio</h1>
                <p className="text-slate-500 text-sm mt-1">
                    Create a cinematic reel from your event photos
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── Left: Settings panel ── */}
                <div className="lg:col-span-1 space-y-4">

                    {/* Aspect ratio */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                        <p className={labelClass}>Aspect ratio</p>
                        <div className="space-y-2">
                            {ASPECT_RATIOS.map((ar) => (
                                <button
                                    key={ar.value}
                                    onClick={() => setAspectRatio(ar.value)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition ${aspectRatio === ar.value
                                        ? "border-blue-500 bg-blue-50 text-blue-700"
                                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                                        }`}
                                >
                                    <span className="font-medium">{ar.label}</span>
                                    <span className="text-xs text-slate-400">{ar.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Transition */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                        <p className={labelClass}>Transition effect</p>
                        <div className="grid grid-cols-2 gap-2">
                            {TRANSITIONS.map((t) => (
                                <button
                                    key={t.value}
                                    onClick={() => setTransition(t.value)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition ${transition === t.value
                                        ? "border-blue-500 bg-blue-50 text-blue-700"
                                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                                        }`}
                                >
                                    <span>{t.icon}</span>
                                    <span className="font-medium text-xs">{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Duration & effects */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div>
                            <p className={labelClass}>Photo duration: {photoDuration}s</p>
                            <input
                                type="range"
                                min={1}
                                max={5}
                                step={1}
                                value={photoDuration}
                                onChange={(e) => setPhotoDuration(Number(e.target.value))}
                                className="w-full accent-blue-600"
                            />
                            <div className="flex justify-between text-xs text-slate-400 mt-1">
                                <span>1s fast</span>
                                <span>5s slow</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {[
                                { label: "Ken Burns effect (pan/zoom)", value: kenBurns, setter: setKenBurns },
                                { label: "Show intro slide", value: showIntro, setter: setShowIntro },
                                { label: "Show outro slide", value: showOutro, setter: setShowOutro },
                            ].map((toggle) => (
                                <div key={toggle.label} className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600">{toggle.label}</span>
                                    <button
                                        onClick={() => toggle.setter(!toggle.value)}
                                        className={`w-10 h-6 rounded-full transition-colors relative ${toggle.value ? "bg-blue-600" : "bg-slate-200"
                                            }`}
                                    >
                                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${toggle.value ? "left-5" : "left-1"
                                            }`} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Text overlays */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                        <p className={labelClass}>Text & branding</p>
                        <div>
                            <label className="text-xs text-slate-500 mb-1 block">Event title (intro slide)</label>
                            <input type="text" value={titleText} onChange={(e) => setTitleText(e.target.value)} className={inputClass} placeholder="e.g. Raj & Priya Wedding" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 mb-1 block">Subtitle (photographer name)</label>
                            <input type="text" value={subtitleText} onChange={(e) => setSubtitleText(e.target.value)} className={inputClass} placeholder="Your studio name" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 mb-1 block">Overlay text (on each photo)</label>
                            <input type="text" value={overlayText} onChange={(e) => setOverlayText(e.target.value)} className={inputClass} placeholder="e.g. 12 April 2026" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 mb-1 block">Watermark (bottom corner)</label>
                            <input type="text" value={watermark} onChange={(e) => setWatermark(e.target.value)} className={inputClass} placeholder="© Your Studio" />
                        </div>
                    </div>

                    {/* Music */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                        <p className={labelClass}>Background music</p>

                        {/* Source selector */}
                        <div className="flex gap-2">
                            {(["none", "preset", "youtube"] as const).map((src) => (
                                <button
                                    key={src}
                                    onClick={() => setMusicSource(src)}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${musicSource === src
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                                        }`}
                                >
                                    {src === "none" ? "No music" : src === "preset" ? "Preset" : "YouTube"}
                                </button>
                            ))}
                        </div>

                        {musicSource === "preset" && (
                            <div className="space-y-2">
                                {YOUTUBE_TRACKS.map((track) => (
                                    <button
                                        key={track.id}
                                        onClick={() => setSelectedTrack(track.id)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition ${selectedTrack === track.id
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-slate-200 hover:border-slate-300"
                                            }`}
                                    >
                                        <span className="font-medium text-slate-800 text-xs">{track.name}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${moodColors[track.mood]}`}>
                                            {track.mood}
                                        </span>
                                    </button>
                                ))}
                                <p className="text-xs text-slate-400 mt-1">
                                    Add MP3 files to <code>backend/app/static/music/</code> named by track ID
                                </p>
                            </div>
                        )}

                        {musicSource === "youtube" && (
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">
                                    YouTube Audio Library URL
                                </label>
                                <input
                                    type="url"
                                    value={youtubeUrl}
                                    onChange={(e) => setYoutubeUrl(e.target.value)}
                                    className={inputClass}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                />
                                <p className="text-xs text-slate-400 mt-1">
                                    Use royalty-free tracks from{" "}
                                    <a href="https://studio.youtube.com/channel/music" target="_blank" className="text-blue-500 underline">
                                        YouTube Audio Library
                                    </a>
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right: Photo selection + preview ── */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Photo selector */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900">Select photos</h2>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {selectedIds.size} of {photos.length} selected
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={selectAll} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                                    All
                                </button>
                                <span className="text-slate-300">|</span>
                                <button onClick={clearAll} className="text-xs text-slate-500 hover:text-slate-700 font-medium">
                                    None
                                </button>
                            </div>
                        </div>

                        {photos.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 text-sm">
                                No photos in this event yet.
                            </div>
                        ) : (
                            <div className="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-96 overflow-y-auto">
                                {photos.map((photo) => (
                                    <div
                                        key={photo.id}
                                        onClick={() => togglePhoto(photo.id)}
                                        className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer transition ${selectedIds.has(photo.id)
                                            ? "ring-2 ring-blue-600 ring-offset-1"
                                            : "opacity-50 hover:opacity-75"
                                            }`}
                                    >
                                        <img
                                            src={photo.thumbnail_url || photo.url}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                        {selectedIds.has(photo.id) && (
                                            <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                                                <span className="text-white text-xs">✓</span>
                                            </div>
                                        )}
                                        {photo.dominant_emotion && (
                                            <div className="absolute bottom-1 left-1 text-xs bg-white/80 px-1 rounded">
                                                {photo.dominant_emotion === "happy" ? "😊" :
                                                    photo.dominant_emotion === "neutral" ? "😐" :
                                                        photo.dominant_emotion === "surprised" ? "😲" : ""}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Settings summary */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <div className="grid grid-cols-3 gap-3 text-center text-xs">
                            <div>
                                <p className="text-slate-400">Photos</p>
                                <p className="font-bold text-slate-900 text-lg">{selectedIds.size}</p>
                            </div>
                            <div>
                                <p className="text-slate-400">Duration</p>
                                <p className="font-bold text-slate-900 text-lg">
                                    ~{Math.round(selectedIds.size * photoDuration + (showIntro ? 2.5 : 0) + (showOutro ? 2.5 : 0))}s
                                </p>
                            </div>
                            <div>
                                <p className="text-slate-400">Format</p>
                                <p className="font-bold text-slate-900 text-lg">{aspectRatio}</p>
                            </div>
                        </div>
                    </div>

                    {/* Generate button */}
                    <button
                        onClick={handleGenerate}
                        disabled={generating || selectedIds.size === 0}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl text-sm transition shadow-lg shadow-blue-200"
                    >
                        {generating ? "Generating your reel..." : `🎬 Generate reel (${selectedIds.size} photos)`}
                    </button>

                    {/* Progress bar */}
                    {generating && (
                        <div className="bg-white border border-slate-200 rounded-xl p-4">
                            <div className="flex justify-between text-xs text-slate-500 mb-2">
                                <span>
                                    {progress < 20 ? "Downloading photos..." :
                                        progress < 60 ? "Applying effects & transitions..." :
                                            progress < 85 ? "Adding Ken Burns & overlays..." :
                                                progress < 95 ? "Adding music..." :
                                                    "Finalizing video..."}
                                </span>
                                <span>{progress}%</span>
                            </div>
                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Video preview */}
                    {videoUrl && (
                        <div ref={containerRef} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h2 className="text-sm font-semibold text-slate-900">Preview</h2>
                                    <p className="text-xs text-slate-400 mt-0.5">Your reel is ready!</p>
                                </div>
                                <button
                                    onClick={handleDownload}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
                                >
                                    📥 Download MP4
                                </button>
                            </div>
                            <div className="p-4 flex justify-center bg-slate-900">
                                <video
                                    ref={videoRef as any}
                                    src={videoUrl}
                                    controls
                                    className={`rounded-xl max-h-[500px] ${aspectRatio === "9:16" ? "max-w-[280px]" :
                                        aspectRatio === "1:1" ? "max-w-[400px]" :
                                            "w-full"
                                        }`}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}