import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Lock, Mail, User, ArrowRight } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  
  // Se o usuário já estiver logado, redireciona para a Home
  if (user && !authLoading) {
    return <Navigate to="/" replace />;
  }

  const [isLoading, setIsLoading] = useState(false);
  
  // Estados do Formulário
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      toast.success("Login realizado com sucesso!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Erro ao realizar login.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Por favor, informe seu nome completo.");
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await signUp(email, password, fullName);
      if (error) throw error;
      toast.success("Cadastro realizado! Verifique seu e-mail.");
    } catch (error: any) {
      toast.error(error.message || "Erro ao realizar cadastro.");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#003B8F]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-slate-50">
      
      {/* LADO ESQUERDO: Branding / Identidade Visual */}
      <div className="md:w-1/2 bg-[#003B8F] p-8 flex flex-col justify-between relative overflow-hidden text-white">
        {/* Padrão de fundo decorativo */}
        <div className="absolute inset-0 opacity-10" 
             style={{ 
               backgroundImage: 'url("https://www.portovelho.ro.gov.br/logo/Brasao_municipal.svg")', 
               backgroundRepeat: 'no-repeat', 
               backgroundPosition: 'center', 
               backgroundSize: '80%' 
             }} 
        />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-white p-2 rounded-lg w-12 h-12 flex items-center justify-center">
              <img src="https://www.portovelho.ro.gov.br/logo/Brasao_municipal.svg" alt="Logo PVH" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight">SMTI</h1>
              <p className="text-xs text-blue-200 uppercase tracking-widest">Porto Velho - RO</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Sistema de Gestão Integrada</h2>
          <p className="text-blue-100 leading-relaxed mb-8">
            Acesso restrito para servidores municipais. Gerencie módulos, aprovações e dados cadastrais em um único lugar.
          </p>
          <div className="flex gap-4 text-sm font-medium text-yellow-400">
            <span className="flex items-center gap-1"><ArrowRight className="h-4 w-4" /> Gestão Eficiente</span>
            <span className="flex items-center gap-1"><ArrowRight className="h-4 w-4" /> Dados Seguros</span>
          </div>
        </div>

        <div className="relative z-10 text-xs text-blue-300">
          © {new Date().getFullYear()} Prefeitura de Porto Velho
        </div>
      </div>

      {/* LADO DIREITO: Formulário */}
      <div className="md:w-1/2 flex items-center justify-center p-4 md:p-8">
        <Card className="w-full max-w-md shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold text-[#003B8F]">Bem-vindo</CardTitle>
            <CardDescription>Entre com suas credenciais para acessar</CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="register">Criar Conta</TabsTrigger>
              </TabsList>

              {/* ABA DE LOGIN */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail Corporativo</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="seu.nome@portovelho.ro.gov.br" 
                        className="pl-10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Senha</Label>
                      <a href="#" className="text-xs text-[#003B8F] hover:underline font-medium">Esqueceu?</a>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                      <Input 
                        id="password" 
                        type="password" 
                        className="pl-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-[#003B8F] hover:bg-[#002d6e]" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Acessar Sistema"}
                  </Button>
                </form>
              </TabsContent>

              {/* ABA DE CADASTRO */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                      <Input 
                        id="name" 
                        placeholder="João da Silva" 
                        className="pl-10"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                      <Input 
                        id="register-email" 
                        type="email" 
                        className="pl-10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                      <Input 
                        id="register-password" 
                        type="password" 
                        className="pl-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full btn-gradient-primary" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Criar Conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="justify-center border-t pt-4">
            <p className="text-xs text-center text-muted-foreground">
              Em caso de dúvidas, contate o suporte da SMTI<br/>
              (69) 3901-3079
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}