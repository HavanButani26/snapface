import api from "./api";

export interface DuplicatePhoto {
    id: string;
    url: string;
    thumbnail_url: string | null;
    sharpness_score: number | null;
    face_count: number;
    dominant_emotion: string | null;
    scene_category: string | null;
}

export interface DuplicatePair {
    id: string;
    similarity: number;
    similarity_percent: string;
    recommended_keep: string | null;
    photo_a: DuplicatePhoto;
    photo_b: DuplicatePhoto;
}

export interface DuplicatesData {
    total: number;
    duplicates: DuplicatePair[];
}

export const duplicateService = {
    async scan(eventId: string): Promise<{ message: string }> {
        const res = await api.post(`/duplicates/scan/${eventId}`);
        return res.data;
    },

    async getDuplicates(eventId: string): Promise<DuplicatesData> {
        const res = await api.get(`/duplicates/${eventId}`);
        return res.data;
    },

    async resolve(duplicateId: string, keepPhotoId: string): Promise<void> {
        await api.post(
            `/duplicates/resolve/${duplicateId}?keep_photo_id=${keepPhotoId}`
        );
    },

    async resolveAll(eventId: string): Promise<{ message: string }> {
        const res = await api.post(`/duplicates/resolve-all/${eventId}`);
        return res.data;
    },
};