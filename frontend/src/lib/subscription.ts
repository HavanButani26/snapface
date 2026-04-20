import api from "./api";

export interface SubscriptionData {
    id: string;
    plan_name: string;
    plan_label: string;
    billing_cycle: string | null;
    storage_limit_bytes: number;
    storage_used_bytes: number;
    storage_limit_label: string;
    storage_used_label: string;
    storage_percent: number;
    status: string;
    is_active: boolean;
    expires_at: string | null;
    razorpay_payment_link_url: string | null;
    days_remaining: number | null;
}

export interface Plan {
    key: string;
    name: string;
    storage_label: string;
    price_monthly: number;
    price_quarterly: number;
    price_yearly: number;
    features: string[];
}

export const subscriptionService = {
    async getMySubscription(): Promise<SubscriptionData> {
        const res = await api.get("/subscription/me");
        return res.data;
    },

    async getPlans(): Promise<Plan[]> {
        const res = await api.get("/subscription/plans");
        return res.data;
    },

    async subscribe(
        planName: string,
        billingCycle: string,
        paymentMethod: string
    ): Promise<{ payment_url: string; subscription: SubscriptionData }> {
        const res = await api.post("/subscription/subscribe", {
            plan_name: planName,
            billing_cycle: billingCycle,
            payment_method: paymentMethod,
        });
        return res.data;
    },

    async cancel(): Promise<void> {
        await api.post("/subscription/cancel");
    },
};