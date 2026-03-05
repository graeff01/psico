import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useSession, signOut } from "../lib/auth-client";
import { cn } from "../lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Mic,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  Brain,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Pacientes", href: "/patients", icon: Users },
  { name: "Consultas", href: "/consultations", icon: Calendar },
  { name: "Sessão", href: "/session", icon: Mic },
  { name: "Configurações", href: "/settings", icon: Settings },
];

export function Layout() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-surface">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-border flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-border-light">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-text-primary tracking-tight">
              PsicoIA
            </h1>
            <p className="text-[10px] text-text-muted font-medium uppercase tracking-widest">
              Manager
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden p-1 rounded hover:bg-surface-hover"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === "/"}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-50 text-primary-700"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                )
              }
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* LGPD badge */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sage-50 border border-sage-200">
            <Shield className="w-4 h-4 text-sage-600" />
            <span className="text-xs font-medium text-sage-700">
              LGPD Compliant
            </span>
          </div>
        </div>

        {/* User */}
        <div className="border-t border-border-light p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary-700">
                {session?.user?.name?.[0]?.toUpperCase() ?? "P"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {session?.user?.name ?? "Psicólogo(a)"}
              </p>
              <p className="text-xs text-text-muted truncate">
                {session?.user?.email}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-md hover:bg-red-50 text-text-muted hover:text-red-600 transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar mobile */}
        <header className="h-14 flex items-center px-4 border-b border-border-light bg-white lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-md hover:bg-surface-hover"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="ml-3 flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary-600" />
            <span className="font-bold text-sm">PsicoIA</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
