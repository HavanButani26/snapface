"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { guestService, GuestEvent, MatchedPhoto } from "@/lib/guest";
import { reelService } from "@/lib/reel";

const ASPECT_RATIOS = [
    { value: "9:16", label: "9:16 Vertical", desc: "Instagram Reels" },
    { value: "1:1", label: "1:1 Square", desc: "Instagram Post" },
    { value: "16:9", label: "16:9 Wide", desc: "YouTube" },
];

const TRANSITIONS = [
    { value: "fade", label: "Fade", icon: "🌅" },
    { value: "slide_left", label: "Slide Left", icon: "⬅️" },
    { value: "slide_right", label: "Slide Right", icon: "➡️" },
    { value: "zoom_in", label: "Zoom In", icon: "🔍" },
    { value: "flash", label: "Flash", icon: "⚡" },
];

const YOUTUBE_TRACKS = [
    { id: "yt_1", name: "Cinematic Background", mood: "emotional", url: "https://www.youtube.com/watch?v=aJOTlE1K90k" },
    { id: "yt_2", name: "Happy Ukulele", mood: "happy", url: "https://www.youtube.com/watch?v=ZbZSe6N_BXs" },
    { id: "yt_3", name: "Romantic Piano", mood: "romantic", url: "https://www.youtube.com/watch?v=450p7goxZqg" },
    { id: "yt_4", name: "Upbeat Pop", mood: "energetic", url: "https://www.youtube.com/watch?v=y6120QOlsfU" },
    { id: "yt_5", name: "Peaceful Acoustic", mood: "calm", url: "https://www.youtube.com/watch?v=lFcSrYw-ARY" },
];

const moodColors: Record<string, string> = {
    emotional: "bg-violet-50 text-violet-700 border-violet-200",
    happy: "bg-amber-50 text-amber-700 border-amber-200",
    romantic: "bg-pink-50 text-pink-700 border-pink-200",
    energetic: "bg-red-50 text-red-700 border-red-200",
    calm: "bg-blue-50 text-blue-700 border-blue-200",
};

const emotionEmoji: Record<string, string> = {
    happy: "😊", sad: "😢", angry: "😠",
    surprised: "😲", neutral: "😐", fear: "😨", disgust: "🤢",
};

