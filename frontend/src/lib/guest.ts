import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const guestApi = axios.create({ baseURL: BASE });

export interface GuestEvent {
    id: string;
    name: string;
    description: string | null;
    event_date: string | null;
    is_password_protected: boolean;
    photographer_name: string;
    total_photos: number;
    has_capsule: boolean;
    capsule_is_locked: boolean;
    capsule_unlock_at: string | null;
    capsule_message: string | null;
    capsule_seconds_remaining: number;
}

export interface MatchedPhoto {
    id: string;
    url: string;
    thumbnail_url: string | null;
    dominant_emotion: string | null;
    face_count: number;
    distance: number;
}

export const guestService = {
    async getEvent(qrToken: string): Promise<GuestEvent> {
        const res = await guestApi.get(`/guest/event/${qrToken}`);
        return res.data;
    },

    async verifyPassword(qrToken: string, password: string): Promise<boolean> {
        const formData = new FormData();
        formData.append("password", password);
        const res = await guestApi.post(`/guest/verify-password/${qrToken}`, formData);
        return res.data.verified;
    },

    async matchSelfie(
        qrToken: string,
        selfie: File,
        password?: string,
        emotionFilter?: string,
        onProgress?: (pct: number) => void
    ): Promise<MatchedPhoto[]> {
        const formData = new FormData();
        formData.append("selfie", selfie);
        if (password) formData.append("password", password);
        if (emotionFilter && emotionFilter !== "all")
            formData.append("emotion_filter", emotionFilter);

        const res = await guestApi.post(`/guest/match/${qrToken}`, formData, {
            onUploadProgress: (e) => {
                if (onProgress && e.total)
                    onProgress(Math.round((e.loaded * 100) / e.total));
            },
        });
        return res.data;
    },
};