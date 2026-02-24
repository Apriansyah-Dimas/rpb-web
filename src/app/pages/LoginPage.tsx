import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Calculator, Eye, EyeOff, AlertCircle } from "lucide-react";
import { login, getSession } from "../lib/storage";
import { useAppStore } from "../store/useAppStore";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setCurrentUser } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    const session = getSession();
    if (session) {
      setCurrentUser(session);
      navigate("/dashboard");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const user = login(email.trim(), password);
    setLoading(false);
    if (user) {
      setCurrentUser(user);
      navigate("/dashboard");
    } else {
      setError("Email atau password salah. Coba lagi.");
    }
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "linear-gradient(135deg, #4a4d9e 0%, #6365b9 50%, #7c7fc9 100%)" }}
    >
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div
          className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-20"
          style={{ backgroundColor: "#ffde55" }}
        />
        <div
          className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-10"
          style={{ backgroundColor: "#fff" }}
        />

        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#ffde55" }}
            >
              <Calculator size={20} color="#6365b9" strokeWidth={2.5} />
            </div>
            <span className="text-white text-lg" style={{ fontWeight: 800 }}>
              RPB Estimator
            </span>
          </div>
        </div>

        <div className="relative">
          <h2
            className="text-white mb-4"
            style={{ fontSize: "2.5rem", fontWeight: 800, lineHeight: 1.15 }}
          >
            Estimasi cepat,<br />
            <span style={{ color: "#ffde55" }}>kuotasi akurat.</span>
          </h2>
          <p className="text-indigo-200" style={{ lineHeight: 1.8, fontSize: "1rem" }}>
            Hitung biaya Profile & Konstruksi secara otomatis,
            buat penawaran profesional, dan simpan riwayat proyek —
            semua dalam satu platform.
          </p>

          <div className="flex flex-wrap gap-3 mt-8">
            {["Auto Kalkulasi", "Quotation Builder", "Export PDF", "Admin Panel"].map((f) => (
              <span
                key={f}
                className="px-3 py-1.5 rounded-full text-sm"
                style={{
                  backgroundColor: "rgba(255,255,255,0.15)",
                  color: "#e0e7ff",
                  fontWeight: 500,
                  backdropFilter: "blur(8px)",
                }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        <div className="relative text-indigo-300 text-sm">
          © 2026 RPB Estimator · All rights reserved
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#ffde55" }}
            >
              <Calculator size={18} color="#6365b9" strokeWidth={2.5} />
            </div>
            <span className="text-white text-lg" style={{ fontWeight: 800 }}>
              RPB Estimator
            </span>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="mb-8">
              <h1
                className="text-gray-900 mb-1"
                style={{ fontSize: "1.6rem", fontWeight: 800 }}
              >
                Selamat datang!
              </h1>
              <p className="text-gray-500">Masuk ke akun Anda untuk mulai bekerja.</p>
            </div>

            {/* Demo credentials hint */}
            <div
              className="mb-6 rounded-xl px-4 py-3 text-sm"
              style={{ backgroundColor: "#f4f4fb", border: "1px dashed #c7d2fe" }}
            >
              <p className="text-indigo-700 mb-1" style={{ fontWeight: 600 }}>
                Demo Credentials:
              </p>
              <p className="text-indigo-600">Admin: admin@rpb.com / admin123</p>
              <p className="text-indigo-500">User: sales@rpb.com / sales123</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 600 }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@perusahaan.com"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 600 }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl text-sm">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-sm transition-all disabled:opacity-60"
                style={{
                  backgroundColor: "#6365b9",
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Memproses...
                  </span>
                ) : (
                  "Masuk"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
