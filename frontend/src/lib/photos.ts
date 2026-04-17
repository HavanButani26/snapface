import api from "./api";
import { Photo } from "@/types";

export const photoService = {
    async upload(
        eventId: string,
        files: File[],
        onProgress?: (percent: number) => void
    ): Promise<{ uploaded: number; errors: any[]; photos: any[] }> {
        const formData = new FormData();
        files.forEach((f) => formData.append("files", f));
        const res = await api.post(`/photos/upload/${eventId}`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress: (e) => {
                if (onProgress && e.total) {
                    onProgress(Math.round((e.loaded * 100) / e.total));
                }
            },
        });
        return res.data;
    },

    async getEventPhotos(eventId: string, emotion?: string): Promise<Photo[]> {
        const params = emotion && emotion !== "all" ? { emotion } : {};
        const res = await api.get(`/photos/event/${eventId}`, { params });
        return res.data;
    },

    async delete(photoId: string): Promise<void> {
        await api.delete(`/photos/${photoId}`);
    },
};