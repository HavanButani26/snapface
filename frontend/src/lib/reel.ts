import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const reelService = {
    async generateGuestReel(
        qrToken: string,
        photoIds: string[],
        onProgress?: (pct: number) => void
    ): Promise<Blob> {
        const res = await axios.post(
            `${BASE}/reel/generate-guest/${qrToken}`,
            photoIds,
            {
                responseType: "blob",
                headers: { "Content-Type": "application/json" },
                onDownloadProgress: (e) => {
                    if (onProgress && e.total)
                        onProgress(Math.round((e.loaded * 100) / e.total));
                },
            }
        );
        return res.data;
    },

    async generateEventReel(
        eventId: string,
        token: string,
        onProgress?: (pct: number) => void
    ): Promise<Blob> {
        const res = await axios.post(
            `${BASE}/reel/generate/${eventId}`,
            {},
            {
                responseType: "blob",
                headers: { Authorization: `Bearer ${token}` },
                onDownloadProgress: (e) => {
                    if (onProgress && e.total)
                        onProgress(Math.round((e.loaded * 100) / e.total));
                },
            }
        );
        return res.data;
    },
};