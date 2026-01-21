import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Plus, ArrowLeft, Search, Pencil, Trash2, Loader2, AlertCircle, FileDown, FileUp, Table as TableIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Função para limpar sujeira do CSV
const cleanText = (txt: string) => txt ? txt.replace(/^['"]+|['"]+$/g, '').replace(/[\r\n]+/g, '').trim() : '';

export default function CrudPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Estados do Sistema
  const [module, setModule] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [activeTable, setActiveTable] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de Interface
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [editRecordId, setEditRecordId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Estados de Importação / Exportação
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportSelectedFields, setExportSelectedFields] = useState<string[]>([]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importCsvData, setImportCsvData] = useState<{headers: string[], rows: any[]} | null>(null);
  const [importMapping, setImportMapping] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Carregar Sistema
  useEffect(() => { if (slug) loadSystem(); }, [slug]);

  const loadSystem = async () => {
    try {
      const { data: mod, error } = await supabase.from('crud_modules').select('*').eq('slug', slug).single();
      if (error || !mod) { 
          toast.error("Sistema não encontrado."); 
          navigate('/modulos'); 
          return; 
      }
      setModule(mod);
      const { data: tabs } = await supabase.from('crud_tables').select('*').eq('crud_module_id', mod.id).order('created_at');
      setTables(tabs || []);
      if (tabs && tabs.length > 0) setActiveTable(tabs[0]); 
      else setLoading(false);
    } catch (e) { console.error(e); setLoading(false); }
  };

  // 2. Carregar Dados da Tabela
  useEffect(() => { if (activeTable) loadTableData(); }, [activeTable]);

  const loadTableData = async () => {
    setLoading(true);
    try {
        const { data: flds } = await supabase.from('crud_fields').select('*').eq('crud_table_id', activeTable.id).order('order_index');
        const safeFields = (flds || []).map(f => {
            let safeOptions = [];
            if (Array.isArray(f.options)) safeOptions = f.options;
            else if (typeof f.options === 'string') { try { safeOptions = JSON.parse(f.options); } catch (e) { safeOptions = []; } }
            return { ...f, options: safeOptions };
        });
        setFields(safeFields);
        setExportSelectedFields(safeFields.map(f => f.name));

        const { data: recs } = await supabase.from('crud_records').select('*').eq('crud_table_id', activeTable.id).order('created_at', { ascending: false });
        setRecords(recs || []);
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  // --- IMPORTAÇÃO CSV (COM A MÁGICA DO BATCH_ID) ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      
      reader.onload = (event) => {
          const text = event.target?.result as string;
          const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
          
          if(lines.length < 2) return toast.error("Arquivo inválido.");
          
          const headers = lines[0].split(',').map(h => cleanText(h));
          const rows = lines.slice(1).map(line => {
             const values = line.split(','); 
             const row:any = {};
             headers.forEach((h, i) => row[h] = values[i] ? cleanText(values[i]) : '');
             return row;
          });
          
          setImportCsvData({ headers, rows });
          
          // Auto-mapeamento
          const initialMap: Record<string, string> = {};
          headers.forEach(h => {
              const exactMatch = fields.find(f => f.label.toLowerCase() === h.toLowerCase() || f.name.toLowerCase() === h.toLowerCase());
              initialMap[h] = exactMatch ? exactMatch.name : 'ignore';
          });
          setImportMapping(initialMap);
          setImportModalOpen(true);
      };
      reader.readAsText(file);
      if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const processImport = async () => {
      if(!importCsvData) return;
      setSaving(true);
      try {
          // --- AQUI ESTÁ O SEGREDO: CRIAR UM ID ÚNICO PARA O LOTE ---
          const batchId = crypto.randomUUID(); 

          const newRecords = importCsvData.rows.map(csvRow => {
              const recordData: any = {};
              let hasData = false;
              
              Object.keys(importMapping).forEach(csvHeader => {
                  const targetFieldKey = importMapping[csvHeader];
                  if(targetFieldKey && targetFieldKey !== 'ignore') {
                      const value = csvRow[csvHeader];
                      if(value) {
                          recordData[targetFieldKey] = value;
                          hasData = true;
                      }
                  }
              });
              
              if (!hasData) return null;

              // --- INJETA O BATCH_ID NOS DADOS ---
              // Isso permite que a página de Aprovações agrupe estes registros
              recordData['_batch_id'] = batchId; 

              return {
                  crud_table_id: activeTable.id,
                  data: recordData,
                  created_by: user?.id,
                  status: 'pending'
              };
          }).filter(Boolean);

          if (newRecords.length === 0) throw new Error("Nenhum dado válido mapeado.");

          // Insere em pedaços de 50 para não travar
          const BATCH_SIZE = 50;
          for(let i=0; i<newRecords.length; i+=BATCH_SIZE) {
              const { error } = await supabase.from('crud_records').insert(newRecords.slice(i, i+BATCH_SIZE));
              if (error) throw error;
          }
          
          toast.success(`${newRecords.length} registros importados em lote!`);
          await loadTableData();
          setImportModalOpen(false);
          setImportCsvData(null);
      } catch(e:any) { 
          toast.error("Erro: " + e.message); 
      } finally { setSaving(false); }
  };

  // --- EXPORTAÇÃO ---
  const handleExportClick = () => {
      setExportSelectedFields(fields.map(f => f.name));
      setExportModalOpen(true);
  };

  const processExport = () => {
    if (filteredRecords.length === 0) { toast.warning("Nada para exportar."); return; }
    const activeFields = fields.filter(f => exportSelectedFields.includes(f.name));
    
    const headers = ['ID', 'Status', 'Data', ...activeFields.map(f => f.label)];
    const rows = filteredRecords.map(r => {
      const statusLabel = r.status === 'approved' ? 'Aprovado' : r.status === 'rejected' ? 'Negado' : 'Pendente';
      const dataCells = activeFields.map(f => {
        let val = r.data[f.name] || '';
        if (typeof val === 'string') { val = val.replace(/"/g, '""'); if (val.includes(',') || val.includes('\n')) val = `"${val}"`; }
        return val;
      });
      return [r.id, statusLabel, new Date(r.created_at).toLocaleDateString('pt-BR'), ...dataCells].join(',');
    });
    
    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    link.download = `${module.name}_${activeTable.name}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    setExportModalOpen(false);
  };

  // --- FORMULÁRIO MANUAL (SEM BATCH_ID) ---
  const validateForm = () => {
    const errors: string[] = [];
    fields.forEach(f => {
      const val = formData[f.name];
      if (f.is_required && (!val || val.toString().trim() === '')) errors.push(`"${f.label}" é obrigatório.`);
    });
    return errors;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm();
    if (errors.length > 0) { setValidationErrors(errors); return; }
    setSaving(true);
    try {
      // Limpa qualquer batch_id que pudesse existir (garante individualidade)
      const cleanData = { ...formData };
      delete cleanData['_batch_id'];

      if (editRecordId) {
        await supabase.from('crud_records').update({ data: cleanData, status: 'pending' }).eq('id', editRecordId);
        toast.success('Atualizado!');
        setRecords(prev => prev.map(r => r.id === editRecordId ? { ...r, data: cleanData, status: 'pending' } : r));
      } else {
        const { data: newRec, error } = await supabase.from('crud_records').insert({ 
            crud_table_id: activeTable.id, 
            data: cleanData, // Sem batch_id = Validação Individual
            created_by: user?.id, 
            status: 'pending' 
        }).select().single();
        if (error) throw error;
        toast.success('Salvo!');
        setRecords(prev => [newRec, ...prev]);
      }
      setDialogOpen(false); setFormData({}); setEditRecordId(null);
    } catch (error: any) { toast.error("Erro: " + error.message); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Tem certeza?")) return;
    try {
      await supabase.from('crud_records').delete().eq('id', id);
      setRecords(prev => prev.filter(r => r.id !== id));
      toast.success("Removido.");
    } catch (e) { toast.error("Erro ao excluir."); }
  };

  const filteredRecords = records.filter(r => JSON.stringify(r.data).toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading && !module) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[#003B8F]" /></div>;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in pt-8">
      <Button variant="ghost" onClick={() => navigate('/modulos')} className="pl-0 text-slate-500 hover:text-[#003B8F]">
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
      </Button>

      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#003B8F] to-[#0055CC] rounded-2xl p-8 text-white shadow-lg flex flex-col md:flex-row justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-blue-200 text-sm font-medium uppercase mb-1">
             <span className="bg-white/20 px-2 py-0.5 rounded">Sistema</span> / <span>{activeTable?.name}</span>
          </div>
          <h1 className="text-3xl font-bold">{module?.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportClick} variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
            <FileDown className="mr-2 h-4 w-4" /> Exportar
          </Button>
          
          <input type="file" ref={fileInputRef} accept=".csv" className="hidden" onChange={handleFileSelect} />
          <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
            <FileUp className="mr-2 h-4 w-4" /> Importar CSV
          </Button>

          <Button onClick={() => { setFormData({}); setEditRecordId(null); setValidationErrors([]); setDialogOpen(true); }} className="bg-[#22C55E] hover:bg-green-500 text-white border-0 shadow-md">
            <Plus className="mr-2 h-4 w-4" /> Novo Registro
          </Button>
        </div>
      </div>

      {/* TABS DE TABELAS */}
      {tables.length > 1 && (
        <div className="flex gap-1 overflow-x-auto pb-1">
            {tables.map(t => (
                <button key={t.id} onClick={() => setActiveTable(t)}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-t-lg text-sm font-bold transition-all border-b-2 ${activeTable?.id === t.id ? 'bg-white text-[#003B8F] border-[#003B8F] shadow-sm' : 'bg-transparent text-slate-500 border-transparent hover:bg-white/50 hover:text-slate-700'}`}>
                    <TableIcon className="h-4 w-4" /> {t.name}
                </button>
            ))}
        </div>
      )}

      {/* TABELA DE DADOS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
           <div className="relative max-w-sm w-full">
             <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
             <Input placeholder={`Pesquisar...`} className="pl-10 bg-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
           </div>
           <span className="text-sm text-slate-500">{filteredRecords.length} registros</span>
        </div>
        
        <div className="overflow-x-auto">
          {fields.length === 0 ? (<div className="p-12 text-center text-slate-400">Sem campos definidos.</div>) : (
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px] font-bold text-[#003B8F]">Status</TableHead>
                    {fields.map(f => (
                    <TableHead key={f.id} className="min-w-[150px] font-bold text-slate-700 whitespace-nowrap">{f.label}</TableHead>
                    ))}
                    <TableHead className="text-right font-bold text-slate-700 sticky right-0 bg-slate-50">Ações</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredRecords.map((record) => (
                    <TableRow key={record.id} className="hover:bg-slate-50">
                    <TableCell>
                        <Badge className={
                            record.status === 'approved' ? 'bg-green-100 text-green-700' : 
                            record.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                        }>
                            {record.status === 'approved' ? 'Aprovado' : record.status === 'rejected' ? 'Negado' : 'Análise'}
                        </Badge>
                    </TableCell>
                    {fields.map(f => (<TableCell key={f.id} className="truncate max-w-[200px]">{record.data[f.name] || '-'}</TableCell>))}
                    <TableCell className="text-right sticky right-0 bg-white/90 backdrop-blur-sm">
                        <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setFormData(record.data); setEditRecordId(record.id); setDialogOpen(true); }}><Pencil className="h-4 w-4 text-blue-600" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(record.id)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
                        </div>
                    </TableCell>
                    </TableRow>
                ))}
                {filteredRecords.length === 0 && <TableRow><TableCell colSpan={fields.length + 2} className="h-32 text-center text-slate-400">Nenhum registro encontrado.</TableCell></TableRow>}
                </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* MODAL FORMULÁRIO (MANUAL) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editRecordId ? 'Editar' : 'Novo Registro Manual'}</DialogTitle></DialogHeader>
          {validationErrors.length > 0 && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Erro</AlertTitle><AlertDescription>{validationErrors[0]}</AlertDescription></Alert>}
          <form onSubmit={handleSave} className="space-y-4 pt-4">
             <div className="grid gap-4 md:grid-cols-2">
               {fields.map(f => (
                 <div key={f.id} className={f.field_type === 'textarea' ? 'col-span-2' : ''}>
                    <Label className="text-slate-700 font-medium">{f.label} {f.is_required && <span className="text-red-500">*</span>}</Label>
                    {f.field_type === 'textarea' ? <Textarea value={formData[f.name]||''} onChange={e=>setFormData({...formData, [f.name]:e.target.value})} className="mt-1" /> :
                     f.field_type === 'select' ? 
                      <Select value={formData[f.name] || ''} onValueChange={v => setFormData({ ...formData, [f.name]: v })}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>{f.options?.map((opt: any, i: number) => <SelectItem key={i} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                      </Select> : <Input type={f.field_type} value={formData[f.name]||''} onChange={e=>setFormData({...formData, [f.name]:e.target.value})} className="mt-1" />}
                 </div>
               ))}
             </div>
             <Button type="submit" className="w-full bg-[#22C55E]" disabled={saving}>Salvar Registro</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL EXPORTAR */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Exportar</DialogTitle><DialogDescription>Selecione as colunas.</DialogDescription></DialogHeader>
            <div className="py-4 space-y-2 max-h-[60vh] overflow-y-auto border rounded p-2">
                <div className="flex items-center space-x-2 p-2 bg-slate-100 rounded">
                    <Checkbox id="select-all" 
                        checked={exportSelectedFields.length === fields.length}
                        onCheckedChange={(c) => c ? setExportSelectedFields(fields.map(f => f.name)) : setExportSelectedFields([])} />
                    <label htmlFor="select-all" className="font-bold cursor-pointer">Tudo</label>
                </div>
                {fields.map(f => (
                    <div key={f.id} className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded">
                        <Checkbox id={`exp-${f.id}`} checked={exportSelectedFields.includes(f.name)} 
                            onCheckedChange={(c) => {
                                if(c) setExportSelectedFields([...exportSelectedFields, f.name]);
                                else setExportSelectedFields(exportSelectedFields.filter(x => x !== f.name));
                            }} />
                        <label htmlFor={`exp-${f.id}`} className="text-sm cursor-pointer flex-1">{f.label}</label>
                    </div>
                ))}
            </div>
            <DialogFooter><Button onClick={processExport} className="w-full bg-[#003B8F]">Baixar CSV</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL IMPORTAR */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
            <DialogHeader><DialogTitle>Importar CSV</DialogTitle><DialogDescription>Mapeie as colunas.</DialogDescription></DialogHeader>
            <div className="flex-1 overflow-y-auto py-4">
                <div className="grid grid-cols-2 gap-4 font-bold text-xs text-slate-500 mb-2 px-2 bg-slate-50 py-2 rounded">
                    <div>COLUNA CSV</div><div>CAMPO SISTEMA</div>
                </div>
                {importCsvData?.headers.map((h, i) => (
                    <div key={i} className="grid grid-cols-2 gap-4 items-center p-2 border-b last:border-0 hover:bg-slate-50">
                        <div className="truncate font-medium text-sm" title={h}>{h}</div>
                        <Select value={importMapping[h] || 'ignore'} onValueChange={(v) => setImportMapping({...importMapping, [h]: v})}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ignore" className="text-slate-400 italic">-- Ignorar --</SelectItem>
                                {fields.map(f => <SelectItem key={f.id} value={f.name}>{f.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                ))}
            </div>
            <DialogFooter><Button onClick={processImport} disabled={saving} className="w-full bg-[#22C55E]">{saving ? 'Importando...' : `Confirmar (${importCsvData?.rows.length} itens)`}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}