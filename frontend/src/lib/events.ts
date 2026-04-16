import api from "./api";
import { Event } from "@/types";

export const eventService = {
    async list(): Promise<Event[]> {
        const res = await api.get("/events");
        return res.data;
    },

    async get(id: string): Promise<Event> {
        const res = await api.get(`/events/${id}`);
        return res.data;
    },

    async create(data: {
        name: string;
        description?: string;
        event_date?: string;
        is_password_protected?: boolean;
        album_password?: string;
    }): Promise<Event> {
        const res = await api.post("/events", data);
        return res.data;
    },

    async update(id: string, data: Partial<Event>): Promise<Event> {
        const res = await api.patch(`/events/${id}`, data);
        return res.data;
    },

    async delete(id: string): Promise<void> {
        await api.delete(`/events/${id}`);
    },

    async getQR(id: string): Promise<{ qr_base64: string; guest_url: string }> {
        const res = await api.get(`/events/${id}/qr`);
        return res.data;
    },
};