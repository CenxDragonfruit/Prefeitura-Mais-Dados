import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Lock, Mail, ArrowRight, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type AuthStep = 'CHECK_EMAIL' | 'LOGIN' | 'CREATE_PASSWORD';

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, loading: authLoading } = useAuth();

  // ------------------------------------------------------------------
  // 1. TODOS OS HOOKS DEVEM FICAR AQUI NO TOPO (Antes de qualquer return)
  // ------------------------------------------------------------------
  const [step, setStep] = useState<AuthStep>('CHECK_EMAIL');
  const [loading, setLoading] = useState(false);
  
  // Dados do formulário
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // ------------------------------------------------------------------
  // 2. AGORA SIM PODEMOS FAZER O REDIRECIONAMENTO CONDICIONAL
  // ------------------------------------------------------------------
  if (user && !authLoading) {
    return <Navigate to="/" replace />;
  }

  // --- PASSO 1: VERIFICAR E-MAIL ---
  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);

    try {
      // Verifica na tabela PROFILES se o e-mail existe
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, user_id')
        .eq('email', email)
        .maybeSingle();

      if (error) throw error;

      if (!profile) {
        toast.error("E-mail não encontrado.", { description: "Solicite seu cadastro ao administrador." });
        setLoading(false);
        return;
      }

      setFullName(profile.full_name || "");

      if (profile.user_id) {
        // Já tem login vinculado -> Vai para tela de Senha
        setStep('LOGIN');
      } else {
        // Existe na tabela mas não tem login -> Vai para Criar Senha
        setStep('CREATE_PASSWORD');
      }

    } catch (err) {
      console.error(err);
      toast.error("Erro ao verificar e-mail.");
    } finally {
      setLoading(false);
    }
  };

  // --- PASSO 2A: LOGIN (Usuário já tem senha) ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      toast.success("Bem-vindo de volta!");
      navigate("/");
    } catch (error: any) {
      console.error("Erro no login:", error);
      
      // Tratamento específico para e-mail não confirmado
      if (error.message && error.message.includes("Email not confirmed")) {
        toast.error("E-mail não confirmado.", { description: "Verifique se a confirmação de e-mail está desativada no Supabase." });
      } else {
        toast.error(error.message || "Senha incorreta ou erro no login.");
      }
    } finally {
      setLoading(false);
    }
  };

  // --- PASSO 2B: PRIMEIRO ACESSO (Criar senha) ---
  const handleFirstAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
        toast.error("A senha deve ter no mínimo 6 caracteres.");
        return;
    }
    setLoading(true);
    try {
      // 1. Cria o usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: { data: { full_name: fullName } }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Vincula o user_id novo ao perfil existente (ativação)
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ user_id: authData.user.id })
            .eq('email', email);

        if (updateError) throw updateError;

        toast.success("Conta ativada com sucesso!");
        // O próprio AuthProvider/Listener deve detectar o login, mas navegamos por garantia
        navigate("/");
      }
    } catch (error: any) {
        toast.error("Erro ao ativar conta: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  // Títulos dinâmicos
  const getHeader = () => {
    switch (step) {
        case 'CHECK_EMAIL': return { title: "Acesso ao Sistema", desc: "Digite seu e-mail corporativo para continuar." };
        case 'LOGIN': return { title: `Olá, ${fullName.split(' ')[0]}`, desc: "Digite sua senha para entrar." };
        case 'CREATE_PASSWORD': return { title: "Primeiro Acesso", desc: `Olá ${fullName.split(' ')[0]}, defina sua senha.` };
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-[#003B8F]" /></div>;

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white">
      {/* LADO ESQUERDO (Banner) */}
      <div className="md:w-1/2 bg-[#003B8F] p-8 flex flex-col justify-between relative overflow-hidden text-white hidden md:flex">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'url("https://www.portovelho.ro.gov.br/logo/Brasao_municipal.svg")', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundSize: '80%' }} />
        <div className="relative z-10 pt-4"><img src="https://www.portovelho.ro.gov.br/logo/SMTI_horizontal_branco.png" alt="SMTI Logo" className="h-14 w-auto object-contain object-left" /></div>
        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Sistema de Gestão Integrada</h2>
          <p className="text-blue-100 leading-relaxed mb-8 font-light">Plataforma centralizada para gestão de módulos e dados municipais.</p>
        </div>
        <div className="relative z-10 text-xs text-blue-300 opacity-80">
          <p>© {new Date().getFullYear()} Prefeitura de Porto Velho</p>
        </div>
      </div>

      {/* LADO DIREITO (Formulário) */}
      <div className="md:w-1/2 w-full flex items-center justify-center p-4 bg-slate-50/50">
        <Card className="w-full max-w-[400px] border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl bg-white overflow-hidden">
          
          <CardHeader className="text-center pb-2 pt-8 animate-in fade-in slide-in-from-top-4">
            <CardTitle className="text-2xl font-bold text-slate-800">{getHeader().title}</CardTitle>
            <CardDescription>{getHeader().desc}</CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6 px-8">
            
            {/* ESTADO 1: VERIFICAR E-MAIL */}
            {step === 'CHECK_EMAIL' && (
                <form onSubmit={handleCheckEmail} className="space-y-4 animate-in fade-in slide-in-from-right-8">
                    <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input 
                                id="email" 
                                type="email" 
                                placeholder="nome@portovelho.ro.gov.br" 
                                className="pl-9 h-11" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                autoFocus
                                required 
                            />
                        </div>
                    </div>
                    <Button type="submit" className="w-full bg-[#003B8F] hover:bg-[#002d6e] h-11" disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="flex items-center">Continuar <ArrowRight className="ml-2 h-4 w-4"/></span>}
                    </Button>
                </form>
            )}

            {/* ESTADO 2: LOGIN COM SENHA */}
            {step === 'LOGIN' && (
                <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in slide-in-from-right-8">
                     <div className="p-3 bg-blue-50 rounded-lg flex items-center gap-3 mb-4 border border-blue-100">
                        <div className="bg-white p-1.5 rounded-full"><UserCheck className="h-4 w-4 text-blue-600"/></div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-xs text-blue-500 font-bold uppercase">Conta</p>
                            <p className="text-sm text-blue-900 truncate" title={email}>{email}</p>
                        </div>
                        <button type="button" onClick={() => { setStep('CHECK_EMAIL'); setPassword(''); }} className="text-xs text-blue-600 hover:underline">Alterar</button>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password">Senha</Label>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input 
                                id="password" 
                                type="password" 
                                className="pl-9 h-11" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                autoFocus
                                required 
                            />
                        </div>
                    </div>
                    <Button type="submit" className="w-full bg-[#003B8F] hover:bg-[#002d6e] h-11" disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
                    </Button>
                </form>
            )}

            {/* ESTADO 3: CRIAR SENHA (PRIMEIRO ACESSO) */}
            {step === 'CREATE_PASSWORD' && (
                <form onSubmit={handleFirstAccess} className="space-y-4 animate-in fade-in slide-in-from-right-8">
                    <div className="p-3 bg-green-50 rounded-lg border border-green-100 text-sm text-green-800 mb-2">
                        Sua conta foi criada pelo administrador. Defina uma senha segura para ativar seu acesso.
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="new-password">Nova Senha</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input 
                                id="new-password" 
                                type="password" 
                                className="pl-9 h-11" 
                                placeholder="Mínimo 6 caracteres"
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                autoFocus
                                required 
                            />
                        </div>
                    </div>
                    
                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="ghost" onClick={() => setStep('CHECK_EMAIL')} className="flex-1">
                            Voltar
                        </Button>
                        <Button type="submit" className="flex-[2] bg-green-600 hover:bg-green-700 text-white h-11" disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ativar e Entrar"}
                        </Button>
                    </div>
                </form>
            )}

          </CardContent>
          <CardFooter className="justify-center border-t border-slate-100 py-4 bg-slate-50/50 rounded-b-2xl">
            <p className="text-xs text-center text-slate-400">Suporte SMTI: (69) 3901-3079</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}