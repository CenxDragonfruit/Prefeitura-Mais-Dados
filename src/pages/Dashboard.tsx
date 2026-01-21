import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, Clock, CheckCircle2, LayoutGrid, ArrowUpRight, Activity, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, endOfDay, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, active_systems: 0, pending: 0, approved: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para o Filtro
  const [modulesList, setModulesList] = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>('all');

  // 1. Carregar lista de módulos para o Select
  useEffect(() => {
    const fetchModules = async () => {
      const { data } = await supabase.from('crud_modules').select('id, name').eq('is_active', true);
      setModulesList(data || []);
    };
    fetchModules();
  }, []);

  // 2. Carregar Dados do Dashboard (Sempre que mudar o filtro)
  useEffect(() => {
    fetchDashboardData();
  }, [selectedModule]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // --- BASE QUERY BUILDERS ---
      // Função auxiliar para aplicar o filtro de módulo se necessário
      const applyFilter = (query: any) => {
        if (selectedModule !== 'all') {
          // Usa !inner para forçar o join e permitir filtrar pela tabela relacionada
          return query.select('*, crud_tables!inner(crud_module_id)', { count: 'exact', head: true })
                      .eq('crud_tables.crud_module_id', selectedModule);
        }
        return query.select('*', { count: 'exact', head: true });
      };

      // 1. STATS: Contagens Totais
      const totalPromise = applyFilter(supabase.from('crud_records'));
      const pendingPromise = applyFilter(supabase.from('crud_records')).eq('status', 'pending');
      const approvedPromise = applyFilter(supabase.from('crud_records')).eq('status', 'approved');
      
      // Contagem de sistemas (se filtro estiver ativo, é sempre 1, senão conta todos)
      const systemsCount = selectedModule === 'all' 
        ? (await supabase.from('crud_modules').select('*', { count: 'exact', head: true }).eq('is_active', true)).count 
        : 1;

      // 2. RECENT ACTIVITY: Busca registros recentes
      let recentQuery = supabase
        .from('crud_records')
        .select('*, crud_tables!inner ( name, crud_module_id, crud_modules ( name ) )')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (selectedModule !== 'all') {
        recentQuery = recentQuery.eq('crud_tables.crud_module_id', selectedModule);
      }

      // 3. CHART DATA: Busca registros dos últimos 7 dias (Otimizado: 1 query só)
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      let chartQuery = supabase
        .from('crud_records')
        .select('created_at, crud_tables!inner(crud_module_id)')
        .gte('created_at', sevenDaysAgo);

      if (selectedModule !== 'all') {
        chartQuery = chartQuery.eq('crud_tables.crud_module_id', selectedModule);
      }

      // --- EXECUÇÃO PARALELA ---
      const [
        { count: total }, 
        { count: pending }, 
        { count: approved }, 
        { data: recent },
        { data: chartRaw }
      ] = await Promise.all([
        totalPromise, 
        pendingPromise, 
        approvedPromise, 
        recentQuery, 
        chartQuery
      ]);

      // --- PROCESSAMENTO DO GRÁFICO (JS) ---
      const days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));
      const processedChart = days.map(day => {
        const count = (chartRaw || []).filter((r: any) => isSameDay(parseISO(r.created_at), day)).length;
        return { name: format(day, 'dd/MM'), registros: count };
      });

      setStats({ 
        total: total || 0, 
        active_systems: systemsCount || 0, 
        pending: pending || 0, 
        approved: approved || 0 
      });
      setRecentActivity(recent || []);
      setChartData(processedChart);

    } catch (error) { 
      console.error("Erro dashboard:", error); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER + FILTRO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Visão Geral</h1>
          <p className="text-sm text-slate-500">
            {selectedModule === 'all' 
              ? 'Acompanhe as métricas de todos os sistemas.' 
              : 'Visualizando dados filtrados por módulo.'}
          </p>
        </div>
        
        <div className="w-full md:w-[280px]">
          <Select value={selectedModule} onValueChange={setSelectedModule}>
            <SelectTrigger className="bg-white border-slate-200 shadow-sm h-10 focus:ring-[#003B8F]">
              <div className="flex items-center gap-2 text-slate-700">
                <Filter className="h-4 w-4 text-[#003B8F]" />
                <SelectValue placeholder="Filtrar por Sistema" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-medium text-[#003B8F]">Todos os Sistemas</SelectItem>
              {modulesList.map(mod => (
                <SelectItem key={mod.id} value={mod.id}>{mod.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Registros Totais" value={stats.total} icon={FileText} loading={loading} />
        <StatsCard title="Sistemas Monitorados" value={stats.active_systems} icon={LayoutGrid} loading={loading} />
        <StatsCard title="Pendentes" value={stats.pending} icon={Clock} loading={loading} highlight />
        <StatsCard title="Aprovados" value={stats.approved} icon={CheckCircle2} loading={loading} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* GRÁFICO */}
        <Card className="lg:col-span-4 border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
          <CardHeader className="pb-2 border-b border-slate-50">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#003B8F]" /> Fluxo de Entrada
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-0 pt-6 pr-4">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#003B8F" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#003B8F" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} dx={-10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area type="monotone" dataKey="registros" stroke="#003B8F" strokeWidth={2} fill="url(#colorBlue)" activeDot={{ r: 6, fill: "#003B8F", strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ATIVIDADE RECENTE */}
        <Card className="lg:col-span-3 border border-slate-200 shadow-sm rounded-xl bg-white">
          <CardHeader className="border-b border-slate-50">
              <CardTitle className="text-base font-semibold text-slate-800">
                {selectedModule === 'all' ? 'Últimas Atividades' : 'Atividades deste Sistema'}
              </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {loading ? (
                 [1,2,3].map(i => <div key={i} className="flex gap-4"><div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse"/><div className="space-y-2 flex-1"><div className="h-4 bg-slate-100 rounded w-3/4 animate-pulse"/><div className="h-3 bg-slate-100 rounded w-1/2 animate-pulse"/></div></div>)
              ) : recentActivity.length === 0 ? (
                 <div className="text-center py-10">
                    <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FileText className="h-6 w-6 text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-400">Sem registros recentes.</p>
                 </div>
              ) : (
                recentActivity.map((item) => (
                  <div key={item.id} className="flex items-start justify-between group">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 p-2 bg-blue-50 text-blue-600 rounded-full border border-blue-100 group-hover:bg-[#003B8F] group-hover:text-white transition-colors duration-300">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700 leading-none mb-1 group-hover:text-[#003B8F] transition-colors">
                          {item.crud_tables?.crud_modules?.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.crud_tables?.name} • <span className="text-slate-400">{format(new Date(item.created_at), "d 'de' MMM, HH:mm", { locale: ptBR })}</span>
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- Componentes Auxiliares ---

function StatsCard({ title, value, icon: Icon, loading, highlight }: any) {
  return (
    <Card className={`border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 rounded-xl ${highlight ? 'bg-amber-50/50 border-amber-100' : 'bg-white'}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <span className={`text-sm font-medium ${highlight ? 'text-amber-700' : 'text-slate-500'}`}>{title}</span>
          <div className={`p-2 rounded-lg ${highlight ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
             <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-slate-800 mt-2">
            {loading ? <div className="h-8 w-16 bg-slate-100 animate-pulse rounded"/> : value}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
    const styles: any = {
        pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        approved: 'bg-green-50 text-green-700 border-green-200',
        rejected: 'bg-red-50 text-red-700 border-red-200'
    };
    const labels: any = { pending: 'Análise', approved: 'Aprovado', rejected: 'Negado' };
    
    return (
        <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full border ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
            {labels[status]}
        </span>
    );
}