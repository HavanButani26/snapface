"use client";
import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { photoService } from "@/lib/photos";
import Link from "next/link";

export default function UploadPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<{
        uploaded: number;
        errors: any[];
    } | null>(null);

    const onDrop = useCallback((accepted: File[]) => {
        setFiles((prev) => {
            const existing = new Set(prev.map((f) => f.name));
            const newFiles = accepted.filter((f) => !existing.has(f.name));
            return [...prev, ...newFiles];
        });
        setResult(null);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
        multiple: true,
    });

    function removeFile(name: string) {
        setFiles((prev) => prev.filter((f) => f.name !== name));
    }

    async function handleUpload() {
        if (!files.length) return;
        setUploading(true);
        setProgress(0);
        try {
            const res = await photoService.upload(id, files, setProgress);
            setResult({ uploaded: res.uploaded, errors: res.errors });
            setFiles([]);
        } catch (err) {
            console.error(err);
        } finally {
            setUploading(false);
        }
    }

    const totalSize = files.reduce((s, f) => s + f.size, 0);
    const formatSize = (b: number) =>
        b > 1024 * 1024
            ? `${(b / 1024 / 1024).toFixed(1)} MB`
            : `${(b / 1024).toFixed(0)} KB`;

    return (
        <div className="max-w-3xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-6">
                <Link href={`/events/${id}`} className="text-slate-400 hover:text-slate-700 text-sm transition">
                    ← Back to event
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-sm text-slate-600 font-medium">Upload photos</span>
            </div>

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Upload photos</h1>
                <p className="text-slate-500 text-sm mt-1">
                    Photos are processed by AI in the background — face encodings and emotions are detected automatically.
                </p>
            </div>

            {/* Success / Error result */}
            {result && (
                <div className={`mb-6 p-4 rounded-xl border text-sm ${result.errors.length === 0
                        ? "bg-green-50 border-green-200 text-green-700"
                        : "bg-amber-50 border-amber-200 text-amber-700"
                    }`}>
                    <p className="font-medium mb-1">
                        {result.uploaded} photo{result.uploaded !== 1 ? "s" : ""} uploaded successfully
                    </p>
                    {result.errors.length > 0 && (
                        <ul className="mt-2 space-y-1">
                            {result.errors.map((e, i) => (
                                <li key={i} className="text-xs">
                                    {e.file}: {e.error}
                                </li>
                            ))}
                        </ul>
                    )}
                    <button
                        onClick={() => router.push(`/events/${id}/photos`)}
                        className="mt-3 text-xs underline"
                    >
                        View uploaded photos →
                    </button>
                </div>
            )}

            {/* Dropzone */}
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition mb-4 ${isDragActive
                        ? "border-blue-400 bg-blue-50"
                        : "border-slate-200 hover:border-blue-300 hover:bg-slate-50 bg-white"
                    }`}
            >
                <input {...getInputProps()} />
                <div className="text-4xl mb-3">📸</div>
                <p className="text-slate-700 font-medium mb-1">
                    {isDragActive ? "Drop photos here..." : "Drag & drop photos here"}
                </p>
                <p className="text-slate-400 text-sm">or click to browse · JPG, PNG, WebP · Max 20MB each</p>
            </div>

            {/* File list */}
            {files.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-4 shadow-sm">
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">
                            {files.length} file{files.length !== 1 ? "s" : ""} selected · {formatSize(totalSize)}
                        </span>
                        <button
                            onClick={() => setFiles([])}
                            className="text-xs text-slate-400 hover:text-red-500 transition"
                        >
                            Clear all
                        </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                        {files.map((file) => (
                            <div key={file.name} className="px-5 py-2.5 flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-xs text-blue-600 font-bold flex-shrink-0">
                                        {file.name.split(".").pop()?.toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm text-slate-700 truncate">{file.name}</p>
                                        <p className="text-xs text-slate-400">{formatSize(file.size)}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFile(file.name)}
                                    className="text-slate-300 hover:text-red-400 transition text-lg ml-4 flex-shrink-0"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Progress bar */}
            {uploading && (
                <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                        <span>Uploading to Cloudinary...</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        AI face encoding and emotion detection will run in the background after upload.
                    </p>
                </div>
            )}

            {/* Upload button */}
            <button
                onClick={handleUpload}
                disabled={!files.length || uploading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl text-sm transition"
            >
                {uploading
                    ? `Uploading ${files.length} photo${files.length !== 1 ? "s" : ""}...`
                    : `Upload ${files.length} photo${files.length !== 1 ? "s" : ""}`}
            </button>
        </div>
    );
}