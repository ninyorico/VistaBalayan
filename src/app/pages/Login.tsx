import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (email.includes("officer")) {
        window.location.href = "/officer";
      } else {
        window.location.href = "/staff";
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your details and try again.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-[#f4f7f8] text-slate-950">
      <div className="grid min-h-[100dvh] grid-cols-1 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden bg-slate-950 lg:block">
          <img
            src="https://picsum.photos/seed/balayan-heritage-coast/1400/1600"
            alt="Coastal heritage scenery representing Balayan tourism"
            className="absolute inset-0 h-full w-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-900/40 to-cyan-950/70" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent" />

          <div className="relative z-10 flex min-h-[100dvh] flex-col justify-between p-10 xl:p-14">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/18 bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl">
                <ShieldCheck className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight text-white">VistaBalayan</p>
                <p className="text-sm text-white/75">Tourism office portal</p>
              </div>
            </div>

            <div className="max-w-xl pb-4">
              <p className="mb-4 w-fit rounded-full border border-white/20 bg-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-xl">
                Secure access
              </p>
              <h1 className="text-5xl font-semibold leading-[0.96] tracking-[-0.045em] text-white xl:text-6xl">
                Manage Balayan tourism with confidence.
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-white/85">
                Sign in to review visitors, listings, accommodations, reports, and municipal insights in one protected workspace.
              </p>
            </div>
          </div>
        </section>

        <section className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-5 py-8 sm:px-8 lg:px-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(28,167,201,0.14),transparent_32%),radial-gradient(circle_at_82%_80%,rgba(15,76,117,0.12),transparent_30%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-600/35 to-transparent" />

          <div className="relative z-10 w-full max-w-[440px]">
            <div className="mb-8 lg:hidden">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F4C75] text-white shadow-lg shadow-cyan-900/12">
                <ShieldCheck className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <p className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">VistaBalayan</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Tourism analytics and establishment management.</p>
            </div>

            <div className="rounded-[2rem] border border-white/80 bg-white/86 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-8">
              <div className="mb-8">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-[#0F4C75] ring-1 ring-cyan-900/10">
                  <LockKeyhole className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <h2 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">Welcome back</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Use your authorized officer or establishment staff account.
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-slate-800">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-11 py-3.5 text-base text-slate-950 outline-none transition duration-200 placeholder:text-slate-400 focus:border-[#1293B8] focus:ring-4 focus:ring-cyan-100"
                      placeholder="officer@balayan.gov.ph"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-800">
                    Password
                  </label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-11 py-3.5 pr-12 text-base text-slate-950 outline-none transition duration-200 placeholder:text-slate-400 focus:border-[#1293B8] focus:ring-4 focus:ring-cyan-100"
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition duration-200 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-cyan-100"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" strokeWidth={1.8} /> : <Eye className="h-5 w-5" strokeWidth={1.8} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-1">
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-[#0F4C75] focus:ring-[#1293B8]"
                    />
                    Remember me
                  </label>
                  <a href="#" className="text-sm font-medium text-[#0F4C75] transition duration-200 hover:text-[#1293B8]">
                    Forgot password?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-3 w-full rounded-2xl bg-[#0F4C75] px-5 py-4 text-base font-semibold text-white shadow-[0_18px_36px_rgba(15,76,117,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#0B3C5D] focus:outline-none focus:ring-4 focus:ring-cyan-100 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>
            </div>

            <p className="mt-6 text-center text-xs leading-5 text-slate-500">
              Access is limited to authorized VistaBalayan municipal and establishment accounts.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
