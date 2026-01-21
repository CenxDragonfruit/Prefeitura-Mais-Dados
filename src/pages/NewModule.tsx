import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, Trash2, CheckSquare, ArrowLeft, Type, Calendar, Hash, Mail, 
  Phone, DollarSign, List, FileText, X, GripVertical,
  Table as TableIcon, Upload, ArrowRight, FileSpreadsheet, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const QUESTION_TYPES = [
  { id: 'text', label: 'Texto Curto', icon: Type, color: 'bg-blue-100 text-blue-600', badge: 'bg-blue-600 text-white', desc: 'Nome, Cidade, Cargo' },
  { id: 'textarea', label: 'Texto Longo', icon: FileText, color: 'bg-indigo-100 text-indigo-600', badge: 'bg-indigo-600 text-white', desc: 'Observações, Detalhes' },
  { id: 'number', label: 'Número', icon: Hash, color: 'bg-emerald-100 text-emerald-600', badge: 'bg-emerald-600 text-white', desc: 'Idade, Quantidade' },
  { id: 'date', label: 'Data', icon: Calendar, color: 'bg-orange-100 text-orange-600', badge: 'bg-orange-600 text-white', desc: 'Data de Nasc., Agendamento' },
  { id: 'email', label: 'E-mail', icon: Mail, color: 'bg-purple-100 text-purple-600', badge: 'bg-purple-600 text-white', desc: 'Contato digital' },
  { id: 'phone', label: 'Telefone', icon: Phone, color: 'bg-green-100 text-green-600', badge: 'bg-green-600 text-white', desc: 'Celular, WhatsApp' },
  { id: 'cpf', label: 'CPF', icon: CheckSquare, color: 'bg-slate-100 text-slate-600', badge: 'bg-slate-600 text-white', desc: 'Documento Pessoal' },
  { id: 'currency', label: 'Valor (R$)', icon: DollarSign, color: 'bg-yellow-100 text-yellow-700', badge: 'bg-yellow-600 text-white', desc: 'Orçamentos, Preços' },
  { id: 'select', label: 'Lista de Opções', icon: List, color: 'bg-rose-100 text-rose-600', badge: 'bg-rose-600 text-white', desc: 'Seleção única (Ex: Sim/Não)' },
];

