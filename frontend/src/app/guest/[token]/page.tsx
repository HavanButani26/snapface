"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { guestService, GuestEvent, MatchedPhoto } from "@/lib/guest";

const emotionEmoji: Record<string, string> = {
    all: "🖼️", happy: "😊", sad: "😢", angry: "😠",
    surprised: "😲", neutral: "😐", fear: "😨", disgust: "🤢",
};

type Step = "landing" | "password" | "selfie" | "matching" | "results";

export default function GuestPage() {
    const { token } = useParams<{ token: string }>();

    const [event, setEvent] = useState<GuestEvent | null>(null);
    const [loadingEvent, setLoadingEvent] = useState(true);
    const [eventError, setEventError] = useState("");

    const [step, setStep] = useState<Step>("landing");

    // Password step
    const [password, setPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [verifyingPwd, setVerifyingPwd] = useState(false);

    // Selfie step
    const [selfie, setSelfie] = useState<File | null>(null);
    const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
    const [emotionFilter, setEmotionFilter] = useState("all");

    // Matching step
    const [progress, setProgress] = useState(0);
    const [matchError, setMatchError] = useState("");

    // Results step
    const [matched, setMatched] = useState<MatchedPhoto[]>([]);
    const [lightbox, setLightbox] = useState<MatchedPhoto | null>(null);

    // Load event on mount
    useEffect(() => {
        guestService
            .getEvent(token)
            .then((data) => {
                setEvent(data);
                setLoadingEvent(false);
                setStep(data.is_password_protected ? "password" : "selfie");
            })
            .catch(() => {
                setEventError("Event not found or no longer active.");
                setLoadingEvent(false);
            });
    }, [token]);


    // Verify password
    async function handleVerifyPassword(e: React.FormEvent) {
        e.preventDefault();
        setPasswordError("");
        setVerifyingPwd(true);
        try {
            const ok = await guestService.verifyPassword(token, password);
            if (ok) setStep("selfie");
        } catch {
            setPasswordError("Incorrect password. Please try again.");
        } finally {
            setVerifyingPwd(false);
        }
    }

    // Match selfie
    async function handleMatch() {
        if (!selfie) return;
        setStep("matching");
        setProgress(0);
        setMatchError("");
        try {
            const results = await guestService.matchSelfie(
                token,
                selfie,
                event?.is_password_protected ? password : undefined,
                emotionFilter !== "all" ? emotionFilter : undefined,
                setProgress
            );
            setMatched(results);
            setStep("results");
        } catch (err: any) {
            setMatchError(
                err.response?.data?.detail || "Something went wrong. Please try again."
            );
            setStep("selfie");
        }
    }

    // ── Loading ──
    if (loadingEvent) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 text-sm">Loading event...</p>
                </div>
            </div>
        );
    }

    // ── Event error ──
    if (eventError) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center max-w-sm shadow-sm">
                    <div className="text-4xl mb-4">❌</div>
                    <h2 className="font-bold text-slate-900 mb-2">Event not found</h2>
                    <p className="text-slate-500 text-sm">{eventError}</p>
                </div>
            </div>
        );
    }

    // Shared layout wrapper
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 text-center">
                <span className="text-xl font-bold text-blue-600">SnapFace</span>
            </div>
            {/* Event banner */}
            <div className="bg-blue-600 text-white px-6 py-5 text-center">
                <h1 className="text-xl font-bold">{event?.name}</h1>
                <p className="text-blue-100 text-sm mt-1">
                    by {event?.photographer_name} · {event?.total_photos} photos
                </p>
            </div>
            <div className="max-w-lg mx-auto px-6 py-10">{children}</div>
        </div>
    );

    // ── Step: Password ──
    if (step === "password") {
        return (
            <Wrapper>
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
                    <div className="text-4xl mb-4">🔒</div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Album protected</h2>
                    <p className="text-slate-500 text-sm mb-6">
                        Enter the password provided by the photographer to access photos.
                    </p>
                    <form onSubmit={handleVerifyPassword} className="space-y-4">
                        {passwordError && (
                            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
                                {passwordError}
                            </div>
                        )}
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter album password"
                            required
                            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                        />
                        <button
                            type="submit"
                            disabled={verifyingPwd}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-3 rounded-xl text-sm transition"
                        >
                            {verifyingPwd ? "Verifying..." : "Continue"}
                        </button>
                    </form>
                </div>
            </Wrapper>
        );
    }

    // ── Step: Selfie ──
    if (step === "selfie") {
        return (
            <Wrapper>
                <div className="space-y-5">
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-slate-900">Find your photos</h2>
                        <p className="text-slate-500 text-sm mt-1">
                            Upload a selfie and our AI will find all your photos from this event instantly.
                        </p>
                    </div>

                    {/* Selfie upload — direct input, no dropzone */}
                    <div className="relative">
                        <input
                            type="file"
                            accept="image/*"
                            id="selfie-input"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setSelfie(file);
                                setSelfiePreview(URL.createObjectURL(file));
                            }}
                        />
                        <div className={`border-2 border-dashed rounded-2xl transition overflow-hidden ${selfiePreview
                            ? "border-blue-300 bg-white"
                            : "border-slate-200 hover:border-blue-300 bg-white hover:bg-slate-50"
                            }`}>
                            {selfiePreview ? (
                                <div className="relative">
                                    <img
                                        src={selfiePreview}
                                        alt="Your selfie"
                                        className="w-full h-56 object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                        <span className="bg-white text-slate-700 text-sm font-medium px-4 py-2 rounded-lg shadow">
                                            Tap to change photo
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-14 text-center pointer-events-none">
                                    <div className="text-5xl mb-3">🤳</div>
                                    <p className="text-slate-700 font-medium mb-1">Upload your selfie</p>
                                    <p className="text-slate-400 text-xs">
                                        Tap to browse or drag a photo here
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Emotion filter */}
                    <div>
                        <p className="text-sm font-medium text-slate-700 mb-2">
                            Filter by emotion{" "}
                            <span className="text-xs text-blue-500 font-normal ml-1">— unique to SnapFace</span>
                        </p>
                        <div className="flex gap-2 flex-wrap">
                            {["all", "happy", "neutral", "surprised", "sad"].map((e) => (
                                <button
                                    key={e}
                                    onClick={() => setEmotionFilter(e)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${emotionFilter === e
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                                        }`}
                                >
                                    {emotionEmoji[e]} <span className="capitalize">{e}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tips */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700 space-y-1">
                        <p className="font-semibold mb-1">Tips for best results:</p>
                        <p>• Use a clear, front-facing photo</p>
                        <p>• Good lighting works best</p>
                        <p>• Avoid sunglasses or heavy filters</p>
                    </div>

                    {/* Match button */}
                    <button
                        onClick={handleMatch}
                        disabled={!selfie}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl text-sm transition shadow-lg shadow-blue-200"
                    >
                        {selfie ? "Find my photos →" : "Upload a selfie first"}
                    </button>
                </div>
            </Wrapper>
        );
    }

    // ── Step: Matching (loading) ──
    if (step === "matching") {
        return (
            <Wrapper>
                <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm text-center">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                        {selfiePreview && (
                            <img
                                src={selfiePreview}
                                alt=""
                                className="w-20 h-20 rounded-full object-cover border-4 border-blue-100"
                            />
                        )}
                        <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mb-2">Finding your photos...</h2>
                    <p className="text-slate-500 text-sm mb-6">
                        Our AI is scanning {event?.total_photos} photos to find your matches.
                    </p>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(progress, 10)}%` }}
                        />
                    </div>
                    <p className="text-xs text-slate-400 mt-3">This takes a few seconds...</p>
                </div>
            </Wrapper>
        );
    }

    // ── Step: Results ──
    if (step === "results") {
        return (
            <Wrapper>
                <div className="space-y-5">
                    {/* Summary */}
                    <div className={`rounded-2xl p-5 text-center border ${matched.length > 0
                        ? "bg-green-50 border-green-200"
                        : "bg-amber-50 border-amber-200"
                        }`}>
                        <div className="text-4xl mb-2">{matched.length > 0 ? "🎉" : "😔"}</div>
                        <h2 className="text-xl font-bold text-slate-900 mb-1">
                            {matched.length > 0
                                ? `${matched.length} photo${matched.length > 1 ? "s" : ""} found!`
                                : "No photos found"}
                        </h2>
                        <p className="text-slate-500 text-sm">
                            {matched.length > 0
                                ? "Tap any photo to download it."
                                : "Try uploading a clearer selfie or change the emotion filter."}
                        </p>
                    </div>

                    {/* Matched grid */}
                    {matched.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                            {matched.map((photo) => (
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
                                        <span className="opacity-0 group-hover:opacity-100 transition bg-white text-slate-900 text-xs font-medium px-3 py-1.5 rounded-lg">
                                            Download
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Reel generation for guest */}
                    {
                        matched.length >= 2 && (
                            <button
                                onClick={async () => {
                                    const btn = document.getElementById("reel-btn") as HTMLButtonElement;
                                    if (btn) btn.disabled = true;
                                    try {
                                        const { reelService } = await import("@/lib/reel");
                                        const blob = await reelService.generateGuestReel(
                                            token,
                                            matched.map((m) => m.id)
                                        );
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement("a");
                                        a.href = url;
                                        a.download = "my_snapface_reel.mp4";
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    } catch {
                                        alert("Reel generation failed. Please try again.");
                                    } finally {
                                        if (btn) btn.disabled = false;
                                    }
                                }}
                                id="reel-btn"
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-xl text-sm transition"
                            >
                                🎬 Generate my story reel
                            </button>
                        )
                    }

                    {/* Try again */}
                    <button
                        onClick={() => {
                            setSelfie(null);
                            setSelfiePreview(null);
                            setMatched([]);
                            setStep("selfie");
                        }}
                        className="w-full border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 font-medium py-3 rounded-xl text-sm transition"
                    >
                        Try with different selfie
                    </button>
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
                            <div className="p-4 flex gap-3">
                                <a
                                    href={lightbox.url}
                                    download
                                    target="_blank"
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-xl text-center transition"
                                >
                                    Download photo
                                </a>
                                <button
                                    onClick={() => setLightbox(null)}
                                    className="px-5 border border-slate-200 text-slate-600 text-sm rounded-xl hover:border-slate-300 transition"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </Wrapper>
        );
    }

    return null;
}