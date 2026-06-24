import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, FileText, Brain, Mic,
  History, User, LogOut
} from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/resume", label: "Resume Analyzer", icon: FileText, testid: "nav-resume" },
  { to: "/quiz", label: "Quiz Practice", icon: Brain, testid: "nav-quiz" },
  { to: "/interview", label: "Mock Interview", icon: Mic, testid: "nav-interview" },
  { to: "/progress", label: "Progress Tracker", icon: History, testid: "nav-progress" },
  { to: "/profile", label: "Profile", icon: User, testid: "nav-profile" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-surface">
        <Link to="/dashboard" className="flex items-center gap-2 px-6 h-16 border-b border-border" data-testid="brand-link">
          <span className="font-heading font-bold text-lg tracking-tight">PlacementGuide</span>
        </Link>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={item.testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-secondary"
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border space-y-1">
          <div className="flex items-center gap-2 px-3 py-2 text-sm">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-semibold uppercase">
              {user?.name?.[0] || "U"}
            </div>
            <div className="overflow-hidden">
              <div className="font-semibold truncate" data-testid="sidebar-user-name">{user?.name}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-destructive hover:text-destructive"
            onClick={async () => { await logout(); navigate("/login"); }}
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-14 border-b border-border bg-surface/80 backdrop-blur flex items-center justify-between px-4">
        <Link to="/dashboard" className="flex items-center gap-2" data-testid="brand-link-mobile">
          <span className="font-heading font-bold">PlacementGuide</span>
        </Link>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-surface flex justify-around py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            data-testid={`${item.testid}-mobile`}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[10px] ${isActive ? "text-primary" : "text-muted-foreground"}`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label.split(" ")[0]}
          </NavLink>
        ))}
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 md:p-0 pt-14 md:pt-0 pb-16 md:pb-0">
        <div className="p-6 md:p-8 lg:p-10">{children}</div>
      </main>
    </div>
  );
}
