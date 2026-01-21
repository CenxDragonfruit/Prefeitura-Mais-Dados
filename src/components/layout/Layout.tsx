import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { Loader2 } from 'lucide-react';

export function Layout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // 1. Enquanto o Supabase verifica se o usuário existe, mostramos um carregando
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-[#003B8F]" />
          <p className="text-sm text-muted-foreground">Verificando credenciais...</p>
        </div>
      </div>
    );
  }

  // 2. Se terminou de carregar e NÃO tem usuário, redireciona para Login
  if (!user) {
    // O 'replace' impede que o usuário volte para a página restrita clicando em "Voltar"
    // O 'state' salva onde ele tentou ir, para redirecionar de volta após login (opcional)
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // 3. Se tem usuário, renderiza o Layout normal (Sidebar + Conteúdo)
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-auto w-full relative">
        <div className="flex-1 w-full max-w-7xl mx-auto p-6 lg:p-8 animate-in fade-in duration-300">
          <Outlet />
        </div>
        <Footer />
      </main>
    </div>
  );
}