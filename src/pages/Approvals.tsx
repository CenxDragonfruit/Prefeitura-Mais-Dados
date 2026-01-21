import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Clock, FileSpreadsheet, ChevronDown, ChevronUp, Loader2, PackageCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// --- TIPO PARA ORGANIZAR OS DADOS ---
type BatchGroup = {
  batchId: string;
  records: any[];
  moduleName: string;
  tableName: string;
  date: string;
};

export default function Approvals() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Listas separadas
  const [singles, setSingles] = useState<any[]>([]);
  const [batches, setBatches] = useState<BatchGroup[]>([]);

  // Controle de Modais
  const [rejectData, setRejectData] = useState<{ ids: string[], type: 'single' | 'batch' } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { fetchPending(); }, []);

  const fetchPending = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('crud_records')
      .select(`*, crud_tables (name, crud_modules (name))`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Erro ao carregar aprovações.");
    } else if (data) {
      organizeData(data);
    }
    setLoading(false);
  };

  // --- O SEGREDO DA SEPARAÇÃO ESTÁ AQUI ---
  const organizeData = (records: any[]) => {
    const singleList: any[] = [];
    const batchMap: Record<string, any[]> = {};

    records.forEach(r => {
      // Verifica se o registro tem a "marca" de lote
      const batchId = r.data?._batch_id; 

      if (batchId) {
        if (!batchMap[batchId]) batchMap[batchId] = [];
        batchMap[batchId].push(r);
      } else {
        singleList.push(r);
      }
    });

    // Transforma o Mapa em Array para facilitar o render
    const batchList: BatchGroup[] = Object.entries(batchMap).map(([bId, recs]) => ({
      batchId: bId,
      records: recs,
      moduleName: recs[0]?.crud_tables?.crud_modules?.name || 'Sistema',
      tableName: recs[0]?.crud_tables?.name || 'Tabela',
      date: recs[0]?.created_at
    }));

    setSingles(singleList);
    setBatches(batchList);
  };

  // --- APROVAÇÃO (USA RPC PARA PERFORMANCE) ---
  const handleApprove = async (ids: string[]) => {
    if (ids.length === 0) return;
    setProcessing(true);

    try {
      // Tenta usar RPC se existir, senão fallback para update normal
      const { error } = await supabase.rpc('approve_records', {
        p_record_ids: ids,
        p_user_id: user?.id
      });

      // Fallback caso a função RPC não tenha sido criada no banco
      if (error && error.message.includes('function not found')) {
         const { error: normalError } = await supabase.from('crud_records').update({ 
            status: 'approved', approved_by: user?.id, updated_at: new Date().toISOString() 
         }).in('id', ids);
         if (normalError) throw normalError;
      } else if (error) {
         throw error;
      }

      toast.success(`${ids.length} registro(s) aprovado(s)!`);
      fetchPending(); // Recarrega para limpar a tela
    } catch (e: any) { 
      toast.error("Erro ao aprovar: " + e.message);
    } finally {
      setProcessing(false);
    }
  };

  // --- REJEIÇÃO ---
  const handleRejectConfirm = async () => {
    if (!rejectReason.trim() || !rejectData) return;
    setProcessing(true);

    try {
      const { error } = await supabase.rpc('reject_records', {
        p_record_ids: rejectData.ids,
        p_user_id: user?.id,
        p_reason: rejectReason
      });

      // Fallback
      if (error && error.message.includes('function not found')) {
         const { error: normalError } = await supabase.from('crud_records').update({ 
            status: 'rejected', rejection_reason: rejectReason, approved_by: user?.id, updated_at: new Date().toISOString() 
         }).in('id', rejectData.ids);
         if (normalError) throw normalError;
      } else if (error) {
         throw error;
      }

      toast.success("Solicitação rejeitada.");
      setRejectData(null);
      setRejectReason('');
      fetchPending();
    } catch (e: any) { 
        toast.error("Erro ao rejeitar."); 
    } 
    finally { setProcessing(false); }
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-[#003B8F] h-8 w-8" /></div>;

  if (batches.length === 0 && singles.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-slate-50 rounded-xl border-dashed border-2 mx-4 mt-8">
      <PackageCheck className="h-16 w-16 mb-4 text-green-500 bg-green-100 p-3 rounded-full"/>
      <h3 className="text-xl font-semibold text-slate-700">Tudo em dia!</h3>
      <p>Você não tem aprovações pendentes no momento.</p>
    </div>
  );

  return (
    <div className="space-y-10 pb-20 animate-in fade-in pt-6">
      
      {/* --- SEÇÃO 1: LOTES DE IMPORTAÇÃO (CARD ÚNICO POR CSV) --- */}
      {batches.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="p-1.5 bg-purple-100 rounded text-purple-700"><FileSpreadsheet className="h-5 w-5" /></div>
            <div>
                <h2 className="text-lg font-bold text-slate-800 leading-none">Importações CSV Pendentes</h2>
                <p className="text-xs text-slate-500">Valide o arquivo inteiro de uma vez.</p>
            </div>
          </div>
          
          <div className="grid gap-6">
            {batches.map((batch) => (
              <BatchCard 
                key={batch.batchId} 
                batch={batch} 
                onApprove={() => handleApprove(batch.records.map(r => r.id))}
                onReject={() => setRejectData({ ids: batch.records.map(r => r.id), type: 'batch' })}
                disabled={processing}
              />
            ))}
          </div>
        </div>
      )}

      {batches.length > 0 && singles.length > 0 && <div className="border-t border-slate-200" />}

      {/* --- SEÇÃO 2: INDIVIDUAIS (CARD POR REGISTRO) --- */}
      {singles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="p-1.5 bg-yellow-100 rounded text-yellow-700"><Clock className="h-5 w-5" /></div>
            <div>
                <h2 className="text-lg font-bold text-slate-800 leading-none">Entradas Manuais</h2>
                <p className="text-xs text-slate-500">Valide cada registro individualmente.</p>
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {singles.map(record => (
              <SingleCard 
                key={record.id} 
                record={record} 
                onApprove={() => handleApprove([record.id])}
                onReject={() => setRejectData({ ids: [record.id], type: 'single' })}
                disabled={processing}
              />
            ))}
          </div>
        </div>
      )}

      {/* MODAL DE REJEIÇÃO */}
      <Dialog open={!!rejectData} onOpenChange={(open) => !open && setRejectData(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
                <X className="h-5 w-5 bg-red-100 p-0.5 rounded-full"/>
                {rejectData?.type === 'batch' ? 'Rejeitar Lote Inteiro' : 'Rejeitar Registro'}
            </DialogTitle>
            <DialogDescription>
              {rejectData?.type === 'batch' 
                ? `Você vai rejeitar ${rejectData.ids.length} linhas deste CSV. Elas não entrarão no sistema.` 
                : 'Este item será marcado como rejeitado.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium mb-2 block text-slate-700">Motivo:</label>
            <Textarea 
                value={rejectReason} 
                onChange={e => setRejectReason(e.target.value)} 
                placeholder="Ex: Dados inconsistentes..." 
                className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectData(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRejectConfirm} disabled={!rejectReason.trim() || processing}>
                {processing ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- COMPONENTE VISUAL: LOTE CSV (CARD ÚNICO GRANDE) ---
function BatchCard({ batch, onApprove, onReject, disabled }: { batch: BatchGroup, onApprove: any, onReject: any, disabled: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const count = batch.records.length;

  return (
    <Card className="border-l-4 border-l-purple-600 bg-white shadow-md transition-all hover:shadow-lg">
      <CardHeader className="py-5">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          
          {/* Informações do Lote */}
          <div className="space-y-1">
             <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-0 px-2 py-0.5 text-[10px]">
                   IMPORTAÇÃO CSV
                </Badge>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {batch.moduleName} / {batch.tableName}
                </span>
             </div>
             <CardTitle className="text-xl font-bold text-slate-800">
                 Lote com {count} registros
             </CardTitle>
             <CardDescription className="flex items-center gap-1 text-xs">
                 <Clock className="h-3 w-3" /> Recebido em {new Date(batch.date).toLocaleString('pt-BR')}
             </CardDescription>
          </div>
          
          {/* Botões de Ação do Lote */}
          <div className="flex items-center gap-3">
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={onReject} disabled={disabled}>
              <X className="h-4 w-4 mr-2" /> Rejeitar Tudo
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white shadow-md px-6" onClick={onApprove} disabled={disabled}>
              <Check className="h-4 w-4 mr-2" /> Aprovar Lote
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {/* Área Colapsável para ver o que tem dentro */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="px-6 pb-0 border-t border-slate-100 bg-slate-50/50">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full text-slate-500 hover:text-purple-700 hover:bg-purple-50 text-xs h-9 my-1">
              {isOpen ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
              {isOpen ? 'Recolher Amostra' : `Ver Amostra dos Dados (${count} linhas)`}
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <CardContent className="pt-2 pb-6 bg-slate-50/50">
            <div className="space-y-2">
              {batch.records.slice(0, 5).map((rec: any, idx) => (
                <div key={rec.id} className="text-xs bg-white p-3 border rounded shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4 opacity-90 hover:opacity-100">
                   {Object.entries(rec.data)
                     .filter(([k]) => k !== '_batch_id') // Esconde o ID técnico
                     .slice(0, 4) // Mostra só os primeiros 4 campos
                     .map(([k, v]) => (
                      <div key={k} className="flex flex-col overflow-hidden">
                          <span className="font-bold text-slate-400 text-[9px] uppercase truncate">{k.replace(/_/g, ' ')}</span>
                          <span className="text-slate-800 truncate font-medium">{String(v) || '-'}</span>
                      </div>
                   ))}
                </div>
              ))}
              {count > 5 && (
                  <div className="text-center py-2 text-xs text-slate-400 italic">
                      ... e mais {count - 5} linhas neste arquivo.
                  </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// --- COMPONENTE VISUAL: INDIVIDUAL (CARD PADRÃO) ---
function SingleCard({ record, onApprove, onReject, disabled }: any) {
  // Tenta achar um título amigável
  const dataEntries = Object.entries(record.data).filter(([k]) => k !== '_batch_id');
  const titleEntry = dataEntries.find(([k]) => /nome|titulo|assunto|desc/i.test(k)) || dataEntries[0];
  const title = titleEntry ? String(titleEntry[1]) : `Registro #${record.id.slice(0,4)}`;
  
  return (
    <Card className="border-l-4 border-l-yellow-400 flex flex-col h-full hover:shadow-md transition-all group bg-white">
      <CardHeader className="pb-3 pt-4">
        <div className="flex justify-between items-start mb-2">
          <Badge variant="outline" className="text-[10px] truncate max-w-[120px] bg-slate-50 text-slate-600 border-slate-200">
             {record.crud_tables?.name}
          </Badge>
          <span className="text-[10px] text-slate-400">{new Date(record.created_at).toLocaleDateString()}</span>
        </div>
        <CardTitle className="text-base font-bold truncate text-slate-800 leading-tight" title={title}>
            {title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 pb-2">
        <ScrollArea className="h-[100px] w-full bg-slate-50/50 rounded border p-3">
           <div className="space-y-2">
             {dataEntries.slice(0, 5).map(([k, v]) => (
               <div key={k} className="text-xs flex flex-col border-b border-dashed border-slate-200 last:border-0 pb-1 last:pb-0">
                 <span className="font-semibold text-slate-500 truncate uppercase text-[9px]">{k.replace(/_/g, ' ')}</span>
                 <span className="text-slate-800 break-words">{String(v) || '-'}</span>
               </div>
             ))}
           </div>
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="pt-3 pb-3 flex justify-between gap-2 border-t bg-slate-50/30">
         <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 hover:text-red-700 h-8 px-3 text-xs" onClick={onReject} disabled={disabled}>
            Rejeitar
         </Button>
         <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-8 px-4 text-xs font-bold shadow-sm" onClick={onApprove} disabled={disabled}>
            Aprovar
         </Button>
      </CardFooter>
    </Card>
  );
}