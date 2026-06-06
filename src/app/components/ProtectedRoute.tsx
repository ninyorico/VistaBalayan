import { Navigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";

export function ProtectedRoute({ children, allowedRoles }: { children: JSX.Element; allowedRoles?: string[] }) {
  const { profile, loading } = useAuth();
  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (!profile) return <Navigate to="/" replace />;
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}