"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { invoiceService, StudioProfile } from "@/lib/invoice";

export default function StudioProfilePage() {
    const router = useRouter();
    const [profile, setProfile] = useState<StudioProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const [studioName, setStudioName] = useState("");
    const [studioAddress, setStudioAddress] = useState("");
    const [studioPhone, setStudioPhone] = useState("");
    const [studioGstin, setStudioGstin] = useState("");
    const [studioUpiId, setStudioUpiId] = useState("");

    useEffect(() => {
        invoiceService.getProfile().then((p) => {
            setProfile(p);
            setStudioName(p.studio_name || "");
            setStudioAddress(p.studio_address || "");
            setStudioPhone(p.studio_phone || "");
            setStudioGstin(p.studio_gstin || "");
            setStudioUpiId(p.studio_upi_id || "");
            setLoading(false);
        });
    }, []);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        await invoiceService.updateProfile({
            studio_name: studioName,
            studio_address: studioAddress,
            studio_phone: studioPhone,
            studio_gstin: studioGstin,
            studio_upi_id: studioUpiId,
        });
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        router.push("/billing"); // Redirect back to billing page after saving
    }

    const inputClass = "w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-slate-50 focus:bg-white";

    return (
        <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-6">
                <Link href="/billing" className="text-slate-400 hover:text-slate-700 text-sm transition">
                    ← Billing
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-sm text-slate-600 font-medium">Studio profile</span>
            </div>

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Studio profile</h1>
                <p className="text-slate-500 text-sm mt-1">
                    This information appears on all your invoices and PDFs.
                </p>
            </div>

            {loading ? (
                <div className="text-slate-400 text-sm">Loading...</div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
                    {saved && (
                        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-5 flex items-center gap-2">
                            ✅ Profile saved successfully!
                        </div>
                    )}

                    <form onSubmit={handleSave} className="space-y-5">
                        {/* Account info (read-only) */}
                        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Account name</label>
                                <p className="text-sm font-medium text-slate-900">{profile?.name}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Account email</label>
                                <p className="text-sm font-medium text-slate-900">{profile?.email}</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Studio / Business name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={studioName}
                                onChange={(e) => setStudioName(e.target.value)}
                                className={inputClass}
                                placeholder="e.g. Havan Photography Studio"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
                            <textarea
                                value={studioAddress}
                                onChange={(e) => setStudioAddress(e.target.value)}
                                rows={3}
                                className={`${inputClass} resize-none`}
                                placeholder="Studio address, City, State, PIN"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone number</label>
                                <input
                                    type="tel"
                                    value={studioPhone}
                                    onChange={(e) => setStudioPhone(e.target.value)}
                                    className={inputClass}
                                    placeholder="+91 98765 43210"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">GSTIN</label>
                                <input
                                    type="text"
                                    value={studioGstin}
                                    onChange={(e) => setStudioGstin(e.target.value)}
                                    className={inputClass}
                                    placeholder="22AAAAA0000A1Z5"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                UPI ID <span className="text-xs text-slate-400 font-normal ml-1">— for QR code on invoice</span>
                            </label>
                            <input
                                type="text"
                                value={studioUpiId}
                                onChange={(e) => setStudioUpiId(e.target.value)}
                                className={inputClass}
                                placeholder="yourname@upi or phone@paytm"
                            />
                            {studioUpiId && (
                                <p className="text-xs text-green-600 mt-1.5">
                                    ✓ UPI QR code will appear on all invoices
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition"
                        >
                            {saving ? "Saving..." : "Save profile"}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}