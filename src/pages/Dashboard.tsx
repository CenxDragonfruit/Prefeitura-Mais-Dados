import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, Clock, CheckCircle2, LayoutGrid, ArrowUpRight } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from 'date-fns';

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, active_systems: 0, pending: 0, approved: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRealData = async () => {
      try {
        const { count: total } = await supabase.from('crud_records').select('*', { count: 'exact', head: true });
        const { count: systems } = await supabase.from('crud_modules').select('*', { count: 'exact', head: true }).eq('is_active', true);
        const { count: pending } = await supabase.from('crud_records').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: approved } = await supabase.from('crud_records').select('*', { count: 'exact', head: true }).eq('status', 'approved');

        // JOIN CORRIGIDO PARA ATIVIDADE RECENTE
        const { data: recent } = await supabase
          .from('crud_records')
          .select('*, crud_tables ( name, crud_modules ( name ) )')
          .order('created_at', { ascending: false })
          .limit(5);

        const days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));
        const chart = await Promise.all(days.map(async (date) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const { count } = await supabase.from('crud_records')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', `${dateStr}T00:00:00`)
            .lte('created_at', `${dateStr}T23:59:59`);
          return { name: format(date, 'dd/MM'), registros: count || 0 };
        }));

        setStats({ total: total || 0, active_systems: systems || 0, pending: pending || 0, approved: approved || 0 });
        setChartData(chart);
        setRecentActivity(recent || []);
      } catch (error) { console.error("Erro dashboard:", error); } finally { setLoading(false); }
    };

    fetchRealData();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#003B8F]">Visão Geral</h1>
        <p className="text-muted-foreground">Monitoramento em tempo real.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Registros Totais" value={stats.total} icon={FileText} color="blue" loading={loading} />
        <StatsCard title="Sistemas Ativos" value={stats.active_systems} icon={LayoutGrid} color="indigo" loading={loading} />
        <StatsCard title="Pendentes" value={stats.pending} icon={Clock} color="yellow" loading={loading} />
        <StatsCard title="Aprovados" value={stats.approved} icon={CheckCircle2} color="green" loading={loading} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 border-0 shadow-md">
          <CardHeader><CardTitle className="text-[#003B8F]">Fluxo de Entrada</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#003B8F" stopOpacity={0.2}/><stop offset="95%" stopColor="#003B8F" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="registros" stroke="#003B8F" fill="url(#colorBlue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-0 shadow-md">
          <CardHeader><CardTitle className="text-[#003B8F]">Atividade Recente</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length === 0 ? <p className="text-sm text-slate-400">Sem atividades.</p> : recentActivity.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white text-[#003B8F] rounded-lg shadow-sm"><ArrowUpRight className="h-4 w-4" /></div>
                    <div>
                      <p className="font-semibold text-sm text-slate-800">{item.crud_tables?.crud_modules?.name}</p>
                      <p className="text-xs text-slate-500">{item.crud_tables?.name} • {format(new Date(item.created_at), "dd/MM HH:mm")}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                    item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    item.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {item.status === 'pending' ? 'Análise' : item.status === 'approved' ? 'OK' : 'Negado'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, color, loading }: any) {
  const colors: any = {
    blue: "text-blue-600 bg-blue-100 border-l-blue-600",
    indigo: "text-indigo-600 bg-indigo-100 border-l-indigo-600",
    yellow: "text-yellow-600 bg-yellow-100 border-l-yellow-500",
    green: "text-green-600 bg-green-100 border-l-green-500",
  };
  return (
    <Card className={`border-0 shadow-md border-l-4 ${colors[color].split(' ').pop()}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold uppercase text-slate-600">{title}</CardTitle>
        <div className={`p-2 rounded-full ${colors[color].replace(/border-l-\w+/, '')}`}><Icon className="h-5 w-5" /></div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-slate-800">{loading ? '-' : value}</div>
      </CardContent>
    </Card>
  );
}