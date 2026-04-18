import api from "./api";

export interface CapsuleData {
    id: string;
    event_id: string;
    unlock_at: string;
    message: string | null;
    is_unlocked: boolean;
    notify_emails: string[];
    created_at: string;
    seconds_remaining: number;
}

export const capsuleService = {
    async create(
        eventId: string,
        data: { unlock_at: string; message?: string; notify_emails?: string[] }
    ): Promise<CapsuleData> {
        const res = await api.post(`/capsule/${eventId}`, data);
        return res.data;
    },

    async get(eventId: string): Promise<CapsuleData> {
        const res = await api.get(`/capsule/${eventId}`);
        return res.data;
    },

    async delete(eventId: string): Promise<void> {
        await api.delete(`/capsule/${eventId}`);
    },
};