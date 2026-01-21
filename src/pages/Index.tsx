import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, Clock, AlertCircle } from 'lucide-react';

// Dados simulados baseados no seu print (gráfico de onda azul)
const data = [
  { name: '14/01', total: 5 },
  { name: '15/01', total: 2 },
  { name: '16/01', total: 1 },
  { name: '17/01', total: 1 },
  { name: '18/01', total: 3 },
  { name: '19/01', total: 2 },
  { name: '20/01', total: 4 }, // Subindo no final
];

export default function Dashboard() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Cards Superiores (Gráfico + Recentes) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        {/* Gráfico de Evolução (Ocupa 2 colunas) */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Evolução de Registros</CardTitle>
            <p className="text-sm text-muted-foreground">Registros criados ao longo do tempo</p>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#003B8F" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#003B8F" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5"/>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}/>
                  <Area type="monotone" dataKey="total" stroke="#003B8F" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Registros Recentes */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Registros Recentes</CardTitle>
            <p className="text-sm text-muted-foreground">Últimas entradas no sistema</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-md">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Cidade Limpa</p>
                    <p className="text-xs text-muted-foreground">há 28 minutos</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full border border-yellow-100">
                  <Clock className="h-3 w-3" /> Pendente
                </div>
              </div>
              
              {/* Espaço vazio se não tiver mais */}
              <div className="h-20 flex items-center justify-center text-xs text-muted-foreground border-dashed border-2 rounded-lg">
                Sem mais atividades recentes
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}