import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';
import PageFade from './components/PageFade';
import Toaster from './components/Toaster';
import { GraduationCap } from 'lucide-react';

// Code-split every route so the first load only ships what the landing
// page needs; everything else streams in on demand as people navigate.
const Landing = lazy(() => import('./pages/Landing'));
const Auth = lazy(() => import('./pages/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Classes = lazy(() => import('./pages/Classes'));
const ClassDetail = lazy(() => import('./pages/ClassDetail'));
const Room = lazy(() => import('./pages/Room'));
const FaceSetup = lazy(() => import('./pages/FaceSetup'));
const FaceCheck = lazy(() => import('./pages/FaceCheck'));
const Profile = lazy(() => import('./pages/Profile'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Achievements = lazy(() => import('./pages/Achievements'));

function RouteLoader() {
  return (
    <div className="min-h-screen grid place-items-center bg-[#f6f7fb]">
      <div className="text-center">
        <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 grid place-items-center text-white mx-auto animate-pulse"><GraduationCap size={22} /></span>
        <p className="text-slate-400 text-sm mt-3">Loading LearnLive…</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Toaster />
          <Suspense fallback={<RouteLoader />}>
            <PageFade>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Auth />} />
                <Route path="/signup" element={<Auth />} />
                <Route path="/room/:sessionId" element={<ProtectedRoute><Room /></ProtectedRoute>} />
                <Route path="/face-check" element={<ProtectedRoute><FaceCheck /></ProtectedRoute>} />
                <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/classes" element={<Classes />} />
                  <Route path="/classes/:id" element={<ClassDetail />} />
                  <Route path="/schedule" element={<Schedule />} />
                  <Route path="/face-setup" element={<FaceSetup />} />
                  <Route path="/achievements" element={<Achievements />} />
                  <Route path="/profile" element={<Profile />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </PageFade>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
