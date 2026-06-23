import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import LandingPage from "@/pages/LandingPage";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import Resume from "@/pages/Resume";
import Quiz from "@/pages/Quiz";
import Interview from "@/pages/Interview";
import Coach from "@/pages/Coach";
import Roadmap from "@/pages/Roadmap";
import Analytics from "@/pages/Analytics";

function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
}

const inLayout = (el) => (
  <ProtectedRoute>
    <Layout>{el}</Layout>
  </ProtectedRoute>
);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster richColors position="top-right" />
          <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={inLayout(<Dashboard />)} />
            <Route path="/profile" element={inLayout(<Profile />)} />
            <Route path="/resume" element={inLayout(<Resume />)} />
            <Route path="/quiz" element={inLayout(<Quiz />)} />
            <Route path="/interview" element={inLayout(<Interview />)} />
            <Route path="/coach" element={inLayout(<Coach />)} />
            <Route path="/roadmap" element={inLayout(<Roadmap />)} />
            <Route path="/analytics" element={inLayout(<Analytics />)} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
