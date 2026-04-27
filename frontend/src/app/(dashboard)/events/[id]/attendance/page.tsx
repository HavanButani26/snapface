"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { attendanceService, Attendee, AttendanceReport } from "@/lib/attendance";
import { eventService } from "@/lib/events";
import { useModal } from "@/lib/modal";
import type { Event } from "@/types";

export default function AttendancePage() {
    const { id } = useParams<{ id: string }>();
    const { confirm, toast } = useModal();

    const [event, setEvent] = useState<Event | null>(null);
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [report, setReport] = useState<AttendanceReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [activeTab, setActiveTab] = useState<"attendees" | "report">("attendees");

    // Add form
    const [showAddForm, setShowAddForm] = useState(false);
    const [adding, setAdding] = useState(false);
    const [formName, setFormName] = useState("");
    const [formEmail, setFormEmail] = useState("");
    const [formDept, setFormDept] = useState("");
    const [formEmpId, setFormEmpId] = useState("");
    const [formPhoto, setFormPhoto] = useState<File | null>(null);
    const [formPhotoPreview, setFormPhotoPreview] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        Promise.all([
            eventService.get(id),
            attendanceService.listAttendees(id),
            attendanceService.getReport(id).catch(() => null),
        ]).then(([ev, atts, rep]) => {
            setEvent(ev);
            setAttendees(atts);
            setReport(rep);
            setLoading(false);
        });
    }, [id]);

    async function handleAddAttendee(e: React.FormEvent) {
        e.preventDefault();
        if (!formName) return;
        setAdding(true);
        try {
            const att = await attendanceService.addAttendee(id, {
                name: formName,
                email: formEmail || undefined,
                department: formDept || undefined,
                employee_id: formEmpId || undefined,
                photo: formPhoto || undefined,
            });
            setAttendees((prev) => [...prev, att]);
            setFormName(""); setFormEmail(""); setFormDept("");
            setFormEmpId(""); setFormPhoto(null); setFormPhotoPreview(null);
            setShowAddForm(false);
            toast(`${att.name} added${att.has_encoding ? " with face data ✓" : " (no face detected)"}`, "success");
        } catch (err: any) {
            toast(err.response?.data?.detail || "Failed to add attendee", "error");
        } finally {
            setAdding(false);
        }
    }

    async function handleDelete(att: Attendee) {
        const ok = await confirm({
            title: `Remove ${att.name}?`,
            message: "This attendee will be removed from the event.",
            confirmLabel: "Remove",
            variant: "danger",
        });
        if (!ok) return;
        await attendanceService.deleteAttendee(id, att.id);
        setAttendees((prev) => prev.filter((a) => a.id !== att.id));
        toast("Attendee removed", "success");
    }

    async function handleScan() {
        setScanning(true);
        try {
            const res = await attendanceService.scan(id);
            toast(res.message, "info");

            // Poll for results
            let attempts = 0;
            const poll = setInterval(async () => {
                attempts++;
                try {
                    const [atts, rep] = await Promise.all([
                        attendanceService.listAttendees(id),
                        attendanceService.getReport(id),
                    ]);
                    const hasResults = atts.some((a) => a.is_present || a.matched_photo_count > 0);
                    if (hasResults || attempts > 15) {
                        setAttendees(atts);
                        setReport(rep);
                        setScanning(false);
                        clearInterval(poll);
                        const presentCount = atts.filter((a) => a.is_present).length;
                        toast(`Scan complete! ${presentCount} of ${atts.length} attendees marked present.`, "success");
                        setActiveTab("report");
                    }
                } catch {
                    if (attempts > 20) {
                        clearInterval(poll);
                        setScanning(false);
                    }
                }
            }, 3000);

        } catch (err: any) {
            toast(err.response?.data?.detail || "Scan failed", "error");
            setScanning(false);
        }
    }

    const inputClass = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition";

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-6">
                <Link href={`/events/${id}`} className="text-slate-400 hover:text-slate-700 text-sm transition">
                    ← Back to event
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-sm text-slate-600 font-medium">Attendance</span>
            </div>

            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">👥 Attendance tracker</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        AI marks attendance based on who appears in event photos
                    </p>
                </div>
                <div className="flex gap-2">
                    {attendees.length > 0 && (
                        <>
                            <button
                                onClick={() => event && attendanceService.downloadCsv(id, event.name)}
                                className="text-xs border border-slate-200 hover:border-slate-300 text-slate-600 px-3 py-2 rounded-xl transition font-medium"
                            >
                                📥 CSV
                            </button>
                            <button
                                onClick={handleScan}
                                disabled={scanning}
                                className="text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-xl transition font-semibold"
                            >
                                {scanning ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Scanning...
                                    </span>
                                ) : "🤖 Run AI scan"}
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="text-xs sm:text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl transition font-semibold"
                    >
                        + Add attendee
                    </button>
                </div>
            </div>

            {/* Scanning indicator */}
            {scanning && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    <p className="text-sm text-blue-700">
                        AI is comparing {attendees.length} attendee faces against all event photos...
                    </p>
                </div>
            )}

            {/* Add attendee form */}
            {showAddForm && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-slate-900">Add attendee</h2>
                        <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
                    </div>
                    <form onSubmit={handleAddAttendee} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-slate-600 mb-1 block">Full name *</label>
                                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} required className={inputClass} placeholder="Raj Sharma" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-600 mb-1 block">Email</label>
                                <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className={inputClass} placeholder="raj@company.com" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-600 mb-1 block">Department</label>
                                <input type="text" value={formDept} onChange={(e) => setFormDept(e.target.value)} className={inputClass} placeholder="Engineering" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-600 mb-1 block">Employee ID</label>
                                <input type="text" value={formEmpId} onChange={(e) => setFormEmpId(e.target.value)} className={inputClass} placeholder="EMP001" />
                            </div>
                        </div>

                        {/* Reference photo */}
                        <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">
                                Reference photo <span className="text-slate-400 font-normal">(required for AI detection)</span>
                            </label>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    setFormPhoto(f);
                                    setFormPhotoPreview(URL.createObjectURL(f));
                                }}
                            />
                            <div
                                onClick={() => fileRef.current?.click()}
                                className="border-2 border-dashed border-slate-200 hover:border-blue-300 rounded-xl p-4 text-center cursor-pointer transition"
                            >
                                {formPhotoPreview ? (
                                    <img src={formPhotoPreview} alt="" className="w-20 h-20 object-cover rounded-xl mx-auto" />
                                ) : (
                                    <div>
                                        <div className="text-2xl mb-1">🤳</div>
                                        <p className="text-xs text-slate-500">Click to upload a clear face photo</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button type="submit" disabled={adding} className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition">
                                {adding ? "Adding..." : "Add attendee"}
                            </button>
                            <button type="button" onClick={() => setShowAddForm(false)} className="px-5 border border-slate-200 text-slate-600 rounded-xl text-sm transition">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Tabs */}
            {attendees.length > 0 && (
                <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
                    {(["attendees", "report"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            {tab === "attendees" ? `👥 Attendees (${attendees.length})` : "📊 Report"}
                        </button>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {attendees.length === 0 && !showAddForm && (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 shadow-sm text-center">
                    <div className="text-5xl mb-4">👥</div>
                    <p className="text-slate-600 font-medium mb-2">No attendees yet</p>
                    <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
                        Add attendees with their reference photos. AI will scan event photos to mark who was present.
                    </p>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left max-w-sm mx-auto mb-5 space-y-2 text-xs text-slate-500">
                        <p className="font-semibold text-slate-700 mb-2">How it works:</p>
                        <p>1. Add each attendee with a clear reference photo</p>
                        <p>2. Upload event photos as usual</p>
                        <p>3. Click "Run AI scan"</p>
                        <p>4. AI marks who appears in the photos</p>
                        <p>5. Download attendance report as CSV</p>
                    </div>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition"
                    >
                        + Add first attendee
                    </button>
                </div>
            )}

            {/* Attendees tab */}
            {activeTab === "attendees" && attendees.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                        <div className="flex gap-4 text-xs text-slate-500">
                            <span>✅ Present: <b className="text-green-600">{attendees.filter(a => a.is_present).length}</b></span>
                            <span>❌ Absent: <b className="text-red-500">{attendees.filter(a => !a.is_present).length}</b></span>
                            <span>📷 With photo: <b className="text-blue-600">{attendees.filter(a => a.has_encoding).length}</b></span>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-50">
                        {attendees.map((att) => (
                            <div key={att.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition">
                                {/* Avatar / reference photo */}
                                <div className="flex-shrink-0">
                                    {att.reference_photo_url ? (
                                        <img
                                            src={att.reference_photo_url}
                                            alt={att.name}
                                            className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-lg font-bold border border-slate-200">
                                            {att.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-semibold text-slate-900">{att.name}</p>
                                        {att.employee_id && (
                                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                                {att.employee_id}
                                            </span>
                                        )}
                                        {!att.has_encoding && (
                                            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                                ⚠️ No face data
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                        {att.department && (
                                            <span className="text-xs text-slate-400">{att.department}</span>
                                        )}
                                        {att.email && (
                                            <span className="text-xs text-slate-400">{att.email}</span>
                                        )}
                                        {att.matched_photo_count > 0 && (
                                            <span className="text-xs text-blue-600">
                                                Found in {att.matched_photo_count} photo{att.matched_photo_count !== 1 ? "s" : ""}
                                            </span>
                                        )}
                                        {att.confidence && (
                                            <span className="text-xs text-slate-400">
                                                {Math.round(att.confidence * 100)}% confidence
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${att.is_present
                                            ? "bg-green-50 text-green-700 border-green-200"
                                            : "bg-slate-100 text-slate-500 border-slate-200"
                                        }`}>
                                        {att.is_present ? "✅ Present" : "—  Absent"}
                                    </span>
                                    <button
                                        onClick={() => handleDelete(att)}
                                        className="text-slate-300 hover:text-red-400 transition text-lg"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Report tab */}
            {activeTab === "report" && report && (
                <div className="space-y-5">
                    {/* Summary stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: "Total", value: report.total_attendees, color: "bg-slate-50 text-slate-700", icon: "👥" },
                            { label: "Present", value: report.present_count, color: "bg-green-50 text-green-700", icon: "✅" },
                            { label: "Absent", value: report.absent_count, color: "bg-red-50 text-red-700", icon: "❌" },
                            { label: "Attendance %", value: `${report.attendance_rate}%`, color: "bg-blue-50 text-blue-700", icon: "📊" },
                        ].map((s) => (
                            <div key={s.label} className={`${s.color} border border-white rounded-2xl p-4 flex items-center gap-3`}>
                                <div className="w-10 h-10 bg-white/60 rounded-xl flex items-center justify-center text-xl">
                                    {s.icon}
                                </div>
                                <div>
                                    <p className="text-xl font-bold">{s.value}</p>
                                    <p className="text-xs opacity-70">{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Attendance rate bar */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-slate-900">Overall attendance</p>
                            <p className="text-sm font-bold text-blue-600">{report.attendance_rate}%</p>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-4">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ${report.attendance_rate >= 80 ? "bg-green-500" :
                                        report.attendance_rate >= 60 ? "bg-blue-500" :
                                            report.attendance_rate >= 40 ? "bg-amber-500" : "bg-red-500"
                                    }`}
                                style={{ width: `${report.attendance_rate}%` }}
                            />
                        </div>

                        {/* Department breakdown */}
                        {report.department_breakdown.length > 1 && (
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                                    By department
                                </p>
                                <div className="space-y-3">
                                    {report.department_breakdown.map((dept) => (
                                        <div key={dept.department}>
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className="font-medium text-slate-700">{dept.department}</span>
                                                <span className="text-slate-500">
                                                    {dept.present}/{dept.total} · {dept.attendance_rate}%
                                                </span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full"
                                                    style={{ width: `${dept.attendance_rate}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Present list */}
                    {report.present.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                <span className="text-green-500">✅</span> Present ({report.present.length})
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {report.present.map((att) => (
                                    <div key={att.id} className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-3 py-2.5">
                                        {att.reference_photo_url ? (
                                            <img src={att.reference_photo_url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-lg bg-green-200 flex items-center justify-center text-green-800 text-xs font-bold flex-shrink-0">
                                                {att.name.charAt(0)}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate">{att.name}</p>
                                            <p className="text-xs text-slate-500 truncate">
                                                {att.department || att.email || att.employee_id || ""}
                                            </p>
                                        </div>
                                        {att.confidence && (
                                            <span className="text-xs text-green-600 ml-auto flex-shrink-0">
                                                {Math.round(att.confidence * 100)}%
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Absent list */}
                    {report.absent.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                <span className="text-red-400">❌</span> Absent ({report.absent.length})
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {report.absent.map((att) => (
                                    <div key={att.id} className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                                        {att.reference_photo_url ? (
                                            <img src={att.reference_photo_url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-400 text-xs font-bold flex-shrink-0">
                                                {att.name.charAt(0)}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate">{att.name}</p>
                                            <p className="text-xs text-slate-500 truncate">
                                                {att.department || att.email || att.employee_id || ""}
                                            </p>
                                        </div>
                                        {!att.has_encoding && (
                                            <span className="text-xs text-amber-500 ml-auto flex-shrink-0">No photo</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}