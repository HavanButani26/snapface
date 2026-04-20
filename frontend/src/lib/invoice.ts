import api from "./api";

export interface InvoiceItem {
    description: string;
    quantity: number;
    rate: number;
    amount: number;
}

export interface Invoice {
    id: string;
    invoice_number: string;
    client_name: string;
    client_email: string | null;
    client_phone: string | null;
    event_name: string | null;
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    tax_percent: number;
    status: "pending" | "paid" | "overdue" | "cancelled";
    razorpay_payment_link_url: string | null;
    invoice_date: string;
    due_date: string | null;
    paid_at: string | null;
    notes: string | null;
    items: string;
    created_at: string;
}

export interface Analytics {
    monthly: {
        total_billed: number;
        collected: number;
        pending: number;
        invoice_count: number;
    };
    all_time: {
        total_billed: number;
        collected: number;
        pending: number;
        invoice_count: number;
    };
    by_status: {
        pending: number;
        paid: number;
        overdue: number;
    };
}

export interface StudioProfile {
    name: string;
    email: string;
    studio_name: string | null;
    studio_address: string | null;
    studio_phone: string | null;
    studio_gstin: string | null;
    studio_upi_id: string | null;
}

export const invoiceService = {
    async list(): Promise<Invoice[]> {
        const res = await api.get("/invoices");
        return res.data;
    },

    async get(id: string): Promise<Invoice> {
        const res = await api.get(`/invoices/${id}`);
        return res.data;
    },

    async create(data: {
        client_name: string;
        client_email?: string;
        client_phone?: string;
        client_address?: string;
        event_name?: string;
        event_date?: string;
        due_date?: string;
        items: InvoiceItem[];
        tax_percent: number;
        discount_amount: number;
        notes?: string;
    }): Promise<Invoice> {
        const res = await api.post("/invoices", data);
        return res.data;
    },

    async markPaid(id: string): Promise<Invoice> {
        const res = await api.patch(`/invoices/${id}/mark-paid`);
        return res.data;
    },

    async cancel(id: string): Promise<Invoice> {
        const res = await api.patch(`/invoices/${id}/cancel`);
        return res.data;
    },

    async delete(id: string): Promise<void> {
        await api.delete(`/invoices/${id}`);
    },

    async sendEmail(id: string): Promise<void> {
        await api.post(`/invoices/${id}/send-email`);
    },

    async downloadPdf(id: string, invoiceNumber: string): Promise<void> {
        const res = await api.get(`/invoices/${id}/pdf`, { responseType: "blob" });
        const url = URL.createObjectURL(res.data);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Invoice_${invoiceNumber}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
    },

    async getAnalytics(): Promise<Analytics> {
        const res = await api.get("/invoices/analytics");
        return res.data;
    },

    async getProfile(): Promise<StudioProfile> {
        const res = await api.get("/invoices/profile");
        return res.data;
    },

    async updateProfile(data: Partial<StudioProfile>): Promise<void> {
        await api.put("/invoices/profile", data);
    },
};