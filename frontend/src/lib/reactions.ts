import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const guestApi = axios.create({ baseURL: BASE });

export const REACTIONS = ["❤️", "😍", "🔥", "👏", "😢"];

export interface ReactionData {
    photo_id: string;
    reactions: Record<string, number>;
    total: number;
    my_reaction: string | null;
}

export const reactionService = {
    async getPhotoReactions(
        photoId: string,
        galleryToken?: string
    ): Promise<ReactionData> {
        const params = galleryToken ? { gallery_token: galleryToken } : {};
        const res = await guestApi.get(`/reactions/photo/${photoId}`, { params });
        return res.data;
    },

    async react(
        photoId: string,
        reaction: string,
        galleryToken?: string
    ): Promise<{ action: string; reaction: string }> {
        const res = await guestApi.post(`/reactions/photo/${photoId}`, {
            reaction,
            gallery_token: galleryToken,
        });
        return res.data;
    },
};