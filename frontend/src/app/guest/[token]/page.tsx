"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { guestService, GuestEvent, MatchedPhoto } from "@/lib/guest";

const emotionEmoji: Record<string, string> = {
    all: "🖼️", happy: "😊", sad: "😢", angry: "😠",
    surprised: "😲", neutral: "😐", fear: "😨", disgust: "🤢",
};

type Step = "landing" | "password" | "capsule" | "selfie" | "matching" | "results";

// ── Countdown component ──
function Countdown({ seconds: initialSeconds, onUnlock }: { seconds: number; onUnlock: () => void }) {
    const [remaining, setRemaining] = useState(initialSeconds);

    useEffect(() => {
        if (remaining <= 0) {
            onUnlock();
            return;
        }
        const timer = setInterval(() => {
            setRemaining((s) => {
                if (s <= 1) { onUnlock(); return 0; }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);
    const mins = Math.floor((remaining % 3600) / 60);
    const secs = remaining % 60;

    const units = [
        { val: days, label: "Days" },
        { val: hours, label: "Hours" },
        { val: mins, label: "Mins" },
        { val: secs, label: "Secs" },
    ];

    return (
        <div className="grid grid-cols-4 gap-2 my-6">
            {units.map((u) => (
                <div key={u.label} className="bg-blue-600 rounded-2xl p-3 text-center text-white">
                    <div className="text-2xl font-bold tabular-nums">
                        {String(u.val).padStart(2, "0")}
                    </div>
                    <div className="text-xs text-blue-200 mt-0.5">{u.label}</div>
                </div>
            ))}
        </div>
    );
}

function PasswordStep({
    onVerify,
}: {
    onVerify: (password: string) => Promise<void>;
}) {
    const [pwd, setPwd] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await onVerify(pwd);
        } catch {
            setError("Incorrect password. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
            <div className="text-4xl mb-4">🔒</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Album protected</h2>
            <p className="text-slate-500 text-sm mb-6">
                Enter the password provided by the photographer to access photos.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}
                <input
                    type="password"
                    value={pwd}
                    onChange={(e) => setPwd(e.target.value)}
                    placeholder="Enter album password"
                    required
                    autoFocus
                    autoComplete="current-password"
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-3 rounded-xl text-sm transition"
                >
                    {loading ? "Verifying..." : "Continue →"}
                </button>
            </form>
        </div>
    );
}

export default function GuestPage() {
    const { token } = useParams<{ token: string }>();
    const [resultEmotion, setResultEmotion] = useState("all");
    const [event, setEvent] = useState<GuestEvent | null>(null);
    const [loadingEvent, setLoadingEvent] = useState(true);
    const [eventError, setEventError] = useState("");
    const [step, setStep] = useState<Step>("landing");
    const [guestName, setGuestName] = useState("");
    const [galleryUrl, setGalleryUrl] = useState<string | null>(null);
    const [galleryToken, setGalleryToken] = useState<string | null>(null);

    // Password
    const [password, setPassword] = useState("");

    // Selfie
    const [selfie, setSelfie] = useState<File | null>(null);
    const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
    const [emotionFilter, setEmotionFilter] = useState("all");

    // Matching
    const [progress, setProgress] = useState(0);
    const [matchError, setMatchError] = useState("");

    // Results
    const [matched, setMatched] = useState<MatchedPhoto[]>([]);
    const [lightbox, setLightbox] = useState<MatchedPhoto | null>(null);

    useEffect(() => {
        guestService
            .getEvent(token)
            .then((data) => {
                setEvent(data);
                setLoadingEvent(false);
                // Determine initial step
                if (data.has_capsule && data.capsule_is_locked) {
                    setStep("capsule");
                } else if (data.is_password_protected) {
                    setStep("password");
                } else {
                    setStep("selfie");
                }
            })
            .catch(() => {
                setEventError("Event not found or no longer active.");
                setLoadingEvent(false);
            });
    }, [token]);

    async function handleMatch() {
        if (!selfie) return;
        setStep("matching");
        setProgress(0);
        setMatchError("");
        try {
            const result = await guestService.matchSelfie(
                token,
                selfie,
                guestName || undefined,
                event?.is_password_protected ? password : undefined,
                emotionFilter !== "all" ? emotionFilter : undefined,
                setProgress
            );
            setMatched(result.matched);
            setGalleryUrl(result.gallery_url);
            setGalleryToken(result.gallery_token);
            sessionStorage.setItem(`matched_${token}`, JSON.stringify(result.matched));
            setStep("results");
        } catch (err: any) {
            setMatchError(err.response?.data?.detail || "Something went wrong.");
            setStep("selfie");
        }
    }

    function handleCapsuleUnlock() {
        // Capsule just unlocked on client — move to password or selfie
        if (event?.is_password_protected) {
            setStep("password");
        } else {
            setStep("selfie");
        }
    }

    // ── Shared wrapper ──
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <div className="min-h-screen bg-linear-to-b from-blue-50 to-white">
            <div className="bg-white border-b border-slate-200 px-6 py-4 text-center">
                <span className="text-xl font-bold text-blue-600">SnapFace</span>
            </div>
            <div className="bg-blue-600 text-white px-6 py-5 text-center">
                <h1 className="text-xl font-bold">{event?.name}</h1>
                <p className="text-blue-100 text-sm mt-1">
                    by {event?.photographer_name} · {event?.total_photos} photos
                </p>
            </div>
            <div className="max-w-lg mx-auto px-6 py-10">{children}</div>
        </div>
    );

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

    // ── Error ──
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

    // ── Step: Capsule locked ──
    if (step === "capsule" && event) {
        return (
            <Wrapper>
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
                    {/* Lock icon */}
                    <div className="w-20 h-20 bg-amber-50 border-2 border-amber-200 rounded-full flex items-center justify-center text-4xl mx-auto mb-5">
                        ⏳
                    </div>

                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Memory time capsule</h2>
                    <p className="text-slate-500 text-sm mb-1">
                        These photos are locked until:
                    </p>
                    <p className="text-blue-600 font-semibold text-sm mb-4">
                        {event.capsule_unlock_at
                            ? new Date(event.capsule_unlock_at).toLocaleString("en-IN", {
                                day: "numeric", month: "long", year: "numeric",
                                hour: "2-digit", minute: "2-digit",
                            })
                            : ""}
                    </p>

                    {/* Countdown */}
                    {event.capsule_seconds_remaining > 0 && (
                        <Countdown
                            seconds={event.capsule_seconds_remaining}
                            onUnlock={handleCapsuleUnlock}
                        />
                    )}

                    {/* Photographer message */}
                    {event.capsule_message && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mt-4 text-left">
                            <p className="text-xs text-blue-500 font-semibold mb-1 uppercase tracking-wide">
                                Message from {event.photographer_name}
                            </p>
                            <p className="text-slate-700 text-sm italic leading-relaxed">
                                "{event.capsule_message}"
                            </p>
                        </div>
                    )}

                    {/* Decorative info */}
                    <div className="mt-6 pt-5 border-t border-slate-100 space-y-2">
                        <p className="text-xs text-slate-400">
                            {event.total_photos} photos waiting for you
                        </p>
                        <p className="text-xs text-slate-400">
                            Come back when the countdown ends to access your memories
                        </p>
                    </div>
                </div>
            </Wrapper>
        );
    }

    // ── Step: Password ──
    if (step === "password") {
        return (
            <Wrapper>
                <PasswordStep
                    onVerify={async (pwd) => {
                        const ok = await guestService.verifyPassword(token, pwd);
                        if (ok) {
                            setPassword(pwd);
                            setStep("selfie");
                        } else {
                            throw new Error("Incorrect password");
                        }
                    }}
                />
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
                            Upload a selfie and our AI will find all your photos instantly.
                        </p>
                    </div>

                    {matchError && (
                        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                            {matchError}
                        </div>
                    )}

                    {/* Selfie upload */}
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
                        <div className={`border-2 border-dashed rounded-2xl transition overflow-hidden ${selfiePreview ? "border-blue-300 bg-white" : "border-slate-200 hover:border-blue-300 bg-white hover:bg-slate-50"
                            }`}>
                            {selfiePreview ? (
                                <div className="relative">
                                    <img src={selfiePreview} alt="Your selfie" className="w-full h-56 object-cover" />
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
                                    <p className="text-slate-400 text-xs">Tap to browse or drag a photo here</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Guest name — optional */}
                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                            Your name <span className="text-xs text-slate-400 font-normal">(optional — for your gallery link)</span>
                        </label>
                        <input
                            type="text"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            placeholder="e.g. Raj Sharma"
                            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                        />
                    </div>

                    {/* Emotion filter */}
                    <div>
                        <p className="text-sm font-medium text-slate-700 mb-2">
                            Filter by emotion
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

    // ── Step: Matching ──
    if (step === "matching") {
        return (
            <Wrapper>
                <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm text-center">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                        {selfiePreview && (
                            <img src={selfiePreview} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-blue-100" />
                        )}
                        <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mb-2">Finding your photos...</h2>
                    <p className="text-slate-500 text-sm mb-6">
                        AI is scanning {event?.total_photos} photos for your face.
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
        const filteredMatched = resultEmotion === "all"
            ? matched
            : matched.filter((p) => p.dominant_emotion === resultEmotion);

        const availableEmotions = ["all", ...Array.from(
            new Set(matched.map((p) => p.dominant_emotion).filter(Boolean) as string[])
        )];

        async function downloadSingle(url: string, filename: string) {
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

        async function downloadAllZip() {
            try {
                const JSZip = (await import("jszip")).default;
                const zip = new JSZip();
                const folder = zip.folder("my_snapface_photos")!;

                await Promise.all(
                    filteredMatched.map(async (photo, idx) => {
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
                a.download = `snapface_photos_${resultEmotion}.zip`;
                a.click();
                URL.revokeObjectURL(a.href);
            } catch (err) {
                alert("Download failed. Please try downloading individually.");
            }
        }

        async function downloadAllDirect() {
            for (let i = 0; i < filteredMatched.length; i++) {
                const photo = filteredMatched[i];
                const ext = photo.url.split(".").pop()?.split("?")[0] || "jpg";
                const emotion = photo.dominant_emotion ? `_${photo.dominant_emotion}` : "";
                await downloadSingle(photo.url, `snapface_${i + 1}${emotion}.${ext}`);
                // Small delay between downloads
                await new Promise((r) => setTimeout(r, 400));
            }
        }

        return (
            <Wrapper>
                <div className="space-y-5">
                    {/* Summary */}
                    <div className={`rounded-2xl p-5 text-center border ${matched.length > 0 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
                        }`}>
                        <div className="text-4xl mb-2">{matched.length > 0 ? "🎉" : "😔"}</div>
                        <h2 className="text-xl font-bold text-slate-900 mb-1">
                            {matched.length > 0
                                ? `${matched.length} photo${matched.length > 1 ? "s" : ""} found!`
                                : "No photos found"}
                        </h2>
                        <p className="text-slate-500 text-sm">
                            {matched.length > 0
                                ? "Download individually or all at once."
                                : "Try uploading a clearer selfie or change the emotion filter."}
                        </p>
                    </div>

                    {/* Bulk download buttons */}
                    {filteredMatched.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                            <p className="text-sm font-semibold text-slate-700">
                                Download all {filteredMatched.length} photos
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={downloadAllZip}
                                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 rounded-xl transition"
                                >
                                    <span>📦</span> Download as ZIP
                                </button>
                                <button
                                    onClick={downloadAllDirect}
                                    className="flex items-center justify-center gap-2 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold py-2.5 rounded-xl transition"
                                >
                                    <span>📥</span> Download all files
                                </button>
                            </div>
                            <p className="text-xs text-slate-400 text-center">
                                ZIP works best · "Download all files" opens each file separately
                            </p>
                        </div>
                    )}

                    {/* Emotion filter */}
                    {matched.length > 0 && availableEmotions.length > 1 && (
                        <div>
                            <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                Filter your photos
                                <span className="text-xs text-blue-500 font-normal">— by emotion</span>
                            </p>
                            <div className="flex gap-2 flex-wrap">
                                {availableEmotions.map((e) => {
                                    const count = e === "all"
                                        ? matched.length
                                        : matched.filter((p) => p.dominant_emotion === e).length;
                                    return (
                                        <button
                                            key={e}
                                            onClick={() => setResultEmotion(e)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${resultEmotion === e
                                                ? "bg-blue-600 text-white border-blue-600"
                                                : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                                                }`}
                                        >
                                            <span>{emotionEmoji[e] || "🖼️"}</span>
                                            <span className="capitalize">{e}</span>
                                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${resultEmotion === e
                                                ? "bg-white/20 text-white"
                                                : "bg-slate-100 text-slate-500"
                                                }`}>
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Gallery share card */}
                    {galleryUrl && (
                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                            <div className="flex items-start gap-3">
                                <div className="text-2xl flex-shrink-0">🔗</div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-blue-900 mb-0.5">
                                        Your personal gallery is ready!
                                    </p>
                                    <p className="text-xs text-blue-600 mb-3">
                                        Share this link — anyone can view your photos without uploading a selfie.
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(galleryUrl);
                                                alert("Gallery link copied!");
                                            }}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 rounded-xl transition"
                                        >
                                            📋 Copy gallery link
                                        </button>
                                        <button
                                            onClick={() => {
                                                const msg = encodeURIComponent(
                                                    `Hey! Here are my photos from ${event?.name} 📸\n\nView my gallery: ${galleryUrl}`
                                                );
                                                window.open(`https://wa.me/?text=${msg}`, "_blank");
                                            }}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2.5 rounded-xl transition"
                                        >
                                            📱 Share on WhatsApp
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Photo grid */}
                    {matched.length > 0 && (
                        <>
                            {filteredMatched.length === 0 ? (
                                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
                                    <div className="text-3xl mb-2">{emotionEmoji[resultEmotion]}</div>
                                    <p className="text-slate-500 text-sm">
                                        No {resultEmotion} photos in your matches.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {filteredMatched.map((photo, idx) => (
                                        <div
                                            key={photo.id}
                                            className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 group"
                                        >
                                            <img
                                                src={photo.thumbnail_url || photo.url}
                                                alt=""
                                                className="w-full h-full object-cover"
                                                onClick={() => setLightbox(photo)}
                                            />
                                            {/* Emotion badge */}
                                            {photo.dominant_emotion && (
                                                <div className="absolute top-2 left-2 bg-white/90 text-xs px-2 py-0.5 rounded-full font-medium text-slate-700">
                                                    {emotionEmoji[photo.dominant_emotion]}
                                                </div>
                                            )}
                                            {/* Download button — always visible on mobile, hover on desktop */}
                                            <button
                                                onClick={() => {
                                                    const ext = photo.url.split(".").pop()?.split("?")[0] || "jpg";
                                                    const emotion = photo.dominant_emotion ? `_${photo.dominant_emotion}` : "";
                                                    downloadSingle(photo.url, `snapface_${idx + 1}${emotion}.${ext}`);
                                                }}
                                                className="absolute bottom-2 right-2 bg-blue-600 hover:bg-blue-700 text-white text-xs px-2.5 py-1.5 rounded-lg font-medium transition opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex items-center gap-1"
                                            >
                                                <span>↓</span> Save
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* Reel button with settings */}
                    {filteredMatched.length >= 2 && (
                        <button
                            onClick={() => {
                                sessionStorage.setItem(`matched_${token}`, JSON.stringify(filteredMatched));
                                window.location.href = `/guest/${token}/reel`;
                            }}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-xl text-sm transition"
                        >
                            🎬 Create my story reel →
                        </button>
                    )}

                    {/* Try again */}
                    <button
                        onClick={() => {
                            setSelfie(null);
                            setSelfiePreview(null);
                            setMatched([]);
                            setResultEmotion("all");
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
                            <div className="p-4 space-y-2">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            const ext = lightbox.url.split(".").pop()?.split("?")[0] || "jpg";
                                            const emotion = lightbox.dominant_emotion ? `_${lightbox.dominant_emotion}` : "";
                                            downloadSingle(lightbox.url, `snapface${emotion}.${ext}`);
                                        }}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-xl text-center transition"
                                    >
                                        📥 Download photo
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
                                        {emotionEmoji[lightbox.dominant_emotion]} {lightbox.dominant_emotion} photo
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Wrapper>
        );
    }

    return null;
}