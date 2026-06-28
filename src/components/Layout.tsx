import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  Compass,
  PlusCircle,
  MessageCircle,
  User,
  Moon,
  Sun,
  Menu,
  TrendingUp,
  LogOut,
  Settings,
  Flame,
} from "lucide-react";
import { useThemeStore } from "@/stores";
import { useAuthStore } from "@/stores";
import { useAppStore } from "@/stores";
import { cn, getInitials } from "@/lib/utils";
import { Avatar } from "@/components/ui";

const NAV_ITEMS = [
  { id: "home", path: "/", icon: Home, label: "Início" },
  { id: "explore", path: "/explore", icon: Compass, label: "Explorar" },
  { id: "upload", path: "/upload", icon: PlusCircle, label: "Criar" },
  { id: "messages", path: "/messages", icon: MessageCircle, label: "Mensagens" },
  { id: "profile", path: "/profile", icon: User, label: "Perfil" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // no-op: kept for future header interactions
  }, []);

  const handleNavigate = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col fixed left-0 top-0 bottom-0 bg-surface border-r border-border-color z-30">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border-color">
            <div className="h-10 w-10 rounded-xl overflow-hidden flex items-center justify-center shadow-lg shadow-primary/30 bg-black">
            <img src="/icone.svg" alt="MemeFlow" className="h-full w-full object-cover" />
          </div>
          <span className="text-xl font-bold">
            MemeFlow
          </span>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-on-surface-muted hover:bg-surface-hover hover:text-on-surface"
                )}
              >
                {item.id === "profile" ? (
                  <User className={cn("h-5 w-5", isActive && "text-primary")} />
                ) : (
                  <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                )}
                {item.label}
                {item.id === "upload" && (
                  <PlusCircle className="ml-auto h-5 w-5 text-accent" />
                )}
              </button>
            );
          })}
        </nav>

        {/* 'Em Alta' removed per request */}

        {/* User */}
        {user && (
          <div className="px-4 py-3 border-t border-border-color">
            <div className="flex items-center gap-3">
              <Avatar
                src={user.avatar_url || undefined}
                alt={user.full_name}
                fallback={getInitials(user.full_name)}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-on-surface truncate">{user.full_name}</p>
                <p className="text-xs text-on-surface-muted truncate">@{user.username}</p>
              </div>
              <button
                onClick={handleLogout}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-on-surface-muted hover:bg-surface-hover hover:text-red-500 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 lg:ml-72">
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 bg-surface/80 backdrop-blur-xl border-b border-border-color">
          <div className="flex items-center justify-between h-14 px-2 sm:px-4">
            {/* Left: Menu + Logo (mobile) */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <Menu className="h-5 w-5 text-on-surface" />
              </button>
              <div className="md:hidden flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg overflow-hidden bg-black flex items-center justify-center">
                    <img src="/icone.svg" alt="MemeFlow" className="h-full w-full object-cover" />
                  </div>
                  <span className="text-base font-bold">
                    MemeFlow
                  </span>
              </div>
            </div>

            {/* Center search removed per request */}

            {/* Right: Actions */}
            <div className="flex items-center gap-0.5 sm:gap-1">
              <button
                onClick={toggleTheme}
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center hover:bg-surface-hover transition-colors cursor-pointer"
              >
                {isDark ? (
                  <Sun className="h-5 w-5 text-accent" />
                ) : (
                  <Moon className="h-5 w-5 text-primary" />
                )}
              </button>


            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="pb-20 md:pb-4 min-h-[calc(100dvh-3.5rem)]">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-surface/90 backdrop-blur-xl border-t border-border-color pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16 px-1 sm:px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            const isUpload = item.id === "upload";
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all duration-200 cursor-pointer min-w-[44px] min-h-[44px]",
                  isUpload && !isActive
                    ? ""
                    : isActive
                    ? "text-primary"
                    : "text-on-surface-muted"
                )}
              >
                {isUpload ? (
                  <div className={cn(
                    "h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center -mt-4 shadow-lg",
                    isActive
                      ? "bg-primary shadow-primary/30"
                      : "bg-gradient-to-r from-primary to-secondary shadow-primary/20"
                  )}>
                    <item.icon className="h-5 w-5 text-white" />
                  </div>
                ) : (
                  <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                )}
                <span className={cn("text-[10px]", isActive ? "text-primary font-medium" : "text-on-surface-muted")}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 animate-fade-in">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[min(82vw,18rem)] bg-surface shadow-2xl animate-slide-down">
            <div className="flex items-center justify-between px-4 py-4 border-b border-border-color">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Flame className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  MemeFlow
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-surface-hover cursor-pointer"
              >
                <X className="h-4 w-4 text-on-surface-muted" />
              </button>
            </div>
            <nav className="px-3 py-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.path)}
                    className={cn(
                      "flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-on-surface-muted hover:bg-surface-hover"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="px-3 mt-4 border-t border-border-color pt-4">
              <button
                onClick={() => { toggleTheme(); }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm text-on-surface-muted hover:bg-surface-hover transition-colors cursor-pointer"
              >
                {isDark ? <Sun className="h-5 w-5 text-accent" /> : <Moon className="h-5 w-5 text-primary" />}
                {isDark ? "Modo Claro" : "Modo Escuro"}
              </button>
              <button
                onClick={() => handleNavigate("/settings")}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm text-on-surface-muted hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <Settings className="h-5 w-5" />
                Configurações
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="h-5 w-5" />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar overlay (for tablet when sidebar is toggled) */}
      {sidebarOpen && (
        <div className="hidden md:block lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
        </div>
      )}
    </div>
  );
}
