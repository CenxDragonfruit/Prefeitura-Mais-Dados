import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Save, ArrowLeft, X, ListPlus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const FIELD_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Data' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'currency', label: 'Moeda' },
  { value: 'textarea', label: 'Texto Longo' },
  { value: 'select', label: 'Seleção' },
];

// Sub-componente para as linhas (importante estar fora do componente principal)
const FieldRow = ({ field, onUpdate, onRemove }: any) => {
  const [newOptionText, setNewOptionText] = useState('');

  const handleAddOption = () => {
    if (!newOptionText.trim()) return;
    const label = newOptionText.trim();
    const value = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const currentOptions = field.options || [];
    onUpdate(field.id, { options: [...currentOptions, { label, value }] });
    setNewOptionText('');
  };

  const handleRemoveOption = (idx: number) => {
    const currentOptions = field.options || [];
    onUpdate(field.id, { options: currentOptions.filter((_: any, i: number) => i !== idx) });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 border rounded-lg bg-card shadow-sm space-y-4">
      <div className="grid gap-4 md:grid-cols-12 items-start">
        <div className="md:col-span-4">
          <Label className="text-xs text-muted-foreground mb-1 block">Rótulo *</Label>
          <Input value={field.label} onChange={(e) => onUpdate(field.id, { label: e.target.value })} required />
        </div>
        <div className="md:col-span-3">
          <Label className="text-xs text-muted-foreground mb-1 block">Nome Interno</Label>
          <Input 
            value={field.name} 
            onChange={(e) => onUpdate(field.id, { name: e.target.value })} 
            disabled={!field.isNew} 
            className={!field.isNew ? "bg-muted cursor-not-allowed" : "font-mono"}
          />
        </div>
        <div className="md:col-span-3">
          <Label className="text-xs text-muted-foreground mb-1 block">Tipo</Label>
          <Select value={field.field_type} onValueChange={(v) => onUpdate(field.id, { field_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 flex items-center justify-end gap-2 pt-6">
          <Switch checked={field.is_required} onCheckedChange={(c) => onUpdate(field.id, { is_required: c })} />
          <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(field.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      </div>
      {field.field_type === 'select' && (
        <div className="p-4 bg-muted/30 rounded border border-dashed mt-2">
          <div className="flex gap-2 mb-2">
            <Input value={newOptionText} onChange={(e) => setNewOptionText(e.target.value)} placeholder="Nova opção..." />
            <Button type="button" size="sm" onClick={handleAddOption} disabled={!newOptionText}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {field.options?.map((opt: any, i: number) => (
              <span key={i} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full flex items-center gap-1">
                {opt.label} <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveOption(i)} />
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ESTA É A LINHA QUE O ERRO DIZ QUE FALTA:
export default function EditModule() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (id) loadModule(); }, [id]);

  const loadModule = async () => {
    try {
      const { data: mod } = await supabase.from('crud_modules').select('*').eq('id', id).single();
      if (!mod) throw new Error("Módulo não encontrado");
      setName(mod.name);
      setDescription(mod.description || '');

      const { data: flds } = await supabase.from('crud_fields').select('*').eq('crud_module_id', id).order('order_index');
      setFields((flds || []).map(f => ({
        ...f,
        options: f.options ? (typeof f.options === 'string' ? JSON.parse(f.options) : f.options) : [],
        isNew: false
      })));
    } catch (e) {
      toast.error('Erro ao carregar');
      navigate('/modulos');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await supabase.from('crud_modules').update({ name, description }).eq('id', id);
      
      // Lógica simplificada de atualização de campos
      for (const f of fields) {
        const fieldData = {
          crud_module_id: id,
          name: f.name || f.label.toLowerCase().replace(/[^a-z0-9_]/g, ''),
          label: f.label,
          field_type: f.field_type,
          is_required: f.is_required,
          options: f.options,
          order_index: 0 // Simplificado
        };

        if (f.isNew) {
          await supabase.from('crud_fields').insert(fieldData);
        } else {
          await supabase.from('crud_fields').update(fieldData).eq('id', f.id);
        }
      }
      toast.success('Salvo com sucesso!');
      navigate('/modulos');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Layout>Carregando...</Layout>;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto pb-20">
        <Button variant="ghost" onClick={() => navigate('/modulos')} className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
        <h1 className="text-3xl font-bold mb-8">Editar Módulo</h1>
        
        <form onSubmit={handleSave} className="space-y-6">
          <div className="p-6 border rounded-xl bg-card space-y-4">
            <div><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
            <div><Label>Descrição</Label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between">
              <h3 className="text-lg font-bold">Campos</h3>
              <Button type="button" onClick={() => setFields([...fields, { id: crypto.randomUUID(), isNew: true, field_type: 'text', options: [] }])}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar
              </Button>
            </div>
            {fields.map((f, i) => (
              <FieldRow 
                key={f.id || i} 
                field={f} 
                onUpdate={(id: string, data: any) => setFields(fields.map(field => field.id === id ? { ...field, ...data } : field))}
                onRemove={(id: string) => setFields(fields.filter(field => field.id !== id))}
              />
            ))}
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 border-t flex justify-end lg:pl-80">
            <Button type="submit" className="btn-gradient-primary"><Save className="mr-2 h-4 w-4" /> Salvar</Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}