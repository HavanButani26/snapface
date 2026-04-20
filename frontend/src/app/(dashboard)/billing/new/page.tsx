"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { invoiceService, InvoiceItem } from "@/lib/invoice";

export default function NewInvoicePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Client
    const [clientName, setClientName] = useState("");
    const [clientEmail, setClientEmail] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [clientAddress, setClientAddress] = useState("");

    // Event
    const [eventName, setEventName] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [dueDate, setDueDate] = useState("");

    // Items
    const [items, setItems] = useState<InvoiceItem[]>([
        { description: "Photography service", quantity: 1, rate: 0, amount: 0 },
    ]);

    // Charges
    const [taxPercent, setTaxPercent] = useState(18);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [notes, setNotes] = useState("");

    function updateItem(idx: number, field: keyof InvoiceItem, value: string | number) {
        setItems((prev) => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], [field]: value };
            if (field === "quantity" || field === "rate") {
                updated[idx].amount = Number(updated[idx].quantity) * Number(updated[idx].rate);
            }
            return updated;
        });
    }

    function addItem() {
        setItems((prev) => [...prev, { description: "", quantity: 1, rate: 0, amount: 0 }]);
    }

    function removeItem(idx: number) {
        setItems((prev) => prev.filter((_, i) => i !== idx));
    }

    const subtotal = items.reduce((s, i) => s + i.amount, 0);
    const taxable = subtotal - discountAmount;
    const taxAmount = taxable * taxPercent / 100;
    const total = taxable + taxAmount;

    function fmt(n: number) {
        return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (items.some((i) => !i.description || i.amount <= 0)) {
            setError("All items must have a description and amount greater than 0.");
            return;
        }
        setError("");
        setLoading(true);
        try {
            const invoice = await invoiceService.create({
                client_name: clientName,
                client_email: clientEmail || undefined,
                client_phone: clientPhone || undefined,
                client_address: clientAddress || undefined,
                event_name: eventName || undefined,
                event_date: eventDate ? `${eventDate}T00:00:00` : undefined,
                due_date: dueDate ? `${dueDate}T00:00:00` : undefined,
                items,
                tax_percent: taxPercent,
                discount_amount: discountAmount,
                notes: notes || undefined,
            });
            router.push(`/billing`);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to create invoice");
        } finally {
            setLoading(false);
        }
    }

    const inputClass = "w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-slate-50 focus:bg-white";
    const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

    return (
        <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-6">
                <Link href="/billing" className="text-slate-400 hover:text-slate-700 text-sm transition">
                    ← Billing
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-sm text-slate-600 font-medium">New invoice</span>
            </div>

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Create invoice</h1>
                <p className="text-slate-500 text-sm mt-1">Fill in the details. A Razorpay payment link will be auto-generated.</p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Client details */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-bold">1</span>
                        Client details
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Client name <span className="text-red-500">*</span></label>
                            <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} required className={inputClass} placeholder="Raj & Priya" />
                        </div>
                        <div>
                            <label className={labelClass}>Phone number</label>
                            <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className={inputClass} placeholder="+91 98765 43210" />
                        </div>
                        <div>
                            <label className={labelClass}>Email address</label>
                            <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className={inputClass} placeholder="client@example.com" />
                        </div>
                        <div>
                            <label className={labelClass}>Address</label>
                            <input type="text" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} className={inputClass} placeholder="City, State" />
                        </div>
                    </div>
                </div>

                {/* Event details */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-bold">2</span>
                        Event details
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-1">
                            <label className={labelClass}>Event name</label>
                            <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} className={inputClass} placeholder="Wedding, Corporate..." />
                        </div>
                        <div>
                            <label className={labelClass}>Event date</label>
                            <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Due date</label>
                            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
                        </div>
                    </div>
                </div>

                {/* Line items */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-bold">3</span>
                        Line items
                    </h2>

                    {/* Header */}
                    <div className="hidden sm:grid grid-cols-12 gap-2 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <div className="col-span-5">Description</div>
                        <div className="col-span-2 text-center">Qty</div>
                        <div className="col-span-2 text-right">Rate (₹)</div>
                        <div className="col-span-2 text-right">Amount (₹)</div>
                        <div className="col-span-1" />
                    </div>

                    <div className="space-y-3">
                        {items.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-12 sm:col-span-5">
                                    <input
                                        type="text"
                                        value={item.description}
                                        onChange={(e) => updateItem(idx, "description", e.target.value)}
                                        placeholder="Description"
                                        className={inputClass}
                                    />
                                </div>
                                <div className="col-span-4 sm:col-span-2">
                                    <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                                        min="0"
                                        step="0.5"
                                        className={`${inputClass} text-center`}
                                        placeholder="Qty"
                                    />
                                </div>
                                <div className="col-span-4 sm:col-span-2">
                                    <input
                                        type="number"
                                        value={item.rate}
                                        onChange={(e) => updateItem(idx, "rate", parseFloat(e.target.value) || 0)}
                                        min="0"
                                        className={`${inputClass} text-right`}
                                        placeholder="Rate"
                                    />
                                </div>
                                <div className="col-span-3 sm:col-span-2">
                                    <div className="text-sm font-semibold text-slate-900 text-right py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl">
                                        {fmt(item.amount)}
                                    </div>
                                </div>
                                <div className="col-span-1 flex justify-center">
                                    {items.length > 1 && (
                                        <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 transition text-lg">
                                            ×
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={addItem}
                        className="mt-4 w-full border border-dashed border-slate-300 hover:border-blue-400 text-slate-500 hover:text-blue-600 py-2.5 rounded-xl text-sm transition font-medium"
                    >
                        + Add item
                    </button>
                </div>

                {/* Charges & totals */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-bold">4</span>
                        Charges & totals
                    </h2>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className={labelClass}>GST %</label>
                            <select value={taxPercent} onChange={(e) => setTaxPercent(Number(e.target.value))} className={inputClass}>
                                <option value={0}>0% — No GST</option>
                                <option value={5}>5% GST</option>
                                <option value={12}>12% GST</option>
                                <option value={18}>18% GST</option>
                                <option value={28}>28% GST</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Discount (₹)</label>
                            <input
                                type="number"
                                value={discountAmount}
                                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                                min="0"
                                className={inputClass}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm text-slate-600">
                            <span>Subtotal</span>
                            <span>{fmt(subtotal)}</span>
                        </div>
                        {discountAmount > 0 && (
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>Discount</span>
                                <span className="text-red-500">-{fmt(discountAmount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm text-slate-600">
                            <span>GST ({taxPercent}%)</span>
                            <span>{fmt(taxAmount)}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold text-blue-600 pt-2 border-t border-slate-200">
                            <span>Total</span>
                            <span>{fmt(total)}</span>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <label className={labelClass}>Notes (optional)</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className={`${inputClass} resize-none`}
                        placeholder="Payment terms, bank details, thank you note..."
                    />
                </div>

                {/* Submit */}
                <div className="flex gap-3">
                    <button
                        type="submit"
                        disabled={loading || total <= 0}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition"
                    >
                        {loading ? "Creating invoice..." : `Create invoice — ${fmt(total)}`}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 border border-slate-200 hover:border-slate-300 text-slate-600 rounded-xl text-sm transition"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}