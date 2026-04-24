"use client";
import { useEffect, useState } from "react";
import { REACTIONS, reactionService, ReactionData } from "@/lib/reactions";

interface ReactionBarProps {
    photoId: string;
    galleryToken?: string;
    compact?: boolean;
}

export default function ReactionBar({ photoId, galleryToken, compact = false }: ReactionBarProps) {
    const [data, setData] = useState<ReactionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [reacting, setReacting] = useState(false);

    useEffect(() => {
        reactionService
            .getPhotoReactions(photoId, galleryToken)
            .then((d) => {
                setData(d);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [photoId, galleryToken]);

    async function handleReact(reaction: string) {
        if (reacting) return;
        setReacting(true);

        // Optimistic update
        setData((prev) => {
            if (!prev) return prev;
            const updated = { ...prev, reactions: { ...prev.reactions } };

            if (prev.my_reaction === reaction) {
                // Toggle off
                updated.reactions[reaction] = Math.max(0, (updated.reactions[reaction] || 1) - 1);
                if (updated.reactions[reaction] === 0) delete updated.reactions[reaction];
                updated.my_reaction = null;
                updated.total = Math.max(0, updated.total - 1);
            } else {
                // Remove old reaction if any
                if (prev.my_reaction) {
                    updated.reactions[prev.my_reaction] = Math.max(0, (updated.reactions[prev.my_reaction] || 1) - 1);
                    if (updated.reactions[prev.my_reaction] === 0) delete updated.reactions[prev.my_reaction];
                    updated.total = Math.max(0, updated.total - 1);
                }
                // Add new
                updated.reactions[reaction] = (updated.reactions[reaction] || 0) + 1;
                updated.my_reaction = reaction;
                updated.total += 1;
            }

            return updated;
        });

        try {
            const result = await reactionService.react(photoId, reaction, galleryToken);
            // Refresh from server to get accurate counts
            const fresh = await reactionService.getPhotoReactions(photoId, galleryToken);
            setData(fresh);
        } catch (e) {
            console.error("Reaction failed", e);
        } finally {
            setReacting(false);
        }
    }

    if (loading) return (
        <div className="flex gap-1.5">
            {REACTIONS.map((r) => (
                <div key={r} className="w-10 h-8 bg-slate-100 rounded-full animate-pulse" />
            ))}
        </div>
    );

    return (
        <div className={`flex items-center gap-1.5 flex-wrap ${compact ? "" : "mt-1"}`}>
            {REACTIONS.map((reaction) => {
                const count = data?.reactions[reaction] || 0;
                const isSelected = data?.my_reaction === reaction;

                return (
                    <button
                        key={reaction}
                        onClick={() => handleReact(reaction)}
                        disabled={reacting}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all ${isSelected
                                ? "bg-blue-600 border-blue-600 text-white scale-110"
                                : count > 0
                                    ? "bg-slate-50 border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                                    : "bg-white border-slate-200 text-slate-500 hover:border-blue-200 hover:bg-blue-50"
                            }`}
                    >
                        <span className="text-sm leading-none">{reaction}</span>
                        {count > 0 && (
                            <span className={isSelected ? "text-white" : "text-slate-600"}>
                                {count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}