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

    async getEventPhotos(
        eventId: string,
        scene?: string
    ): Promise<Photo[]> {
        const params: any = {};
        if (scene && scene !== "all") params.scene = scene;
        const res = await api.get(`/photos/event/${eventId}`, { params });
        return res.data;
    },

    async delete(photoId: string): Promise<void> {
        await api.delete(`/photos/${photoId}`);
    },

    async downloadAll(eventId: string, eventName: string): Promise<void> {
        const token = localStorage.getItem("token");
        const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

        const res = await fetch(`${BASE}/photos/download-all/${eventId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Download failed");

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${eventName.replace(/\s/g, "_")}_photos.zip`;
        a.click();
        URL.revokeObjectURL(url);
    },
};