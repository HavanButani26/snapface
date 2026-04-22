"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { guestService, GalleryData, MatchedPhoto } from "@/lib/guest";
import JSZip from "jszip";

const emotionEmoji: Record<string, string> = {
    happy: "😊", sad: "😢", angry: "😠",
    surprised: "😲", neutral: "😐", fear: "😨", disgust: "🤢",
};

export default function GalleryPage() {
    const { token } = useParams<{ token: string }>();
    const [gallery, setGallery] = useState<GalleryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [lightbox, setLightbox] = useState<MatchedPhoto | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        guestService.getGallery(token)
            .then((data) => {
                setGallery(data);
                setLoading(false);
            })
            .catch(() => {
                setError("Gallery not found or has expired.");
                setLoading(false);
            });
    }, [token]);

    async function handleDownloadAll() {
        if (!gallery) return;
        setDownloading(true);
        try {
            const JSZip = (await import("jszip")).default;
            const zip = new JSZip();
            const folder = zip.folder("my_snapface_photos")!;

            await Promise.all(
                gallery.photos.map(async (photo, idx) => {
                    const res = await fetch(photo.url);
                    const blob = await res.blob();
                    const ext = photo.url.split(".").pop()?.split("?")[0] || "jpg";
                    const emotion = photo.dominant_emotion ? `_${photo.dominant_emotion}` : "";
                    folder.file(`photo_${idx + 1}${emotion}.${ext}`, blob);
                })
            );

            const content = await zip.generateAsync({ type: "blob" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(content);
            a.download = `${gallery.event_name.replace(/\s/g, "_")}_photos.zip`;
            a.click();
            URL.revokeObjectURL(a.href);
        } catch {
            alert("Download failed. Please try downloading individually.");
        } finally {
            setDownloading(false);
        }
    }

    async function handleDownloadSingle(url: string, filename: string) {
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            a.click();
            URL.revokeObjectURL(a.href);
        } catch {
            window.open(url, "_blank");
        }
    }

    function handleCopyLink() {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    if (loading) return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
            <div className="text-center">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-500 text-sm">Loading gallery...</p>
            </div>
        </div>
    );

    if (error || !gallery) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center max-w-sm shadow-sm">
                <div className="text-4xl mb-4">😔</div>
                <h2 className="font-bold text-slate-900 mb-2">Gallery not found</h2>
                <p className="text-slate-500 text-sm">{error}</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 text-center">
                <span className="text-xl font-bold text-blue-600">SnapFace</span>
            </div>

            {/* Event banner */}
            <div className="bg-blue-600 text-white px-6 py-6 text-center">
                <h1 className="text-xl font-bold">{gallery.event_name}</h1>
                <p className="text-blue-100 text-sm mt-1">
                    by {gallery.photographer_name}
                </p>
                {gallery.guest_name && (
                    <div className="inline-flex items-center gap-2 bg-white/20 border border-white/30 rounded-full px-4 py-1.5 mt-3">
                        <span className="text-sm font-medium">{gallery.guest_name}'s photos</span>
                    </div>
                )}
            </div>

            <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

                {/* Stats + actions */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <div className="grid grid-cols-3 gap-3 text-center mb-4">
                        <div>
                            <p className="text-2xl font-bold text-blue-600">{gallery.photo_count}</p>
                            <p className="text-xs text-slate-400">Photos</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{gallery.view_count}</p>
                            <p className="text-xs text-slate-400">Views</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">
                                {new Date(gallery.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </p>
                            <p className="text-xs text-slate-400">Created</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={handleDownloadAll}
                            disabled={downloading}
                            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold py-2.5 rounded-xl transition"
                        >
                            {downloading ? "⏳ Zipping..." : "📦 Download all (ZIP)"}
                        </button>
                        <button
                            onClick={handleCopyLink}
                            className={`flex items-center justify-center gap-2 border text-xs font-semibold py-2.5 rounded-xl transition ${copied
                                    ? "border-green-300 bg-green-50 text-green-700"
                                    : "border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600"
                                }`}
                        >
                            {copied ? "✓ Copied!" : "🔗 Copy link"}
                        </button>
                    </div>

                    {/* WhatsApp share */}
                    <button
                        onClick={() => {
                            const msg = encodeURIComponent(
                                `Check out my photos from ${gallery.event_name}! 📸\n\n${window.location.href}`
                            );
                            window.open(`https://wa.me/?text=${msg}`, "_blank");
                        }}
                        className="w-full mt-2 flex items-center justify-center gap-2 border border-green-200 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold py-2.5 rounded-xl transition"
                    >
                        📱 Share on WhatsApp
                    </button>
                </div>

                {/* Photo grid */}
                <div className="grid grid-cols-2 gap-3">
                    {gallery.photos.map((photo, idx) => (
                        <div
                            key={photo.id}
                            className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group bg-slate-100"
                            onClick={() => setLightbox(photo)}
                        >
                            <img
                                src={photo.thumbnail_url || photo.url}
                                alt=""
                                className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                            {photo.dominant_emotion && (
                                <div className="absolute top-2 left-2 bg-white/90 text-xs px-2 py-0.5 rounded-full font-medium text-slate-700">
                                    {emotionEmoji[photo.dominant_emotion]}
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                                <span className="opacity-0 group-hover:opacity-100 bg-white text-slate-900 text-xs font-medium px-3 py-1.5 rounded-lg transition">
                                    View
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="text-center py-4">
                    <p className="text-xs text-slate-400">
                        Powered by{" "}
                        <span className="text-blue-600 font-semibold">SnapFace</span>
                        {" "}· AI Photo Sharing
                    </p>
                </div>
            </div>

            {/* Lightbox */}
            {lightbox && (
                <div
                    className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-6"
                    onClick={() => setLightbox(null)}
                >
                    <div
                        className="bg-white rounded-2xl overflow-hidden max-w-md w-full shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={lightbox.url}
                            alt=""
                            className="w-full max-h-[65vh] object-contain bg-slate-50"
                        />
                        <div className="p-4 space-y-2">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        const ext = lightbox.url.split(".").pop()?.split("?")[0] || "jpg";
                                        const emotion = lightbox.dominant_emotion ? `_${lightbox.dominant_emotion}` : "";
                                        handleDownloadSingle(lightbox.url, `photo${emotion}.${ext}`);
                                    }}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-xl text-center transition"
                                >
                                    📥 Download
                                </button>
                                <button
                                    onClick={() => setLightbox(null)}
                                    className="px-5 border border-slate-200 text-slate-600 text-sm rounded-xl hover:border-slate-300 transition"
                                >
                                    Close
                                </button>
                            </div>
                            {lightbox.dominant_emotion && (
                                <p className="text-center text-xs text-slate-400">
                                    {emotionEmoji[lightbox.dominant_emotion]} {lightbox.dominant_emotion}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}