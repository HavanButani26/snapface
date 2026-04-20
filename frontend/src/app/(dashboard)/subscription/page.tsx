"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { subscriptionService, SubscriptionData, Plan } from "@/lib/subscription";

type Cycle = "monthly" | "quarterly" | "yearly";

const cycleLabels: Record<Cycle, string> = {
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly (2 months free)",
};

const cycleDiscount: Record<Cycle, string> = {
    monthly: "",
    quarterly: "Save 10%",
    yearly: "Save 17%",
};

const planColors: Record<string, string> = {
    free: "border-slate-200",
    starter: "border-blue-300",
    pro: "border-violet-400",
    studio: "border-amber-400",
};

const planBadges: Record<string, string> = {
    free: "",
    starter: "",
    pro: "bg-violet-100 text-violet-700 border border-violet-200",
    studio: "bg-amber-100 text-amber-700 border border-amber-200",
};

function fmt(n: number) {
    return `₹${n.toLocaleString("en-IN")}`;
}

export default function SubscriptionPage() {
    const [sub, setSub] = useState<SubscriptionData | null>(null);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [cycle, setCycle] = useState<Cycle>("monthly");
    const [loading, setLoading] = useState(true);
    const [subscribing, setSubscribing] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        Promise.all([
            subscriptionService.getMySubscription(),
            subscriptionService.getPlans(),
        ]).then(([s, p]) => {
            setSub(s);
            setPlans(p);
            setLoading(false);
        });
    }, []);

    async function handleSubscribe(
        planKey: string,
        paymentMethod: "subscription" | "payment_link"
    ) {
        setSubscribing(`${planKey}-${paymentMethod}`);
        try {
            const res = await subscriptionService.subscribe(planKey, cycle, paymentMethod);
            window.open(res.payment_url, "_blank");
            setSub(res.subscription);
        } catch (err: any) {
            alert(err.response?.data?.detail || "Failed to create subscription");
        } finally {
            setSubscribing(null);
        }
    }

    async function handleCancel() {
        if (!confirm("Cancel subscription? You'll keep access until expiry.")) return;
        setCancelling(true);
        try {
            await subscriptionService.cancel();
            const updated = await subscriptionService.getMySubscription();
            setSub(updated);
        } catch (err: any) {
            alert(err.response?.data?.detail || "Failed to cancel");
        } finally {
            setCancelling(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const storagePercent = sub?.storage_percent || 0;
    const storageColor =
        storagePercent >= 90 ? "bg-red-500" :
            storagePercent >= 70 ? "bg-amber-500" :
                "bg-blue-600";

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Subscription & Storage</h1>
                <p className="text-slate-500 text-sm mt-1">Manage your plan and storage usage</p>
            </div>

            {/* Current plan card */}
            {sub && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-8">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-lg font-bold text-slate-900">
                                    {sub.plan_label} Plan
                                </h2>
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${sub.status === "active"
                                        ? "bg-green-50 text-green-700 border-green-200"
                                        : sub.status === "payment_pending"
                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                            : sub.status === "cancelled"
                                                ? "bg-slate-100 text-slate-500 border-slate-200"
                                                : "bg-red-50 text-red-700 border-red-200"
                                    }`}>
                                    {sub.status === "active" ? "● Active" :
                                        sub.status === "payment_pending" ? "⏳ Payment pending" :
                                            sub.status === "cancelled" ? "Cancelled" : "Expired"}
                                </span>
                            </div>
                            {sub.expires_at && sub.plan_name !== "free" && (
                                <p className="text-sm text-slate-500">
                                    {sub.status === "cancelled" ? "Access until" : "Renews on"}{" "}
                                    <span className="font-medium text-slate-700">
                                        {new Date(sub.expires_at).toLocaleDateString("en-IN", {
                                            day: "numeric", month: "long", year: "numeric",
                                        })}
                                    </span>
                                    {sub.days_remaining !== null && sub.days_remaining <= 7 && (
                                        <span className="ml-2 text-amber-600 font-medium">
                                            ({sub.days_remaining} days left!)
                                        </span>
                                    )}
                                </p>
                            )}
                            {sub.razorpay_payment_link_url && sub.status === "payment_pending" && (
                                <a
                                    href={sub.razorpay_payment_link_url}
                                    target="_blank"
                                    className="inline-block mt-2 text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg font-medium transition"
                                >
                                    Complete payment →
                                </a>
                            )}
                        </div>

                        {sub.plan_name !== "free" && sub.status === "active" && (
                            <button
                                onClick={handleCancel}
                                disabled={cancelling}
                                className="text-sm border border-red-200 text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl transition font-medium"
                            >
                                {cancelling ? "Cancelling..." : "Cancel plan"}
                            </button>
                        )}
                    </div>

                    {/* Storage bar */}
                    <div className="mt-5">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-slate-700">Storage usage</p>
                            <p className="text-sm text-slate-500">
                                <span className="font-semibold text-slate-900">{sub.storage_used_label}</span>
                                {" "}of{" "}
                                <span className="font-semibold text-slate-900">{sub.storage_limit_label}</span>
                                {sub.plan_name !== "studio" && (
                                    <span className="text-slate-400 ml-1">({storagePercent.toFixed(1)}%)</span>
                                )}
                            </p>
                        </div>
                        {sub.plan_name !== "studio" ? (
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${storageColor} rounded-full transition-all duration-500`}
                                    style={{ width: `${Math.min(storagePercent, 100)}%` }}
                                />
                            </div>
                        ) : (
                            <div className="h-3 bg-gradient-to-r from-blue-400 to-violet-500 rounded-full opacity-60" />
                        )}
                        {storagePercent >= 80 && sub.plan_name !== "studio" && (
                            <p className="text-xs text-amber-600 mt-1.5 font-medium">
                                ⚠️ Running low on storage. Consider upgrading your plan.
                            </p>
                        )}
                        {storagePercent >= 100 && (
                            <p className="text-xs text-red-600 mt-1.5 font-medium">
                                🚫 Storage full. Uploads are blocked. Upgrade now.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Billing cycle selector */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900">Available plans</h2>
                <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                    {(["monthly", "quarterly", "yearly"] as Cycle[]).map((c) => (
                        <button
                            key={c}
                            onClick={() => setCycle(c)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${cycle === c
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            {cycleLabels[c]}
                            {cycleDiscount[c] && (
                                <span className="ml-1 text-green-600">{cycleDiscount[c]}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Plan cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {plans.map((plan) => {
                    const isCurrentPlan = sub?.plan_name === plan.key;
                    const price = plan[`price_${cycle}` as keyof Plan] as number;
                    const isMostPopular = plan.key === "pro";

                    return (
                        <div
                            key={plan.key}
                            className={`bg-white border-2 rounded-2xl p-5 flex flex-col shadow-sm transition ${isMostPopular ? "border-violet-400" : planColors[plan.key] || "border-slate-200"
                                } ${isCurrentPlan ? "ring-2 ring-blue-500 ring-offset-2" : ""}`}
                        >
                            {isMostPopular && (
                                <div className="text-center mb-3">
                                    <span className="bg-violet-100 text-violet-700 text-xs font-bold px-3 py-1 rounded-full border border-violet-200">
                                        Most popular
                                    </span>
                                </div>
                            )}

                            {isCurrentPlan && (
                                <div className="text-center mb-3">
                                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-200">
                                        Current plan
                                    </span>
                                </div>
                            )}

                            <h3 className="text-base font-bold text-slate-900">{plan.name}</h3>
                            <p className="text-sm text-slate-500 mb-3">{plan.storage_label} storage</p>

                            {price === 0 ? (
                                <p className="text-2xl font-bold text-slate-900 mb-4">Free</p>
                            ) : (
                                <div className="mb-4">
                                    <span className="text-2xl font-bold text-slate-900">{fmt(price)}</span>
                                    <span className="text-sm text-slate-500 ml-1">/ {cycle}</span>
                                </div>
                            )}

                            <ul className="space-y-2 mb-5 flex-1">
                                {plan.features.map((f) => (
                                    <li key={f} className="flex items-start gap-2 text-xs text-slate-600">
                                        <span className="text-green-500 flex-shrink-0 mt-0.5">✓</span>
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            {plan.key === "free" ? (
                                <div className="text-center text-xs text-slate-400 py-2">
                                    {isCurrentPlan ? "Your current plan" : "No payment required"}
                                </div>
                            ) : isCurrentPlan ? (
                                <div className="text-center text-xs text-green-600 font-medium py-2">
                                    ✓ Active
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <button
                                        onClick={() => handleSubscribe(plan.key, "subscription")}
                                        disabled={!!subscribing}
                                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold py-2.5 rounded-xl transition"
                                    >
                                        {subscribing === `${plan.key}-subscription`
                                            ? "Setting up..."
                                            : "Subscribe (auto-renew)"}
                                    </button>
                                    <button
                                        onClick={() => handleSubscribe(plan.key, "payment_link")}
                                        disabled={!!subscribing}
                                        className="w-full border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold py-2.5 rounded-xl transition"
                                    >
                                        {subscribing === `${plan.key}-payment_link`
                                            ? "Setting up..."
                                            : "Pay once (manual renew)"}
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* FAQ */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-4">Frequently asked questions</h3>
                <div className="space-y-4">
                    {[
                        {
                            q: "What happens when my storage is full?",
                            a: "New photo uploads will be blocked and you'll receive an email notification. Existing photos remain accessible to guests.",
                        },
                        {
                            q: "Can I upgrade or downgrade anytime?",
                            a: "Yes. Upgrades take effect immediately. Downgrades apply at end of current billing period.",
                        },
                        {
                            q: "What happens when my subscription expires?",
                            a: "Your account reverts to the Free plan (2GB). Photos exceeding the free limit won't be deleted but you can't upload new ones.",
                        },
                        {
                            q: "Is Studio plan really unlimited?",
                            a: "Yes — Studio plan has no storage cap. Cloudinary's CDN handles delivery regardless of album size.",
                        },
                    ].map((faq) => (
                        <div key={faq.q} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                            <p className="text-sm font-semibold text-slate-900 mb-1">{faq.q}</p>
                            <p className="text-sm text-slate-500">{faq.a}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}