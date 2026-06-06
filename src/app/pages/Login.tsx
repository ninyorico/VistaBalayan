import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
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
    
    console.log("Attempting login with:", email);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        console.error("Supabase login error:", error);
        throw error;
      }
      
      console.log("Login SUCCESS! User:", data.user);
      
      // Force redirect - this is the key line
      if (email.includes("officer")) {
        window.location.href = "/officer";
      } else {
        window.location.href = "/staff";
      }
      
    } catch (err: any) {
      console.error("Caught error:", err);
      setError(err.message || "Login failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0F4C75] via-[#1293B8] to-[#1CA7C9] relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#26B6D4] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#0B3C5D] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-[#1CA7C9] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at center, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 0.1) 50%, transparent 70%)' }}></div>

      <div className="p-8 sm:p-10 lg:p-12 relative z-10">
        <div className="flex items-start gap-1.5">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white drop-shadow-2xl tracking-tight">VistaBalayan</h1>
          <span className="text-sm sm:text-base text-white/90 font-normal mt-1">©</span>
        </div>
        <p className="text-white/95 text-base sm:text-lg lg:text-xl mt-2 font-light tracking-wide">Tourism Analytics Platform</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md relative z-10">
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 sm:p-10 lg:p-12 border border-white/25">
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Welcome Back</h2>
              <p className="text-white/90 text-sm sm:text-base font-light">Sign in to access the tourism analytics platform</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-white text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white/95 mb-2">Email Address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/25 outline-none transition-all duration-200 text-base text-white placeholder:text-white/60"
                  placeholder="officer@balayan.gov"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white/95 mb-2">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/25 outline-none transition-all duration-200 text-base text-white placeholder:text-white/60 pr-12"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center cursor-pointer group">
                  <input type="checkbox" className="w-4 h-4 text-[#1CA7C9] border-white/50 rounded focus:ring-white/60 cursor-pointer bg-white/30" />
                  <span className="ml-2.5 text-sm text-white/95 group-hover:text-white transition-colors">Remember me</span>
                </label>
                <a href="#" className="text-sm font-medium text-white/95 hover:text-white transition-colors">Forgot Password?</a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1CA7C9] hover:bg-[#26B6D4] text-white py-4 rounded-xl font-semibold text-base hover:shadow-2xl hover:shadow-[#1CA7C9]/40 transition-all duration-300 transform hover:-translate-y-0.5 mt-8 disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}