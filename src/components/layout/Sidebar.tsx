import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Database, CheckCircle, Plus, Menu, ChevronLeft, ChevronRight, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CrudModule } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const iconMap: Record<string, any> = { Database, CheckCircle };

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [modules, setModules] = useState<CrudModule[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  
  // Pega a inicial (ex: "B" de Bruno)
  const userInitial = profile?.full_name?.charAt(0).toUpperCase() || 'U';

  useEffect(() => {
    fetchModules();
    const channel = supabase.channel('sidebar-modules-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crud_modules' }, () => fetchModules())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchModules = async () => {
    const { data } = await supabase.from('crud_modules').select('*').order('name');
    if (data) setModules(data as CrudModule[]);
  };

  const isActive = (path: string) => location.pathname === path;
  const getIcon = (iconName: string) => iconMap[iconName] || Database;
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/modulos', icon: Database, label: 'Módulos CRUD' },
    { path: '/aprovacoes', icon: CheckCircle, label: 'Aprovações' },
  ];

  const NavItem = ({ item, active, onClick, to, isModule = false }: any) => {
    const content = (
      <Link to={to} onClick={onClick} className={cn("flex items-center gap-3 rounded-lg transition-all duration-200 group relative", collapsed ? "justify-center w-10 h-10 mx-auto p-0" : "px-3 py-2.5 w-full", active ? "bg-yellow-400 text-[#003B8F] shadow-sm font-bold" : "text-white/80 hover:bg-white/10 hover:text-white")}>
        <item.icon className={cn("shrink-0 transition-all", collapsed ? "h-5 w-5" : "h-5 w-5")} />
        <AnimatePresence>{!collapsed && (<motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="whitespace-nowrap overflow-hidden text-sm">{item.label}</motion.span>)}</AnimatePresence>
      </Link>
    );
    if (collapsed) return <Tooltip delayDuration={0}><TooltipTrigger asChild>{content}</TooltipTrigger><TooltipContent side="right" className="bg-[#002d6e] text-white border-white/10 ml-2 z-50">{item.label}</TooltipContent></Tooltip>;
    return content;
  };

  return (
    <TooltipProvider>
      <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 lg:hidden text-[#003B8F] bg-white/80 backdrop-blur shadow-sm" onClick={() => setCollapsed(!collapsed)}><Menu className="h-5 w-5" /></Button>
      <motion.aside initial={false} animate={{ width: collapsed ? 80 : 280 }} className={cn("fixed left-0 top-0 h-screen z-40 flex flex-col shadow-2xl bg-[#003B8F] text-white transition-all duration-300 ease-in-out", "lg:relative")}>
        <div className="flex flex-col h-full overflow-hidden border-r border-white/10">
          
          {/* HEADER: Inicial do Usuário */}
          <div className={cn("flex items-center h-20 bg-[#002d6e] transition-all duration-300", collapsed ? "justify-center px-0" : "px-6")}>
            <div className="flex items-center gap-3 w-full">
              <div className="w-10 h-10 flex items-center justify-center shrink-0 bg-yellow-400 rounded-lg shadow-lg mx-auto lg:mx-0 text-[#003B8F] font-bold text-xl border-2 border-white/10 cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate('/perfil')}>
                {userInitial}
              </div>
              <AnimatePresence>{!collapsed && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col min-w-[150px]"><h1 className="font-bold text-white text-lg leading-tight tracking-tight">{profile?.full_name?.split(' ')[0] || 'Usuário'}</h1><p className="text-[10px] text-white/70 uppercase tracking-wider">Conta SMTI</p></motion.div>)}</AnimatePresence>
            </div>
          </div>

          <nav className="flex-1 py-6 px-3 space-y-4 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/20">
            <div className="space-y-1">{navItems.map((item) => <NavItem key={item.path} item={item} to={item.path} active={isActive(item.path)} />)}</div>
            {modules.length > 0 && (<div className="space-y-1 pt-4">{!collapsed && <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-3 mb-2">Sistemas</p>}{collapsed && <div className="h-px w-8 bg-white/10 mx-auto my-2" />}{modules.map((module) => (<NavItem key={module.id} item={{ ...module, label: module.name, icon: getIcon(module.icon) }} to={`/crud/${module.slug}`} active={isActive(`/crud/${module.slug}`)} isModule />))}</div>)}
            <div className="pt-4 mt-auto"><NavItem item={{ label: 'Criar Novo', icon: Plus }} to="/modulos/novo" active={isActive('/modulos/novo')} /></div>
          </nav>

          <div className={cn("bg-[#002d6e] border-t border-white/10 transition-all", collapsed ? "p-3 flex justify-center" : "p-4")}>
            <div className="flex items-center gap-3 w-full">
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => navigate('/perfil')} className="w-9 h-9 rounded-full bg-white/10 hover:bg-yellow-400 hover:text-[#003B8F] text-white flex items-center justify-center shrink-0 shadow-md transition-colors"><Settings className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Meu Perfil</TooltipContent></Tooltip>
              {!collapsed && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-w-0"><p className="text-sm font-medium text-white truncate cursor-pointer hover:underline" onClick={() => navigate('/perfil')}>Configurações</p></motion.div>)}
              {!collapsed && (<Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={signOut} className="text-white/60 hover:text-red-300 hover:bg-white/5 shrink-0 ml-auto"><LogOut className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Sair</TooltipContent></Tooltip>)}
            </div>
          </div>
        </div>
        <button onClick={() => setCollapsed(!collapsed)} className="absolute -right-3 top-20 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-[#003B8F] shadow-[0_2px_5px_rgba(0,0,0,0.2)] hover:scale-110 transition-transform z-50 border-2 border-white cursor-pointer">{collapsed ? <ChevronRight className="h-3 w-3 stroke-[4]" /> : <ChevronLeft className="h-3 w-3 stroke-[4]" />}</button>
      </motion.aside>
    </TooltipProvider>
  );
}