export default function GuestReelPage() {
    const { token } = useParams<{ token: string }>();

    const [event, setEvent] = useState<GuestEvent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Matched photos passed via sessionStorage
    const [photos, setPhotos] = useState<MatchedPhoto[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Settings
    const [aspectRatio, setAspectRatio] = useState("9:16");
    const [transition, setTransition] = useState("fade");
    const [photoDuration, setPhotoDuration] = useState(2);
    const [kenBurns, setKenBurns] = useState(true);
    const [musicSource, setMusicSource] = useState<"none" | "preset" | "youtube">("none");
    const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
    const [youtubeUrl, setYoutubeUrl] = useState("");

    // Generation
    const [generating, setGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState("");
    const [videoUrl, setVideoUrl] = useState<string | null>(null);

    useEffect(() => {
        // Load event info
        guestService.getEvent(token)
            .then((data) => {
                setEvent(data);
                setLoading(false);
            })
            .catch(() => {
                setError("Event not found.");
                setLoading(false);
            });

        // Load matched photos from sessionStorage
        try {
            const stored = sessionStorage.getItem(`matched_${token}`);
            if (stored) {
                const parsed: MatchedPhoto[] = JSON.parse(stored);
                setPhotos(parsed);
                setSelectedIds(new Set(parsed.map((p) => p.id)));
            }
        } catch {
            setError("No matched photos found. Please go back and find your photos first.");
        }
    }, [token]);

    function togglePhoto(id: string) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    async function handleGenerate() {
        if (selectedIds.size === 0) {
            alert("Select at least 1 photo.");
            return;
        }
        setGenerating(true);
        setProgress(0);
        setVideoUrl(null);

        const labels = [
            "Downloading your photos...",
            "Applying Ken Burns effect...",
            "Adding transitions...",
            "Finalizing video...",
        ];
        let labelIdx = 0;
        setProgressLabel(labels[0]);

        const progressInterval = setInterval(() => {
            setProgress((p) => {
                const next = Math.min(p + 2, 88);
                const newIdx = Math.floor((next / 88) * (labels.length - 1));
                if (newIdx !== labelIdx) {
                    labelIdx = newIdx;
                    setProgressLabel(labels[newIdx]);
                }
                return next;
            });
        }, 700);

        try {
            const blob = await reelService.generateGuestReel(token, {
                photo_ids: Array.from(selectedIds),
                aspect_ratio: aspectRatio,
                transition,
                photo_duration: photoDuration,
                title_text: "",
                subtitle_text: "",
                overlay_text: "",
                music_track_id: musicSource === "preset" ? selectedTrack : null,
                music_url: musicSource === "youtube" ? youtubeUrl : null,
                ken_burns: kenBurns,
                show_intro: false,
                show_outro: false,
            });

            clearInterval(progressInterval);
            setProgress(100);
            setProgressLabel("Done!");
            setVideoUrl(URL.createObjectURL(blob));
        } catch (err: any) {
            clearInterval(progressInterval);
            alert("Reel generation failed. Please try again.");
        } finally {
            setGenerating(false);
        }
    }

    function handleDownload() {
        if (!videoUrl) return;
        const a = document.createElement("a");
        a.href = videoUrl;
        a.download = `my_snapface_reel.mp4`;
        a.click();
    }

    // Shared wrapper
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
            <div className="bg-white border-b border-slate-200 px-6 py-4 text-center">
                <span className="text-xl font-bold text-blue-600">SnapFace</span>
            </div>
            <div className="bg-blue-600 text-white px-6 py-4 text-center">
                <h1 className="text-lg font-bold">{event?.name}</h1>
                <p className="text-blue-100 text-xs mt-0.5">by {event?.photographer_name}</p>
            </div>
            <div className="max-w-lg mx-auto px-4 py-8">{children}</div>
        </div>
    );

    if (loading) return (
        <Wrapper>
            <div className="flex items-center justify-center h-40">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        </Wrapper>
    );

    if (error || photos.length === 0) return (
        <Wrapper>
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
                <div className="text-4xl mb-3">😔</div>
                <p className="text-slate-600 font-medium mb-2">No photos found</p>
                <p className="text-slate-400 text-sm">{error || "Please go back and find your photos first."}</p>
                <button
                    onClick={() => window.history.back()}
                    className="mt-4 border border-slate-200 text-slate-600 text-sm px-5 py-2 rounded-xl"
                >
                    ← Go back
                </button>
            </div>
        </Wrapper>
    );

    return (
        <Wrapper>
            <div className="space-y-5">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-slate-900">🎬 Create your reel</h2>
                    <p className="text-slate-500 text-sm mt-1">
                        Customise and generate a reel from your {photos.length} matched photos
                    </p>
                </div>

                {/* Photo selector */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">
                            {selectedIds.size} of {photos.length} photos selected
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setSelectedIds(new Set(photos.map((p) => p.id)))} className="text-xs text-blue-600 font-medium">All</button>
                            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-400 font-medium">None</button>
                        </div>
                    </div>
                    <div className="p-3 grid grid-cols-3 gap-2">
                        {photos.map((photo) => (
                            <div
                                key={photo.id}
                                onClick={() => togglePhoto(photo.id)}
                                className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer transition ${selectedIds.has(photo.id) ? "ring-2 ring-blue-600 ring-offset-1" : "opacity-50"
                                    }`}
                            >
                                <img src={photo.thumbnail_url || photo.url} alt="" className="w-full h-full object-cover" />
                                {selectedIds.has(photo.id) && (
                                    <div className="absolute top-1 right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs">✓</span>
                                    </div>
                                )}
                                {photo.dominant_emotion && (
                                    <div className="absolute bottom-1 left-1 text-xs bg-white/80 px-1 rounded">
                                        {emotionEmoji[photo.dominant_emotion] || ""}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Aspect ratio */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Aspect ratio</p>
                    <div className="space-y-2">
                        {ASPECT_RATIOS.map((ar) => (
                            <button
                                key={ar.value}
                                onClick={() => setAspectRatio(ar.value)}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition ${aspectRatio === ar.value
                                        ? "border-blue-500 bg-blue-50 text-blue-700"
                                        : "border-slate-200 text-slate-600"
                                    }`}
                            >
                                <span className="font-medium">{ar.label}</span>
                                <span className="text-xs text-slate-400">{ar.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Transition */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Transition</p>
                    <div className="grid grid-cols-2 gap-2">
                        {TRANSITIONS.map((t) => (
                            <button
                                key={t.value}
                                onClick={() => setTransition(t.value)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition ${transition === t.value
                                        ? "border-blue-500 bg-blue-50 text-blue-700"
                                        : "border-slate-200 text-slate-600"
                                    }`}
                            >
                                <span>{t.icon}</span> {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Duration + Ken Burns */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                            Photo duration: {photoDuration}s
                        </p>
                        <input
                            type="range" min={1} max={5} step={1}
                            value={photoDuration}
                            onChange={(e) => setPhotoDuration(Number(e.target.value))}
                            className="w-full accent-blue-600"
                        />
                        <div className="flex justify-between text-xs text-slate-400 mt-1">
                            <span>1s fast</span><span>5s slow</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-700">Ken Burns effect</p>
                            <p className="text-xs text-slate-400">Cinematic pan & zoom on each photo</p>
                        </div>
                        <button
                            onClick={() => setKenBurns(!kenBurns)}
                            className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${kenBurns ? "bg-blue-600" : "bg-slate-200"}`}
                        >
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${kenBurns ? "left-5" : "left-1"}`} />
                        </button>
                    </div>
                </div>

                {/* Music */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Background music</p>
                    <div className="flex gap-2">
                        {(["none", "preset", "youtube"] as const).map((src) => (
                            <button
                                key={src}
                                onClick={() => setMusicSource(src)}
                                className={`flex-1 py-2 rounded-xl text-xs font-medium border transition ${musicSource === src ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-600"
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
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition ${selectedTrack === track.id ? "border-blue-500 bg-blue-50" : "border-slate-200"
                                        }`}
                                >
                                    <span className="font-medium text-slate-800">{track.name}</span>
                                    <span className={`px-2 py-0.5 rounded-full border text-xs ${moodColors[track.mood]}`}>
                                        {track.mood}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {musicSource === "youtube" && (
                        <div>
                            <input
                                type="url"
                                value={youtubeUrl}
                                onChange={(e) => setYoutubeUrl(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
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

                {/* Summary */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                        <p className="text-slate-400">Photos</p>
                        <p className="font-bold text-slate-900 text-base">{selectedIds.size}</p>
                    </div>
                    <div>
                        <p className="text-slate-400">Duration</p>
                        <p className="font-bold text-slate-900 text-base">~{Math.round(selectedIds.size * photoDuration)}s</p>
                    </div>
                    <div>
                        <p className="text-slate-400">Format</p>
                        <p className="font-bold text-slate-900 text-base">{aspectRatio}</p>
                    </div>
                </div>

                {/* Generate button */}
                <button
                    onClick={handleGenerate}
                    disabled={generating || selectedIds.size === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl text-sm transition shadow-lg shadow-blue-200"
                >
                    {generating ? "Generating..." : `🎬 Generate reel (${selectedIds.size} photos)`}
                </button>

                {/* Progress */}
                {generating && (
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                        <div className="flex justify-between text-xs text-slate-500 mb-2">
                            <span>{progressLabel}</span>
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
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-900">Your reel is ready! 🎉</p>
                                <p className="text-xs text-slate-400">Preview and download below</p>
                            </div>
                            <button
                                onClick={handleDownload}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
                            >
                                📥 Download
                            </button>
                        </div>
                        <div className="p-3 bg-slate-900 flex justify-center">
                            <video
                                src={videoUrl}
                                controls
                                autoPlay
                                className={`rounded-xl max-h-[400px] ${aspectRatio === "9:16" ? "max-w-[220px]" :
                                        aspectRatio === "1:1" ? "max-w-[300px]" :
                                            "w-full"
                                    }`}
                            />
                        </div>
                    </div>
                )}

                {/* Back button */}
                <button
                    onClick={() => window.history.back()}
                    className="w-full border border-slate-200 text-slate-500 text-sm py-3 rounded-2xl transition hover:border-slate-300"
                >
                    ← Back to my photos
                </button>
            </div>
        </Wrapper>
    );
}