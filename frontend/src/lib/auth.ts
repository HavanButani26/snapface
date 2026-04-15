import api from "./api";

export interface User {
    id: string;
    name: string;
    email: string;
    logo_url: string | null;
    created_at: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    user: User;
}

export const authService = {
    async register(name: string, email: string, password: string): Promise<AuthResponse> {
        const res = await api.post("/auth/register", { name, email, password });
        return res.data;
    },

    async login(email: string, password: string): Promise<AuthResponse> {
        const formData = new FormData();
        formData.append("username", email);
        formData.append("password", password);
        const res = await api.post("/auth/login", formData);
        return res.data;
    },

    async getMe(): Promise<User> {
        const res = await api.get("/auth/me");
        return res.data;
    },

    saveSession(data: AuthResponse) {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("user", JSON.stringify(data.user));
    },

    clearSession() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
    },

    getUser(): User | null {
        const u = localStorage.getItem("user");
        return u ? JSON.parse(u) : null;
    },

    isLoggedIn(): boolean {
        return !!localStorage.getItem("token");
    },
};