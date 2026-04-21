import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface GuestReelSettings {
    photo_ids: string[];
    aspect_ratio?: string;
    transition?: string;
    photo_duration?: number;
    title_text?: string;
    subtitle_text?: string;
    overlay_text?: string;
    music_track_id?: string | null;
    music_url?: string | null;
    ken_burns?: boolean;
    show_intro?: boolean;
    show_outro?: boolean;
}

export const reelService = {
    async generateGuestReel(
        qrToken: string,
        settings: GuestReelSettings,
        onProgress?: (pct: number) => void
    ): Promise<Blob> {
        if (onProgress) {
            const interval = setInterval(() => {
                onProgress(Math.min((onProgress as any)._pct = (((onProgress as any)._pct || 0) + 3), 88));
            }, 1000);

            const res = await axios.post(
                `${BASE}/reel/generate-guest/${qrToken}`,
                settings,
                {
                    responseType: "blob",
                    headers: { "Content-Type": "application/json" },
                    onDownloadProgress: (e) => {
                        if (e.total) onProgress(Math.round((e.loaded / e.total) * 100));
                    },
                }
            );
            clearInterval(interval);
            onProgress(100);
            return res.data;
        }

        const res = await axios.post(
            `${BASE}/reel/generate-guest/${qrToken}`,
            settings,
            {
                responseType: "blob",
                headers: { "Content-Type": "application/json" },
            }
        );
        return res.data;
    },

    async getEventReel(
        eventId: string,
        settings: any,
        token: string,
        onProgress?: (pct: number) => void
    ): Promise<Blob> {
        const interval = setInterval(() => {
            if (onProgress) onProgress(Math.min((onProgress as any)._p = (((onProgress as any)._p || 0) + 2), 88));
        }, 800);

        const res = await axios.post(
            `${BASE}/reel/generate/${eventId}`,
            settings,
            {
                responseType: "blob",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        clearInterval(interval);
        if (onProgress) onProgress(100);
        return res.data;
    },
};