import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b border-slate-200 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <span className="text-xl font-bold text-blue-600">SnapFace</span>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 transition px-3 py-2">
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition font-medium"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-1.5 rounded-full mb-6">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
          AI-powered face recognition
        </div>
        <h1 className="text-5xl font-bold text-slate-900 leading-tight mb-6">
          Share photos with{" "}
          <span className="text-blue-600">AI face recognition</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload once. Guests find all their photos instantly by scanning a QR code
          and uploading a selfie. No sorting. No scrolling.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/register"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-xl transition text-sm"
          >
            Start for free
          </Link>
          <Link
            href="/login"
            className="border border-slate-200 hover:border-slate-300 text-slate-700 font-medium px-6 py-3 rounded-xl transition text-sm"
          >
            Sign in
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 pb-24 grid grid-cols-3 gap-6">
        {[
          {
            title: "AI face recognition",
            desc: "buffalo_l model delivers industry-leading accuracy for matching faces in large albums.",
            icon: "👤",
          },
          {
            title: "Instant QR sharing",
            desc: "Generate a QR code for any event. Guests scan and find their photos in seconds.",
            icon: "📱",
          },
          {
            title: "Emotion gallery",
            desc: "Filter photos by mood — happy, candid, laughing. A feature unique to SnapFace.",
            icon: "😊",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="bg-slate-50 border border-slate-200 rounded-2xl p-6"
          >
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}