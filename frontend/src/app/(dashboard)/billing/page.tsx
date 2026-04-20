"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { invoiceService, Invoice, Analytics } from "@/lib/invoice";

const statusConfig = {
    pending: { label: "Pending", color: "bg-amber-50 text-amber-700 border-amber-200" },
    paid: { label: "Paid", color: "bg-green-50 text-green-700 border-green-200" },
    overdue: { label: "Overdue", color: "bg-red-50 text-red-700 border-red-200" },
    cancelled: { label: "Cancelled", color: "bg-slate-100 text-slate-500 border-slate-200" },
};

function fmt(amount: number) {
    return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BillingPage() {
    const router = useRouter();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([invoiceService.list(), invoiceService.getAnalytics()]).then(
            ([invs, ana]) => {
                setInvoices(invs);
                setAnalytics(ana);
                setLoading(false);
            }
        );
    }, []);

    async function handleMarkPaid(id: string) {
        if (!confirm("Mark this invoice as paid?")) return;
        setActionLoading(id);
        const updated = await invoiceService.markPaid(id);
        setInvoices((prev) => prev.map((inv) => (inv.id === id ? updated : inv)));
        const ana = await invoiceService.getAnalytics();
        setAnalytics(ana);
        setActionLoading(null);
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this invoice? This cannot be undone.")) return;
        setActionLoading(id);
        await invoiceService.delete(id);
        setInvoices((prev) => prev.filter((inv) => inv.id !== id));
        const ana = await invoiceService.getAnalytics();
        setAnalytics(ana);
        setActionLoading(null);
    }

    async function handleDownloadPdf(id: string, number: string) {
        setActionLoading(`pdf-${id}`);
        await invoiceService.downloadPdf(id, number);
        setActionLoading(null);
    }

    async function handleSendEmail(id: string) {
        setActionLoading(`email-${id}`);
        try {
            await invoiceService.sendEmail(id);
            alert("Invoice emailed successfully!");
        } catch {
            alert("Failed to send email. Check client email address.");
        }
        setActionLoading(null);
    }

    function handleWhatsApp(invoice: Invoice) {
        const msg = encodeURIComponent(
            `Hi ${invoice.client_name},\n\nPlease find your invoice *${invoice.invoice_number}* for *${fmt(invoice.total_amount)}*.\n\n` +
            (invoice.razorpay_payment_link_url ? `Pay here: ${invoice.razorpay_payment_link_url}\n\n` : "") +
            `Thank you!`
        );
        const phone = invoice.client_phone?.replace(/\D/g, "");
        const url = phone
            ? `https://wa.me/91${phone}?text=${msg}`
            : `https://wa.me/?text=${msg}`;
        window.open(url, "_blank");
    }

    const stats = analytics ? [
        { label: "This month billed", value: fmt(analytics.monthly.total_billed), icon: "📊", color: "bg-blue-50 text-blue-700", iconBg: "bg-blue-100" },
        { label: "This month collected", value: fmt(analytics.monthly.collected), icon: "✅", color: "bg-green-50 text-green-700", iconBg: "bg-green-100" },
        { label: "This month pending", value: fmt(analytics.monthly.pending), icon: "⏳", color: "bg-amber-50 text-amber-700", iconBg: "bg-amber-100" },
        { label: "All time collected", value: fmt(analytics.all_time.collected), icon: "💰", color: "bg-violet-50 text-violet-700", iconBg: "bg-violet-100" },
    ] : [];

    return (
        <div>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Billing</h1>
                    <p className="text-slate-500 text-xs sm:text-sm mt-1">Manage invoices, track payments, generate PDFs</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                    <Link
                        href="/billing/profile"
                        className="text-xs sm:text-sm border border-slate-200 hover:border-slate-300 text-slate-600 px-3 py-2 rounded-xl transition font-medium"
                    >
                        ⚙️ Studio
                    </Link>
                    <Link
                        href="/billing/new"
                        className="text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-xl transition font-semibold"
                    >
                        + New invoice
                    </Link>
                </div>
            </div>

            {/* Analytics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {loading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-slate-100 rounded-2xl p-4 h-20 animate-pulse" />
                    ))
                    : stats.map((s) => (
                        <div key={s.label} className={`${s.color} border border-white rounded-2xl p-3 sm:p-4 flex items-center gap-3`}>
                            <div className={`${s.iconBg} w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-lg sm:text-xl flex-shrink-0`}>
                                {s.icon}
                            </div>
                            <div className="min-w-0">
                                <p className="text-base sm:text-lg font-bold leading-tight truncate">{s.value}</p>
                                <p className="text-xs text-slate-500 font-medium mt-0.5 leading-tight">{s.label}</p>
                            </div>
                        </div>
                    ))}
            </div>

            {/* Status summary */}
            {analytics && (
                <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                        { label: "Pending", count: analytics.by_status.pending, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
                        { label: "Paid", count: analytics.by_status.paid, color: "text-green-600", bg: "bg-green-50 border-green-200" },
                        { label: "Overdue", count: analytics.by_status.overdue, color: "text-red-600", bg: "bg-red-50 border-red-200" },
                    ].map((s) => (
                        <div key={s.label} className={`${s.bg} border rounded-xl p-3 text-center`}>
                            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Invoices table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100">
                    <div>
                        <h2 className="text-sm sm:text-base font-semibold text-slate-900">All invoices</h2>
                        <p className="text-xs text-slate-400 mt-0.5">{invoices.length} total</p>
                    </div>
                </div>

                {loading ? (
                    <div className="px-6 py-16 text-center">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">Loading invoices...</p>
                    </div>
                ) : invoices.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <div className="text-5xl mb-4">🧾</div>
                        <p className="text-slate-600 font-medium mb-1">No invoices yet</p>
                        <p className="text-slate-400 text-sm mb-5">Create your first invoice to get started</p>
                        <Link href="/billing/new" className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2.5 rounded-xl transition font-medium inline-block">
                            Create invoice
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        {["Invoice", "Client", "Event", "Amount", "Status", "Date", "Actions"].map((h) => (
                                            <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide py-3 px-4">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {invoices.map((inv) => {
                                        const sc = statusConfig[inv.status] || statusConfig.pending;
                                        return (
                                            <tr key={inv.id} className="hover:bg-slate-50 transition group">
                                                <td className="px-4 py-3">
                                                    <p className="text-sm font-semibold text-blue-600">{inv.invoice_number}</p>
                                                    <p className="text-xs text-slate-400">{new Date(inv.invoice_date).toLocaleDateString("en-IN")}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="text-sm font-medium text-slate-900">{inv.client_name}</p>
                                                    <p className="text-xs text-slate-400">{inv.client_phone || inv.client_email || "—"}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="text-sm text-slate-600">{inv.event_name || "—"}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="text-sm font-bold text-slate-900">{fmt(inv.total_amount)}</p>
                                                    {inv.paid_at && (
                                                        <p className="text-xs text-green-600">Paid {new Date(inv.paid_at).toLocaleDateString("en-IN")}</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${sc.color}`}>
                                                        {sc.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="text-xs text-slate-500">
                                                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-IN") : "—"}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <button
                                                            onClick={() => handleDownloadPdf(inv.id, inv.invoice_number)}
                                                            disabled={actionLoading === `pdf-${inv.id}`}
                                                            className="text-xs border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 px-2 py-1.5 rounded-lg transition"
                                                            title="Download PDF"
                                                        >
                                                            {actionLoading === `pdf-${inv.id}` ? "..." : "📄 PDF"}
                                                        </button>
                                                        {inv.client_email && (
                                                            <button
                                                                onClick={() => handleSendEmail(inv.id)}
                                                                disabled={actionLoading === `email-${inv.id}`}
                                                                className="text-xs border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 px-2 py-1.5 rounded-lg transition"
                                                                title="Send email"
                                                            >
                                                                {actionLoading === `email-${inv.id}` ? "..." : "✉️"}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleWhatsApp(inv)}
                                                            className="text-xs border border-slate-200 hover:border-green-300 text-slate-600 hover:text-green-600 px-2 py-1.5 rounded-lg transition"
                                                            title="Share on WhatsApp"
                                                        >
                                                            📱
                                                        </button>
                                                        {inv.razorpay_payment_link_url && (
                                                            <a
                                                                href={inv.razorpay_payment_link_url}
                                                                target="_blank"
                                                                className="text-xs border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 px-2 py-1.5 rounded-lg transition"
                                                                title="Payment link"
                                                            >
                                                                💳
                                                            </a>
                                                        )}
                                                        {inv.status === "pending" && (
                                                            <button
                                                                onClick={() => handleMarkPaid(inv.id)}
                                                                disabled={actionLoading === inv.id}
                                                                className="text-xs border border-green-200 bg-green-50 hover:bg-green-100 text-green-700 px-2 py-1.5 rounded-lg transition font-medium"
                                                            >
                                                                {actionLoading === inv.id ? "..." : "✓ Paid"}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDelete(inv.id)}
                                                            disabled={actionLoading === inv.id}
                                                            className="text-xs border border-slate-200 hover:border-red-200 text-slate-400 hover:text-red-500 px-2 py-1.5 rounded-lg transition"
                                                        >
                                                            🗑
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="lg:hidden divide-y divide-slate-100">
                            {invoices.map((inv) => {
                                const sc = statusConfig[inv.status] || statusConfig.pending;
                                return (
                                    <div key={inv.id} className="px-4 py-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <p className="text-sm font-bold text-blue-600">{inv.invoice_number}</p>
                                                <p className="text-sm font-medium text-slate-900">{inv.client_name}</p>
                                                {inv.event_name && <p className="text-xs text-slate-400">{inv.event_name}</p>}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-slate-900">{fmt(inv.total_amount)}</p>
                                                <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${sc.color}`}>
                                                    {sc.label}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 flex-wrap mt-3">
                                            <button
                                                onClick={() => handleDownloadPdf(inv.id, inv.invoice_number)}
                                                className="flex-1 text-xs border border-slate-200 text-slate-600 py-2 rounded-lg"
                                            >
                                                📄 PDF
                                            </button>
                                            <button
                                                onClick={() => handleWhatsApp(inv)}
                                                className="flex-1 text-xs border border-green-200 bg-green-50 text-green-700 py-2 rounded-lg"
                                            >
                                                📱 WhatsApp
                                            </button>
                                            {inv.status === "pending" && (
                                                <button
                                                    onClick={() => handleMarkPaid(inv.id)}
                                                    className="flex-1 text-xs border border-blue-200 bg-blue-50 text-blue-700 py-2 rounded-lg font-medium"
                                                >
                                                    ✓ Mark paid
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}