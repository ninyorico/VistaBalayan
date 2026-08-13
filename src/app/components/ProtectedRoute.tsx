import { Navigate, useLocation } from "react-router";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { roleHomePath } from "../../lib/governance";

export function ProtectedRoute({ children, allowedRoles }: { children: JSX.Element; allowedRoles?: string[] }) {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-[#1CA7C9]" />
          <p className="mt-4 text-sm font-medium text-slate-600">Checking your access...</p>
        </div>
      </div>
    );
  }

  if (!profile) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-slate-950">Access restricted</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Your account role is <span className="font-semibold capitalize">{profile.role.replace(/_/g, " ")}</span>. This area is limited to authorized users only.
          </p>
          <Navigate to={roleHomePath(profile.role)} replace />
        </div>
      </div>
    );
  }

  return children;
}
