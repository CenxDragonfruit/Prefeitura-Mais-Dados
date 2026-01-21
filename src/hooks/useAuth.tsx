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
  canWriteInModule: (moduleId: string) => Promise<boolean>; // Nova função
};

const AuthContext = createContext<AuthContextType>({} as any);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState<UserRole>('consulta');
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
      if (data) {
        setProfile(data);
        setRole((data.role as UserRole) || 'consulta');
      }
    } catch (e) {
      console.error("Erro perfil:", e);
    }
  };

  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject("Timeout"), 2000));
        const result: any = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (mounted && result?.data?.session) {
          const s = result.data.session;
          setSession(s);
          setUser(s.user);
          setLoading(false);
          await fetchProfile(s.user.id);
        } else if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        if (mounted) setLoading(false);
      }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user && !profile) await fetchProfile(session.user.id);
      } 
      else if (event === 'SIGNED_OUT') {
        setUser(null); setSession(null); setProfile(null); setRole('consulta'); setLoading(false);
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const checkPermission = (permission: Permission): boolean => {
    if (role === 'administrador') return true;
    switch (permission) {
      case 'approve_data': return role === 'supervisor';
      case 'manage_team': return role === 'supervisor';
      default: return false;
    }
  };

  // LÓGICA DE ESCRITA POR MÓDULO
  const canWriteInModule = async (moduleId: string): Promise<boolean> => {
    if (role === 'administrador') return true;
    if (role === 'consulta') return false;

    const { data, error } = await supabase
      .from('profile_modules')
      .select('id')
      .eq('profile_id', profile?.id)
      .eq('crud_module_id', moduleId)
      .maybeSingle();

    return !!data && !error;
  };

  const signIn = async (e: string, p: string) => supabase.auth.signInWithPassword({ email: e, password: p });
  
  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
    } finally {
      setUser(null); setSession(null); setProfile(null); setRole('consulta'); setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, role, loading, signIn, signOut, checkPermission, canWriteInModule }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);