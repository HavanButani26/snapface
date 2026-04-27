import api from "./api";

export interface Attendee {
    id: string;
    name: string;
    email: string | null;
    department: string | null;
    employee_id: string | null;
    reference_photo_url: string | null;
    is_present: boolean;
    confidence: number | null;
    matched_photo_count: number;
    marked_at: string | null;
    has_encoding: boolean;
}

export interface AttendanceReport {
    event_name: string;
    total_attendees: number;
    present_count: number;
    absent_count: number;
    attendance_rate: number;
    department_breakdown: {
        department: string;
        total: number;
        present: number;
        absent: number;
        attendance_rate: number;
    }[];
    present: Attendee[];
    absent: Attendee[];
}

export const attendanceService = {
    async addAttendee(
        eventId: string,
        data: {
            name: string;
            email?: string;
            department?: string;
            employee_id?: string;
            photo?: File;
        }
    ): Promise<Attendee> {
        const form = new FormData();
        form.append("name", data.name);
        if (data.email) form.append("email", data.email);
        if (data.department) form.append("department", data.department);
        if (data.employee_id) form.append("employee_id", data.employee_id);
        if (data.photo) form.append("photo", data.photo);

        const res = await api.post(`/attendance/${eventId}/attendees`, form, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return res.data;
    },

    async listAttendees(eventId: string): Promise<Attendee[]> {
        const res = await api.get(`/attendance/${eventId}/attendees`);
        return res.data;
    },

    async deleteAttendee(eventId: string, attendeeId: string): Promise<void> {
        await api.delete(`/attendance/${eventId}/attendees/${attendeeId}`);
    },

    async scan(eventId: string): Promise<{ message: string }> {
        const res = await api.post(`/attendance/${eventId}/scan`);
        return res.data;
    },

    async getReport(eventId: string): Promise<AttendanceReport> {
        const res = await api.get(`/attendance/${eventId}/report`);
        return res.data;
    },

    downloadCsv(eventId: string, eventName: string) {
        const token = localStorage.getItem("token");
        const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const link = document.createElement("a");
        link.href = `${BASE}/attendance/${eventId}/export-csv`;
        link.setAttribute(
            "download",
            `${eventName.replace(/\s/g, "_")}_attendance.csv`
        );

        // Fetch with auth header
        fetch(link.href, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.blob())
            .then((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${eventName.replace(/\s/g, "_")}_attendance.csv`;
                a.click();
                URL.revokeObjectURL(url);
            });
    },
};