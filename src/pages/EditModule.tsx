import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Save, ArrowLeft, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

// --- SUB-COMPONENTE DE LINHA ---
const FieldRow = ({ field, onUpdate, onRemove }: any) => {
  const [newOption, setNewOption] = useState('');
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 border rounded-lg bg-white space-y-4">
      <div className="grid gap-4 md:grid-cols-12 items-end">
        <div className="md:col-span-4"><Label className="text-xs">Rótulo</Label><Input value={field.label} onChange={(e) => onUpdate(field.id, { label: e.target.value })} /></div>
        <div className="md:col-span-3"><Label className="text-xs">Tipo</Label>
          <Select value={field.field_type} onValueChange={(v) => onUpdate(field.id, { field_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
                <SelectItem value="text">Texto</SelectItem>
                <SelectItem value="number">Número</SelectItem>
                <SelectItem value="date">Data</SelectItem>
                <SelectItem value="select">Seleção</SelectItem>
                <SelectItem value="textarea">Área de Texto</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="cpf">CPF</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-3 flex items-center gap-2 pb-2">
            <Switch checked={field.is_required} onCheckedChange={(c) => onUpdate(field.id, { is_required: c })} />
            <span className="text-xs">Obrigatório</span>
        </div>
        <div className="md:col-span-2 text-right">
            <Button variant="ghost" size="icon" onClick={() => onRemove(field.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
        </div>
      </div>
      {field.field_type === 'select' && (
        <div className="bg-slate-50 p-3 rounded">
            <div className="flex flex-wrap gap-2 mb-2">
                {field.options?.map((opt:any, i:number) => (
                    <span key={i} className="bg-white border px-2 py-1 rounded text-xs flex items-center gap-1">{opt.label} <X className="h-3 w-3 cursor-pointer" onClick={() => {
                        const opts = field.options.filter((_:any, idx:number) => idx !== i);
                        onUpdate(field.id, { options: opts });
                    }}/></span>
                ))}
            </div>
            <div className="flex gap-2">
                <Input value={newOption} onChange={e=>setNewOption(e.target.value)} placeholder="Nova opção" className="h-8 text-xs" />
                <Button size="sm" variant="outline" onClick={() => {
                    if(newOption) {
                        const val = newOption.toLowerCase().replace(/[^a-z0-9]/g, '_');
                        onUpdate(field.id, { options: [...(field.options||[]), { label: newOption, value: val }] });
                        setNewOption('');
                    }
                }}>Add</Button>
            </div>
        </div>
      )}
    </motion.div>
  );
};

export default function EditModule() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [moduleName, setModuleName] = useState('');
  const [moduleDesc, setModuleDesc] = useState('');
  
  const [tables, setTables] = useState<any[]>([]);
  const [activeTableId, setActiveTableId] = useState<string>('');
  const [fields, setFields] = useState<any[]>([]);

  useEffect(() => { if (id) loadData(); }, [id]);

  const loadData = async () => {
    try {
        // 1. Módulo
        const { data: mod } = await supabase.from('crud_modules').select('*').eq('id', id).single();
        if(!mod) throw new Error("Módulo não encontrado");
        setModuleName(mod.name);
        setModuleDesc(mod.description || '');

        // 2. Tabelas
        const { data: tabs } = await supabase.from('crud_tables').select('*').eq('crud_module_id', id).order('created_at');
        if(tabs && tabs.length > 0) {
            setTables(tabs);
            setActiveTableId(tabs[0].id); // Seleciona a primeira
            loadFields(tabs[0].id);
        } else {
            setTables([]);
        }
    } catch(e) { console.error(e); navigate('/modulos'); } finally { setLoading(false); }
  };

  const loadFields = async (tableId: string) => {
      setLoading(true);
      const { data } = await supabase.from('crud_fields').select('*').eq('crud_table_id', tableId).order('order_index');
      
      // Normaliza options e adiciona flag isNew: false
      const normalized = (data || []).map(f => ({
          ...f,
          options: typeof f.options === 'string' ? JSON.parse(f.options) : f.options,
          isNew: false
      }));
      setFields(normalized);
      setLoading(false);
  };

  const handleTableChange = (tId: string) => {
      setActiveTableId(tId);
      loadFields(tId);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        // Atualiza Módulo
        await supabase.from('crud_modules').update({ name: moduleName, description: moduleDesc }).eq('id', id);

        // Atualiza Campos da Tabela Ativa
        if (activeTableId) {
            for (const f of fields) {
                const payload = {
                    crud_table_id: activeTableId,
                    label: f.label,
                    name: f.name || f.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '_'),
                    field_type: f.field_type,
                    is_required: f.is_required,
                    options: JSON.stringify(f.options),
                    order_index: 0
                };

                if (f.isNew) {
                    await supabase.from('crud_fields').insert(payload);
                } else {
                    await supabase.from('crud_fields').update(payload).eq('id', f.id);
                }
            }
        }
        toast.success("Salvo com sucesso!");
        // Recarrega para limpar flags isNew
        loadFields(activeTableId);
    } catch(e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  if (loading && !moduleName) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto pb-20 pt-8">
       <Button variant="ghost" onClick={() => navigate('/modulos')} className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
       <h1 className="text-3xl font-bold mb-6">Editar Estrutura</h1>

       <div className="bg-white p-6 rounded-xl border shadow-sm mb-6 space-y-4">
           <div><Label>Nome do Sistema</Label><Input value={moduleName} onChange={e=>setModuleName(e.target.value)} /></div>
           <div><Label>Descrição</Label><Input value={moduleDesc} onChange={e=>setModuleDesc(e.target.value)} /></div>
       </div>

       {tables.length > 0 ? (
           <div className="space-y-4">
               <Label>Tabelas do Sistema</Label>
               <div className="flex gap-2 border-b pb-2 mb-4 overflow-x-auto">
                   {tables.map(t => (
                       <button 
                         key={t.id} 
                         onClick={() => handleTableChange(t.id)}
                         className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTableId === t.id ? 'bg-[#003B8F] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                       >
                           {t.name}
                       </button>
                   ))}
               </div>

               <div className="space-y-4 bg-slate-50 p-6 rounded-xl border">
                   <div className="flex justify-between items-center">
                       <h3 className="font-bold text-slate-700">Campos da Tabela</h3>
                       <Button size="sm" onClick={() => setFields([...fields, { id: crypto.randomUUID(), isNew: true, field_type: 'text', options: [], label: 'Novo Campo' }])}>
                           <Plus className="mr-2 h-4 w-4" /> Adicionar Campo
                       </Button>
                   </div>
                   
                   {fields.map(f => (
                       <FieldRow 
                         key={f.id} 
                         field={f} 
                         onUpdate={(id:string, d:any) => setFields(fields.map(field => field.id === id ? { ...field, ...d } : field))}
                         onRemove={(id:string) => {
                             if(f.isNew) {
                                setFields(fields.filter(field => field.id !== id));
                             } else {
                                if(confirm("Tem certeza? Isso apagará os dados deste campo.")) {
                                    supabase.from('crud_fields').delete().eq('id', id).then(() => {
                                        setFields(fields.filter(field => field.id !== id));
                                        toast.success("Campo removido");
                                    });
                                }
                             }
                         }}
                       />
                   ))}
               </div>
           </div>
       ) : (
           <div className="p-8 text-center border-dashed border-2 rounded bg-slate-50">Nenhuma tabela encontrada neste módulo.</div>
       )}

       <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex justify-end lg:pl-80 z-50">
           <Button onClick={handleSave} className="bg-[#22C55E] hover:bg-green-600 text-white shadow-lg"><Save className="mr-2 h-4 w-4" /> Salvar Alterações</Button>
       </div>
    </div>
  );
}