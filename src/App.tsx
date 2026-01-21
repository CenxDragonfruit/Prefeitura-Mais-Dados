import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { Layout } from "./components/layout/Layout";

// Importação das Páginas
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard"; // Garanta que o Dashboard está importado
import Modules from "./pages/Modules";
import NewModule from "./pages/NewModule"; // Página de Criar Módulo
import EditModule from "./pages/EditModule"; // Página de Editar (se tiver)
import CrudPage from "./pages/CrudPage";   // A página principal do sistema (Formulário/Tabela)
import Approvals from "./pages/Approvals"; // A nova página de aprovações
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            {/* Rota Pública (Login) */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Rotas Privadas (Com Layout) */}
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              
              {/* Gestão de Módulos (Meus Sistemas) */}
              <Route path="/modulos" element={<Modules />} />
              <Route path="/modulos/novo" element={<NewModule />} />
              <Route path="/modulos/editar/:id" element={<EditModule />} /> {/* Opcional se tiver criado */}
              
              {/* O Sistema em si (Acessado pelo Slug, ex: /crud/escolas) */}
              <Route path="/crud/:slug" element={<CrudPage />} />
              
              {/* Central de Aprovações */}
              <Route path="/aprovacoes" element={<Approvals />} />
              
              {/* Perfil */}
              <Route path="/perfil" element={<Profile />} />
            </Route>

            {/* Rota 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;