import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, Layers, ExternalLink, Table as TableIcon, Trash2, Pencil, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Modules() {
  const [modules, setModules] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      // Busca simplificada para evitar erros de coluna inexistente
      const { data, error } = await supabase
        .from('crud_modules')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setModules(data || []);
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao carregar lista: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSystem = (module: any) => {
    navigate(`/crud/${module.slug}`);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('crud_modules').delete().eq('id', deleteId);
      if (error) throw error;
      toast.success("Sistema excluído.");
      setModules(prev => prev.filter(m => m.id !== deleteId));
      setDeleteId(null);
    } catch (e: any) {
      toast.error("Erro ao excluir: " + e.message);
    }
  };

  const filtered = modules.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-gradient-to-r from-[#003B8F] to-[#0055CC] rounded-3xl p-8 text-white shadow-lg flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Meus Sistemas</h1>
          <p className="text-blue-100">Gerencie seus formulários e dados.</p>
        </div>
        <Button onClick={() => navigate('/modulos/novo')} className="bg-[#22C55E] hover:bg-green-500 text-white border-0 shadow-md h-12 px-6">
          <PlusCircle className="mr-2 h-5 w-5" /> Nova Tabela
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
        <Input 
            placeholder="Buscar..." 
            className="pl-10 h-11 bg-white shadow-sm" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </div>

      {loading ? <div className="text-center py-20 text-slate-400">Carregando...</div> : 
       filtered.length === 0 ? <div className="text-center py-24 text-slate-500 bg-slate-50 rounded-2xl border border-dashed">Nenhum sistema encontrado.</div> : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((mod: any) => (
            <div key={mod.id} onClick={() => handleOpenSystem(mod)} className="group bg-white rounded-xl p-5 shadow-sm border border-slate-200 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all relative">
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                 <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setDeleteId(mod.id); }}>
                   <Trash2 className="h-3.5 w-3.5" />
                 </Button>
              </div>
              <div className="p-3 bg-blue-50 text-[#003B8F] rounded-lg w-fit mb-3">
                 <TableIcon className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-800 mb-1 truncate">{mod.name}</h3>
              <p className="text-sm text-slate-500 line-clamp-2">{mod.description || 'Sem descrição'}</p>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir Sistema?</DialogTitle></DialogHeader>
          <DialogDescription>Isso apagará todos os dados permanentemente.</DialogDescription>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}