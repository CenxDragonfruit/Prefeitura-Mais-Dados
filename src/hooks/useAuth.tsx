import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

export type UserRole = 'consulta' | 'funcionario' | 'supervisor' | 'administrador';
export type Permission = 'approve_data' | 'manage_team' | 'create_system' | 'delete_system';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: any | null;
  role: UserRole;
  loading: boolean;
  signIn: (e: string, p: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<void>;
  checkPermission: (permission: Permission) => boolean;
};

const AuthContext = createContext<AuthContextType>({} as any);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState<UserRole>('consulta');
  const [loading, setLoading] = useState(true);

  // Busca o perfil no banco (Função Auxiliar)
  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
      if (data) {
        setProfile(data);
        setRole((data.role as UserRole) || 'consulta');
      }
    } catch (e) {
      console.error("Erro ao carregar perfil:", e);
    }
  };

  useEffect(() => {
    let mounted = true;

    // 1. INICIALIZAÇÃO ROBUSTA
    const initAuth = async () => {
      try {
        // Tenta recuperar a sessão do LocalStorage
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          if (session?.user) {
            console.log("Sessão restaurada:", session.user.email);
            // Define o usuário IMEDIATAMENTE para evitar redirect
            setSession(session);
            setUser(session.user);
            
            // Busca o perfil em segundo plano
            await fetchProfile(session.user.id);
          }
        }
      } catch (error) {
        console.error("Erro na inicialização do Auth:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // 2. LISTENER DE MUDANÇAS (Login, Logout, Refresh Token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Evento Auth:", event);
      
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Se o perfil ainda não estiver carregado, carrega agora
          if (!profile) await fetchProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          // Limpeza total ao deslogar
          setProfile(null);
          setRole('consulta');
          setUser(null);
        }
        
        setLoading(false);
      }
    });

    // 3. TIMEOUT DE SEGURANÇA (Aumentado para 6s)
    // Se o banco estiver "dormindo", isso evita o loading infinito, 
    // mas dá tempo suficiente para recuperar a sessão.
    const safetyTimer = setTimeout(() => {
      if (loading && mounted) {
        console.warn("Auth timeout: Liberando aplicação.");
        setLoading(false);
      }
    }, 6000);

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const checkPermission = (permission: Permission): boolean => {
    if (role === 'administrador') return true;
    switch (permission) {
      case 'approve_data': return role === 'supervisor';
      case 'manage_team': return role === 'supervisor';
      default: return false;
    }
  };

  const signIn = async (e: string, p: string) => supabase.auth.signInWithPassword({ email: e, password: p });
  
  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    // O onAuthStateChange vai lidar com a limpeza de estado
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, role, loading, signIn, signOut, checkPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return context;
};