import { useNavigate } from "react-router-dom";
import {
  Moon,
  Sun,
  Bell,
  Shield,
  LogOut,
  Trash2,
  Globe,
  Smartphone,
  ChevronRight,
  User,
  Palette,
  Info,
} from "lucide-react";
import { useThemeStore } from "@/stores";
import { useAuthStore } from "@/stores";
import { Card, Switch, Avatar } from "@/components/ui";
import { getInitials } from "@/lib/utils";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useThemeStore();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const settingsSections = [
    {
      title: "Conta",
      items: [
        {
          icon: (
            useAuthStore.getState().user ? (
              <Avatar
                src={useAuthStore.getState().user?.avatar_url || undefined}
                fallback={getInitials(useAuthStore.getState().user?.full_name || "")}
                size="sm"
              />
            ) : (
              <User className="h-5 w-5 text-primary" />
            )
          ),
          label: "Editar Perfil",
          desc: "Nome, bio, foto",
          onClick: () => navigate("/profile"),
        },
        {
          icon: <Shield className="h-5 w-5 text-primary" />,
          label: "Privacidade",
          desc: "Configurações de privacidade",
          onClick: () => {},
        },
        {
          icon: <Globe className="h-5 w-5 text-primary" />,
          label: "Idioma",
          desc: "Português (Brasil)",
          onClick: () => {},
        },
      ],
    },
    {
      title: "Aparência",
      items: [
        {
          icon: isDark ? <Moon className="h-5 w-5 text-secondary" /> : <Sun className="h-5 w-5 text-accent" />,
          label: "Modo Escuro",
          desc: isDark ? "Ativado" : "Desativado",
          toggle: true,
          checked: isDark,
          onToggle: toggleTheme,
        },
        {
          icon: <Palette className="h-5 w-5 text-secondary" />,
          label: "Tema de Cores",
          desc: "Roxo (padrão)",
          onClick: () => {},
        },
      ],
    },
    {
      title: "Notificações",
      items: [
        {
          icon: <Bell className="h-5 w-5 text-accent-dark dark:text-accent" />,
          label: "Push Notifications",
          desc: "Curtidas, comentários, seguidores",
          toggle: true,
          checked: true,
          onToggle: () => {},
        },
        {
          icon: <Smartphone className="h-5 w-5 text-accent-dark dark:text-accent" />,
          label: "Notificações por Email",
          desc: "Resumo semanal",
          toggle: true,
          checked: false,
          onToggle: () => {},
        },
      ],
    },
    {
      title: "Sobre",
      items: [
        {
          icon: <Info className="h-5 w-5 text-on-surface-muted" />,
          label: "Sobre o MemeFlow",
          desc: "Versão 1.0.0",
          onClick: () => {},
        },
      ],
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-on-surface mb-1">Configurações</h1>
      <p className="text-sm text-on-surface-muted mb-6">Personalize sua experiência no MemeFlow</p>

      <div className="space-y-6">
        {settingsSections.map((section) => (
          <div key={section.title}>
            <h2 className="text-xs font-bold text-on-surface-muted uppercase tracking-wider mb-2 px-1">
              {section.title}
            </h2>
            <Card className="divide-y divide-border-color overflow-hidden">
              {section.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-4 hover:bg-surface-hover transition-colors">
                  <div className="shrink-0">{item.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-on-surface">{item.label}</p>
                    <p className="text-xs text-on-surface-muted">{item.desc}</p>
                  </div>
                  {item.toggle ? (
                    <Switch
                      checked={item.checked}
                      onChange={item.onToggle!}
                    />
                  ) : (
                    <button onClick={item.onClick} className="cursor-pointer">
                      <ChevronRight className="h-5 w-5 text-on-surface-muted" />
                    </button>
                  )}
                </div>
              ))}
            </Card>
          </div>
        ))}

        {/* Danger Zone */}
        <div>
          <h2 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2 px-1">
            Zona de Perigo
          </h2>
          <Card className="divide-y divide-border-color overflow-hidden">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full p-4 hover:bg-red-500/5 transition-colors cursor-pointer"
            >
              <LogOut className="h-5 w-5 text-red-500" />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-red-500">Sair da Conta</p>
                <p className="text-xs text-on-surface-muted">Desconectar de todos os dispositivos</p>
              </div>
            </button>
            <button className="flex items-center gap-3 w-full p-4 hover:bg-red-500/5 transition-colors cursor-pointer">
              <Trash2 className="h-5 w-5 text-red-500" />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-red-500">Excluir Conta</p>
                <p className="text-xs text-on-surface-muted">Esta ação não pode ser desfeita</p>
              </div>
            </button>
          </Card>
        </div>
      </div>

      <p className="text-center text-xs text-on-surface-muted mt-8 pb-4">
        MemeFlow v1.0.0
      </p>
    </div>
  );
}
