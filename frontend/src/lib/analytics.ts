import api from "./api";

export interface EventAnalyticsData {
    summary: {
        qr_scans: number;
        selfie_matches: number;
        no_matches: number;
        photo_downloads: number;
        gallery_views: number;
        gallery_shares: number;
        total_photos: number;
        total_galleries: number;
        match_rate: number;
    };
    daily_visits: {
        date: string;
        short_date: string;
        visits: number;
    }[];
    top_photos: {
        id: string;
        thumbnail_url: string | null;
        url: string;
        downloads: number;
        dominant_emotion: string | null;
    }[];
    recent_activity: {
        action: string;
        label: string;
        guest_name: string;
        created_at: string;
        time_ago: string;
    }[];
    hourly_distribution: {
        hour: string;
        visits: number;
    }[];
}

export const analyticsService = {
    async getEventAnalytics(eventId: string): Promise<EventAnalyticsData> {
        const res = await api.get(`/analytics/event/${eventId}`);
        return res.data;
    },
};