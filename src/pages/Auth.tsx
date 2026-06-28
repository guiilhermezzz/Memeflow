import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Flame,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { useAuthStore } from "@/stores";
import { Button, Input } from "@/components/ui";
import { toast } from "sonner";
import { hasSupabaseConfig } from "@/lib/supabase";

type AuthMode = "login" | "register" | "forgot";

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register, hydrateSession } = useAuthStore();
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register state
  const [regUsername, setRegUsername] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  // Forgot state
  const [forgotEmail, setForgotEmail] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void hydrateSession();
  }, [hydrateSession]);

  const handleLogin = async () => {
    const newErrors: Record<string, string> = {};
    if (!loginEmail.trim()) newErrors.loginEmail = "Email é obrigatório";
    if (!loginPassword.trim()) newErrors.loginPassword = "Senha é obrigatória";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    if (!hasSupabaseConfig) {
      toast.error("Configure as variáveis de ambiente do Supabase para autenticação real.");
      return;
    }

    setLoading(true);
    const success = await login(loginEmail, loginPassword);
    setLoading(false);

    if (success) {
      toast.success("Bem-vindo de volta!");
      navigate("/");
    } else {
      toast.error("Email ou senha inválidos");
    }
  };

  const handleRegister = async () => {
    const newErrors: Record<string, string> = {};
    if (!regUsername.trim()) newErrors.regUsername = "Username é obrigatório";
    if (!regName.trim()) newErrors.regName = "Nome é obrigatório";
    if (!regEmail.trim()) newErrors.regEmail = "Email é obrigatório";
    if (!regPassword.trim()) newErrors.regPassword = "Senha é obrigatória";
    else if (regPassword.length < 6) newErrors.regPassword = "Mínimo 6 caracteres";
    if (regPassword !== regConfirm) newErrors.regConfirm = "Senhas não coincidem";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    if (!hasSupabaseConfig) {
      toast.error("Configure as variáveis de ambiente do Supabase para autenticação real.");
      return;
    }

    setLoading(true);
    const success = await register(regUsername, regName, regEmail, regPassword);
    setLoading(false);

    if (success) {
      toast.success("Conta criada com sucesso!");
      navigate("/");
    } else {
      toast.error("Não foi possível criar a conta. Verifique os dados.");
    }
  };

  const handleForgot = async () => {
    const newErrors: Record<string, string> = {};
    if (!forgotEmail.trim()) newErrors.forgotEmail = "Email é obrigatório";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    toast.success("Email de recuperação enviado", {
      description: "Verifique sua caixa de entrada",
    });
    setMode("login");
  };

  return (
    <div className="min-h-[calc(100vh-7.5rem)] md:min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-8 animate-fade-in">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
            <Flame className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            MemeFlow
          </h1>
          <p className="text-sm text-on-surface-muted mt-1">
            {mode === "login" && "Entre para se divertir"}
            {mode === "register" && "Crie sua conta e comece a postar"}
            {mode === "forgot" && "Recupere sua senha"}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-surface border border-border-color rounded-2xl p-6 shadow-xl">
          {/* Mode Tabs */}
          {mode !== "forgot" && (
            <div className="flex gap-1 mb-6 bg-surface-alt rounded-xl p-1">
              <button
                onClick={() => setMode("login")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  mode === "login"
                    ? "bg-primary text-white shadow-lg"
                    : "text-on-surface-muted hover:text-on-surface"
                }`}
              >
                Entrar
              </button>
              <button
                onClick={() => setMode("register")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  mode === "register"
                    ? "bg-primary text-white shadow-lg"
                    : "text-on-surface-muted hover:text-on-surface"
                }`}
              >
                Criar Conta
              </button>
            </div>
          )}

          {/* Login Form */}
          {mode === "login" && (
            <div className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="seu@email.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                error={errors.loginEmail}
              />
              <div className="relative">
                <Input
                  label="Senha"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  error={errors.loginPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[38px] text-on-surface-muted hover:text-on-surface cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setMode("forgot")}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  Esqueci minha senha
                </button>
              </div>

              <Button onClick={handleLogin} disabled={loading} className="w-full">
                {loading ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Entrar <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Register Form */}
          {mode === "register" && (
            <div className="space-y-4">
              <Input
                label="Username"
                placeholder="meme_lord_42"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                error={errors.regUsername}
              />
              <Input
                label="Nome Completo"
                placeholder="Seu nome épico"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                error={errors.regName}
              />
              <Input
                label="Email"
                type="email"
                placeholder="seu@email.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                error={errors.regEmail}
              />
              <div className="relative">
                <Input
                  label="Senha"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  error={errors.regPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[38px] text-on-surface-muted hover:text-on-surface cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Input
                label="Confirmar Senha"
                type="password"
                placeholder="Repita a senha"
                value={regConfirm}
                onChange={(e) => setRegConfirm(e.target.value)}
                error={errors.regConfirm}
              />

              <Button onClick={handleRegister} disabled={loading} className="w-full">
                {loading ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Criar Conta <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Forgot Password Form */}
          {mode === "forgot" && (
            <div className="space-y-4">
              <p className="text-sm text-on-surface-muted">
                Digite seu email e enviaremos um link para redefinir sua senha.
              </p>
              <Input
                label="Email"
                type="email"
                placeholder="seu@email.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                error={errors.forgotEmail}
              />
              <Button onClick={handleForgot} disabled={loading} className="w-full">
                {loading ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Enviar Link de Recuperação"
                )}
              </Button>
              <button
                onClick={() => setMode("login")}
                className="flex items-center gap-1 text-sm text-primary hover:underline cursor-pointer mx-auto"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao login
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-on-surface-muted mt-6">
          Ao continuar, você concorda com os{" "}
          <span className="text-primary cursor-pointer">Termos de Uso</span> e{" "}
          <span className="text-primary cursor-pointer">Política de Privacidade</span>
        </p>
      </div>
    </div>
  );
}
