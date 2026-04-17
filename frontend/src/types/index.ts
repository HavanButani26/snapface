export interface User {
    id: string;
    name: string;
    email: string;
    logo_url: string | null;
    created_at: string;
}

export interface Event {
    id: string;
    name: string;
    description: string | null;
    event_date: string | null;
    is_password_protected: boolean;
    qr_token: string;
    is_active: boolean;
    photo_count: number;
    created_at: string;
}

export interface Photo {
    id: string;
    event_id: string;
    url: string;
    thumbnail_url: string | null;
    dominant_emotion: string | null;
    emotion_scores: string | null;
    sharpness_score: number | null;
    face_count: number;
    uploaded_at: string;
}