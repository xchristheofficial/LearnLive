import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
export default function ProtectedRoute({ children }: any) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center bg-[#f6f7fb]"><div className="text-center"><div className="w-12 h-12 rounded-2xl bg-indigo-600 animate-pulse mx-auto mb-3" /><p className="text-slate-500 text-sm">Loading LearnLive…</p></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