export default function NewModule() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  // Agora as tabelas guardam também as "rows" (dados do CSV)
  const [tables, setTables] = useState([
    { id: crypto.randomUUID(), name: 'Tabela Principal', fields: [] as any[], rows: [] as any[] }
  ]);
  const [activeTableId, setActiveTableId] = useState(tables[0].id);

  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvData, setCsvData] = useState<{ headers: string[], rows: any[], filename: string } | null>(null);
  const [importMode, setImportMode] = useState<'create' | 'update'>('create');
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [columnConfigs, setColumnConfigs] = useState<Record<string, { type: string, extractOptions: boolean }>>({});

  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const activeTable = tables.find(t => t.id === activeTableId) || tables[0];

  // Função auxiliar para criar nome de banco seguro
  const generateDbName = (label: string) => 
    label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '_');

  const addTable = (tableName = `Nova Tabela ${tables.length + 1}`, initialFields: any[] = [], initialRows: any[] = []) => {
    const newId = crypto.randomUUID();
    setTables([...tables, { id: newId, name: tableName, fields: initialFields, rows: initialRows }]);
    setActiveTableId(newId);
    return newId;
  };

  const removeTable = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tables.length === 1) return toast.error("O módulo precisa de pelo menos uma tabela.");
    const newTables = tables.filter(t => t.id !== id);
    setTables(newTables);
    if (activeTableId === id) setActiveTableId(newTables[0].id);
  };

  const renameActiveTable = (newName: string) => {
    setTables(tables.map(t => t.id === activeTableId ? { ...t, name: newName } : t));
  };

  const addField = (typeId: string, label = '') => {
    const newField = {
      id: crypto.randomUUID(),
      type: typeId,
      label: label,
      required: false,
      options: [],
    };
    setTables(prev => prev.map(t => t.id === activeTableId ? { ...t, fields: [...t.fields, newField] } : t));
    return newField.id;
  };

  const updateField = (id: string, key: string, value: any) => {
    setTables(tables.map(t => t.id === activeTableId ? { ...t, fields: t.fields.map(f => f.id === id ? { ...f, [key]: value } : f) } : t));
  };

  const removeField = (id: string) => {
    setTables(tables.map(t => t.id === activeTableId ? { ...t, fields: t.fields.filter(f => f.id !== id) } : t));
  };

  const handleReorder = (newOrder: any[]) => {
    setTables(tables.map(t => t.id === activeTableId ? { ...t, fields: newOrder } : t));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length > 0) {
        const headers = lines[0].split(',').map(h => h.trim().replace(/['"]+/g, ''));
        const rows = lines.slice(1).map(line => {
            const values = line.split(',');
            const row: Record<string, string> = {};
            headers.forEach((h, i) => {
                row[h] = values[i] ? values[i].trim().replace(/['"]+/g, '') : '';
            });
            return row;
        });

        setCsvData({ headers, rows, filename: file.name.replace('.csv', '') });
        
        const initialMap: Record<string, string> = {};
        const initialConfigs: Record<string, { type: string, extractOptions: boolean }> = {};

        headers.forEach(h => {
          const existing = activeTable.fields.find(f => f.label.toLowerCase() === h.toLowerCase());
          initialMap[h] = existing ? existing.id : 'new';
          initialConfigs[h] = { type: 'text', extractOptions: false };
        });

        setColumnMapping(initialMap);
        setColumnConfigs(initialConfigs);
        setCsvModalOpen(true);
      } else {
        toast.error("Arquivo vazio ou inválido.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const extractUniqueOptions = (headerName: string) => {
    if (!csvData) return [];
    const uniqueValues = new Set<string>();
    csvData.rows.forEach(row => {
        const val = row[headerName];
        if (val) uniqueValues.add(val);
    });
    return Array.from(uniqueValues).slice(0, 50).map(val => ({
        label: val,
        value: val.toLowerCase().replace(/[^a-z0-9]/g, '_')
    }));
  };

  const processCsvImport = () => {
    if (!csvData) return;

    const newFieldsList = importMode === 'update' ? [...activeTable.fields] : [];
    // Mapa para saber qual header do CSV vai para qual FieldID
    const headerToFieldId: Record<string, string> = {};
    let addedCount = 0;

    csvData.headers.forEach(header => {
      const action = importMode === 'create' ? 'new' : columnMapping[header];
      if (action === 'ignore') return;

      if (action === 'new') {
        const config = columnConfigs[header];
        let options: any[] = [];
        if (config.type === 'select' && config.extractOptions) {
            options = extractUniqueOptions(header);
        }

        const newFieldId = crypto.randomUUID();
        const newField = {
          id: newFieldId,
          type: config.type || 'text',
          label: header,
          required: false,
          options: options,
        };
        newFieldsList.push(newField);
        headerToFieldId[header] = newFieldId;
        addedCount++;
      } else {
        // Mapeando para campo existente
        headerToFieldId[header] = action;
      }
    });

    // Processar as linhas para formato interno (FieldID -> Valor)
    const processedRows = csvData.rows.map(row => {
        const rowData: any = {};
        Object.keys(row).forEach(header => {
            const fieldId = headerToFieldId[header];
            if (fieldId) {
                rowData[fieldId] = row[header];
            }
        });
        return rowData;
    });

    if (importMode === 'create') {
        // Cria tabela com campos E DADOS
        addTable(csvData.filename, newFieldsList, processedRows);
        toast.success(`Tabela criada com ${addedCount} colunas e ${processedRows.length} registros.`);
    } else {
        // Atualiza campos e adiciona novos dados
        setTables(prev => prev.map(t => t.id === activeTableId ? { 
            ...t, 
            fields: newFieldsList,
            rows: [...t.rows, ...processedRows] 
        } : t));
        toast.success(`${addedCount} novos campos e ${processedRows.length} registros importados.`);
    }

    setCsvModalOpen(false);
    setCsvData(null);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Dê um nome ao seu formulário!"); return; }
    if (tables.some(t => t.fields.length === 0)) { toast.error("Existem tabelas vazias."); return; }

    setLoading(true);
    try {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') + `-${randomSuffix}`;

      // 1. Cria o Módulo
      const { data: module, error } = await supabase.from('crud_modules')
        .insert({ name, description, slug, created_by: user?.id, is_active: true }).select().single();
      if (error) throw error;
      
      // 2. Loop pelas Tabelas
      for (const table of tables) {
          // 2.1 Cria Tabela
          const { data: dbTable, error: tError } = await supabase.from('crud_tables')
            .insert({ 
                crud_module_id: module.id, 
                name: table.name,
                db_table_name: generateDbName(table.name)
            }).select().single();
          if (tError) throw tError;

          // 2.2 Cria Campos
          // Precisamos guardar o mapeamento FieldId -> DbName para inserir os dados depois
          const fieldIdToDbName: Record<string, string> = {};

          const fieldsToInsert = table.fields.map((f, i) => {
            const dbName = generateDbName(f.label);
            fieldIdToDbName[f.id] = dbName;
            
            return {
                crud_table_id: dbTable.id,
                name: dbName,
                label: f.label,
                field_type: f.type,
                is_required: f.required,
                options: f.options?.length ? JSON.stringify(f.options) : null,
                order_index: i
            };
          });

          if (fieldsToInsert.length > 0) {
            const { error: fError } = await supabase.from('crud_fields').insert(fieldsToInsert);
            if (fError) throw fError;
          }

          // 2.3 Insere os Dados (Registros) do CSV
          if (table.rows && table.rows.length > 0) {
              const recordsToInsert = table.rows.map(row => {
                  const recordData: any = {};
                  // row é keyed pelo FieldID. Traduzimos para DbName
                  Object.keys(row).forEach(fieldId => {
                      const dbName = fieldIdToDbName[fieldId];
                      if (dbName) {
                          recordData[dbName] = row[fieldId];
                      }
                  });
                  return {
                      crud_table_id: dbTable.id,
                      data: recordData,
                      created_by: user?.id,
                      status: 'pending' // ou 'approved' se preferir
                  };
              });

              // Inserção em lotes para evitar timeout/limites
              const BATCH_SIZE = 100;
              for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
                  const batch = recordsToInsert.slice(i, i + BATCH_SIZE);
                  const { error: rError } = await supabase.from('crud_records').insert(batch);
                  if (rError) console.error("Erro ao inserir lote de dados:", rError);
              }
          }
      }

      toast.success("Sistema e dados importados com sucesso!");
      navigate('/modulos');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao salvar sistema");
    } finally {
      setLoading(false);
    }
  };

  // ... (Resto do JSX permanece igual, apenas o botão de importação no modal agora cita 'e registros')
  // Vou abreviar o JSX para focar na lógica alterada acima. 
  // O JSX do retorno é o mesmo do arquivo anterior, apenas o handleSave e processCsvImport mudaram.
  return (
    <div className="max-w-5xl mx-auto pb-32 animate-in fade-in duration-500 relative">
      {/* ... (Modal CSV igual) ... */}
      {csvModalOpen && csvData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <FileSpreadsheet className="text-green-600" /> Configurar Importação
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Arquivo: <span className="font-mono text-slate-700 bg-slate-100 px-1 rounded">{csvData.filename}.csv</span> ({csvData.rows.length} linhas)
                </p>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setImportMode('create')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${importMode === 'create' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Criar Nova Tabela</button>
                <button onClick={() => setImportMode('update')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${importMode === 'update' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Unir à Tabela Atual</button>
              </div>
            </div>
            
            <div className="p-0 overflow-y-auto flex-1 bg-slate-50/50">
                <div className="grid grid-cols-[1fr_2fr_2fr] gap-4 px-6 py-3 bg-slate-100 text-xs font-bold text-slate-600 border-b sticky top-0 z-10">
                    <div>COLUNA NO CSV</div>
                    <div>DESTINO NO SISTEMA</div>
                    <div>CONFIGURAÇÃO</div>
                </div>
                <div className="divide-y divide-slate-100">
                    {csvData.headers.map((header, idx) => {
                        const action = columnMapping[header];
                        const config = columnConfigs[header];
                        return (
                            <div key={idx} className="grid grid-cols-[1fr_2fr_2fr] gap-4 px-6 py-4 items-start bg-white hover:bg-slate-50 transition-colors">
                                <div><div className="text-sm font-bold text-slate-700 truncate" title={header}>{header}</div><div className="text-[10px] text-slate-400 mt-1 truncate">Ex: {csvData.rows[0]?.[header] || '(vazio)'}</div></div>
                                <div className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-slate-300 flex-shrink-0" />{importMode === 'create' ? (<span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100">Será criado novo campo</span>) : (<select className="w-full text-sm border-slate-200 rounded-md py-1.5 focus:ring-blue-500 focus:border-blue-500" value={action} onChange={(e) => setColumnMapping(prev => ({ ...prev, [header]: e.target.value }))}><option value="new" className="text-green-600 font-bold">+ Criar Novo Campo</option><option value="ignore" className="text-slate-400">-- Ignorar Coluna --</option><optgroup label="Campos Existentes">{activeTable.fields.map(f => (<option key={f.id} value={f.id}>{f.label || '(Sem título)'}</option>))}</optgroup></select>)}</div>
                                <div>{(importMode === 'create' || action === 'new') ? (<div className="space-y-2 animate-in fade-in"><div className="flex items-center gap-2"><Label className="text-[10px] uppercase text-slate-400 w-12">Tipo:</Label><select className="flex-1 text-sm border-slate-200 rounded-md py-1.5" value={config.type} onChange={(e) => setColumnConfigs(prev => ({ ...prev, [header]: { ...prev[header], type: e.target.value } }))}>{QUESTION_TYPES.map(t => (<option key={t.id} value={t.id}>{t.label}</option>))}</select></div>{config.type === 'select' && (<div className="flex items-center gap-2 pl-[3.5rem]"><input type="checkbox" id={`extract-${idx}`} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={config.extractOptions} onChange={(e) => setColumnConfigs(prev => ({ ...prev, [header]: { ...prev[header], extractOptions: e.target.checked } }))}/><label htmlFor={`extract-${idx}`} className="text-xs text-slate-600 cursor-pointer select-none">Importar opções do CSV</label></div>)}</div>) : (action !== 'ignore' && <span className="text-xs text-slate-400 italic">Usando configuração atual do campo</span>)}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="p-6 border-t bg-slate-50 rounded-b-xl flex justify-end gap-3">
              <Button variant="ghost" onClick={() => { setCsvModalOpen(false); setCsvData(null); }}>Cancelar</Button>
              <Button onClick={processCsvImport} className="bg-[#003B8F] hover:bg-blue-800"><CheckSquare className="mr-2 h-4 w-4" /> Importar Estrutura e Dados</Button>
            </div>
          </div>
        </div>
      )}

      {/* Header Fixo */}
      <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur border-b py-4 mb-8">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/modulos')} className="text-slate-500 hover:text-[#003B8F]">
            <ArrowLeft className="mr-2 h-4 w-4" /> Cancelar
          </Button>
          <div className="flex gap-2">
            <div className={`h-2 w-12 rounded-full transition-colors ${step === 1 ? 'bg-[#003B8F]' : 'bg-green-500'}`} />
            <div className={`h-2 w-12 rounded-full transition-colors ${step === 2 ? 'bg-[#003B8F]' : 'bg-slate-200'}`} />
          </div>
          {step === 2 && (
            <Button onClick={handleSave} disabled={loading} className="bg-[#22C55E] hover:bg-green-600 text-white shadow-md shadow-green-200">
              {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckSquare className="mr-2 h-4 w-4" />}
              {loading ? 'Salvando...' : 'Publicar Sistema'}
            </Button>
          )}
        </div>
      </div>
      
      {/* ... Resto do Layout (Steps 1 e 2) igual ao anterior ... */}
      <div className="space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#003B8F]">{step === 1 ? 'Vamos começar!' : 'Estrutura de Dados'}</h1>
          <p className="text-slate-500">{step === 1 ? 'Identifique seu novo sistema.' : 'Crie tabelas e adicione colunas.'}</p>
        </div>

        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold text-slate-700">Qual o nome do sistema?</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Gestão de Projetos..." className="text-lg h-12" autoFocus />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold text-slate-700">Descrição curta</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Objetivo do sistema..." className="resize-none" />
              </div>
              <Button onClick={() => { if(!name.trim()) return toast.error("Nome é obrigatório"); setStep(2); }} className="w-full h-12 text-lg bg-[#003B8F] hover:bg-blue-800">
                Continuar <ArrowLeft className="ml-2 h-5 w-5 rotate-180" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <div className="grid lg:grid-cols-[300px_1fr] gap-8 items-start">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-24">
              <h3 className="font-bold text-slate-700 mb-4 px-2">Tipos de Coluna</h3>
              <div className="grid grid-cols-1 gap-2">
                {QUESTION_TYPES.map(type => (
                  <button key={type.id} onClick={() => addField(type.id)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-left group">
                    <div className={`p-2 rounded-md ${type.color} group-hover:scale-110 transition-transform`}><type.icon className="h-4 w-4" /></div>
                    <div><p className="text-sm font-medium text-slate-700">{type.label}</p><p className="text-[10px] text-slate-400 leading-tight">{type.desc}</p></div>
                    <Plus className="h-4 w-4 ml-auto text-slate-300 opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6 min-h-[500px]">
              <div className="flex flex-col gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between px-2 pt-1">
                    <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                        <TableIcon className="h-3 w-3"/> Tabelas do Módulo
                    </span>
                    <div className="flex gap-2">
                        <input type="file" ref={fileInputRef} accept=".csv" className="hidden" onChange={handleFileUpload} />
                        <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="h-6 text-xs border-green-200 hover:bg-green-50 text-green-700">
                            <Upload className="h-3 w-3 mr-1" /> Importar CSV
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => addTable()} className="h-6 text-xs text-[#003B8F] hover:bg-blue-50">
                            <Plus className="h-3 w-3 mr-1" /> Nova Tabela
                        </Button>
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-2 px-1">
                    {tables.map(table => (
                        <div key={table.id} onClick={() => setActiveTableId(table.id)} className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-medium border transition-all flex items-center gap-2 select-none ${activeTableId === table.id ? 'bg-[#003B8F] text-white border-[#003B8F] shadow-md' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                            {table.name}
                            {tables.length > 1 && <div onClick={(e) => removeTable(table.id, e)} className="hover:bg-white/20 p-0.5 rounded-full ml-1"><X className="h-3 w-3" /></div>}
                        </div>
                    ))}
                </div>
                <div className="border-t pt-2 px-1">
                    <Input value={activeTable.name} onChange={(e) => renameActiveTable(e.target.value)} className="h-8 border-transparent hover:border-slate-200 focus:border-[#003B8F] font-bold text-slate-700 px-2" placeholder="Nome da Tabela" />
                </div>
              </div>

              {activeTable.fields.length === 0 ? (
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center bg-slate-50/50">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm"><List className="h-8 w-8 text-slate-300" /></div>
                  <h3 className="text-lg font-medium text-slate-600">Tabela Vazia</h3>
                  <p className="text-slate-400">Adicione colunas manualmente ou importe um CSV.</p>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="mt-4"><Upload className="h-4 w-4 mr-2" /> Carregar CSV</Button>
                </div>
              ) : (
                <Reorder.Group axis="y" values={activeTable.fields} onReorder={handleReorder} className="space-y-4">
                  <AnimatePresence>
                    {activeTable.fields.map((field) => {
                      const typeDef = QUESTION_TYPES.find(t => t.id === field.type);
                      return (
                        <Reorder.Item key={field.id} value={field} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm group hover:border-blue-300 transition-colors relative">
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl bg-slate-200 group-hover:bg-[#003B8F] transition-colors" />
                          <div className="flex items-start gap-4 pl-4">
                            <div className="mt-3 text-slate-300 cursor-grab active:cursor-grabbing hover:text-[#003B8F]"><GripVertical className="h-5 w-5" /></div>
                            <div className="flex-1 space-y-4">
                              <div className="flex justify-between items-start">
                                <div className="space-y-1 flex-1 mr-4">
                                  {typeDef && (
                                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold mb-1 ${typeDef.badge}`}>
                                        <typeDef.icon className="h-3 w-3" /> {typeDef.label}
                                    </div>
                                  )}
                                  <Input value={field.label} onChange={e => updateField(field.id, 'label', e.target.value)} placeholder={`Dê um nome para esta coluna...`} className="text-lg font-medium border-0 border-b-2 border-slate-100 rounded-none px-0 focus-visible:ring-0 focus-visible:border-[#003B8F] bg-transparent" />
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => removeField(field.id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50"><Trash2 className="h-5 w-5" /></Button>
                              </div>
                              {field.type === 'select' && (
                                <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                                  <p className="text-xs font-bold text-slate-500 uppercase">Opções ({field.options?.length || 0})</p>
                                  <div className="flex flex-wrap gap-2">
                                    {field.options?.map((opt: any, i: number) => (
                                      <span key={i} className="bg-white border px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                        {opt.label} <X className="h-3 w-3 cursor-pointer text-slate-400 hover:text-red-500" onClick={() => { const newOpts = field.options.filter((_: any, idx: number) => idx !== i); updateField(field.id, 'options', newOpts); }}/>
                                      </span>
                                    ))}
                                  </div>
                                  <div className="flex gap-2">
                                    <Input id={`opt-${field.id}`} placeholder="Nova opção..." className="bg-white h-9" onKeyDown={e => { if(e.key === 'Enter') { const val = (e.currentTarget as HTMLInputElement).value.trim(); if(val) { const slug = val.toLowerCase().replace(/[^a-z0-9]/g, '_'); updateField(field.id, 'options', [...(field.options||[]), { label: val, value: slug }]); (e.currentTarget as HTMLInputElement).value = ''; } e.preventDefault(); } }}/>
                                    <Button size="sm" variant="secondary" onClick={() => { const input = document.getElementById(`opt-${field.id}`) as HTMLInputElement; if(input && input.value.trim()) { const val = input.value.trim(); const slug = val.toLowerCase().replace(/[^a-z0-9]/g, '_'); updateField(field.id, 'options', [...(field.options||[]), { label: val, value: slug }]); input.value = ''; } }}>Adicionar</Button>
                                  </div>
                                </div>
                              )}
                              <div className="flex items-center gap-2 pt-2"><Switch checked={field.required} onCheckedChange={c => updateField(field.id, 'required', c)} /><span className="text-sm text-slate-600">Preenchimento Obrigatório?</span></div>
                            </div>
                          </div>
                        </Reorder.Item>
                      );
                    })}
                  </AnimatePresence>
                </Reorder.Group>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}