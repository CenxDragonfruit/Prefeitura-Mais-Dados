import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus, Search, Table as TableIcon, Trash2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth'; // Importar hook de autenticação

export default function Modules() {
  const [modules, setModules] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { role } = useAuth(); // Pegar o perfil do usuário

  useEffect(() => { fetchModules(); }, []);

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from('crud_modules')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setModules(data || []);
    } catch (e: any) { console.error(e); toast.error("Erro ao carregar: " + e.message); } 
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('crud_modules').delete().eq('id', deleteId);
      if (error) throw error;
      toast.success("Sistema excluído.");
      setModules(prev => prev.filter(m => m.id !== deleteId));
      setDeleteId(null);
    } catch (e: any) { toast.error("Erro ao excluir: " + e.message); }
  };

  const filtered = modules.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER MINIMALISTA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Meus Sistemas</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie suas tabelas e formulários de coleta.</p>
        </div>
        
        {/* BOTÃO PROTEGIDO (SÓ ADMIN) */}
        {role === 'administrador' && (
            <Button onClick={() => navigate('/modulos/novo')} className="bg-[#003B8F] hover:bg-[#002d6e] text-white shadow-sm h-10 px-4 rounded-lg">
              <Plus className="mr-2 h-4 w-4" /> Novo Sistema
            </Button>
        )}
      </div>

      {/* BARRA DE PESQUISA */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input 
            placeholder="Filtrar sistemas..." 
            className="pl-10 h-10 bg-white border-slate-200 focus-visible:ring-[#003B8F]" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
           {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            Nenhum sistema encontrado.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((mod: any) => (
            <div 
                key={mod.id} 
                onClick={() => navigate(`/crud/${mod.slug}`)} 
                className="group bg-white rounded-xl p-6 border border-slate-200 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all duration-200 relative flex flex-col justify-between min-h-[160px]"
            >
              {/* BOTÃO DELETE PROTEGIDO (SÓ ADMIN) */}
              {role === 'administrador' && (
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                     <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full" onClick={(e) => { e.stopPropagation(); setDeleteId(mod.id); }}>
                       <Trash2 className="h-4 w-4" />
                     </Button>
                  </div>
              )}

              <div>
                <div className="p-2.5 bg-blue-50 text-[#003B8F] rounded-lg w-fit mb-4 group-hover:scale-105 transition-transform">
                   <TableIcon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg text-slate-800 mb-2 leading-tight group-hover:text-[#003B8F] transition-colors">{mod.name}</h3>
                <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{mod.description || 'Sem descrição definida.'}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center text-xs font-medium text-slate-400 group-hover:text-blue-600 transition-colors">
                 Acessar dados <ChevronRight className="h-3 w-3 ml-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DIALOG DELETE */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir Sistema</DialogTitle></DialogHeader>
          <DialogDescription>
              Tem certeza que deseja excluir este sistema? Todos os dados vinculados serão perdidos permanentemente.
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir Definitivamente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}