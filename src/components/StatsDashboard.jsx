import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';

const COLORS = ['#367588', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function StatsDashboard({ tickets }) {
  const stats = useMemo(() => {
    if (!tickets || tickets.length === 0) return null;

    // 1. Total Tickets
    const total = tickets.length;

    // 2. Sector Counts
    const sectorCounts = {};
    const resolutionTimes = {}; // { sector: [ms, ms, ...] }

    // 3. Time Series & Histograms
    const ticketsByDate = {};
    const ticketsByDayOfWeek = Array(7).fill(0);
    const ticketsByDayOfMonth = Array(31).fill(0);
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    tickets.forEach(t => {
      // Sector
      const setor = t.setor || 'Outros';
      sectorCounts[setor] = (sectorCounts[setor] || 0) + 1;

      // Resolution Time
      if (t.status === 'resolvido' && t.created_at && t.resolved_at) {
        const start = new Date(t.created_at);
        const end = new Date(t.resolved_at);
        const diff = end - start;
        if (diff > 0) {
           if (!resolutionTimes[setor]) resolutionTimes[setor] = [];
           resolutionTimes[setor].push(diff);
        }
      }

      // Time Series
      if (t.created_at) {
        const date = new Date(t.created_at);
        const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        ticketsByDate[dateKey] = (ticketsByDate[dateKey] || 0) + 1;
        
        // Histograms
        ticketsByDayOfWeek[date.getDay()]++;
        ticketsByDayOfMonth[date.getDate() - 1]++;
      }
    });

    // Formatting Sector Data
    const sectorData = Object.keys(sectorCounts).map(name => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: sectorCounts[name]
    })).sort((a, b) => b.value - a.value);

    const mostActiveSector = sectorData.length > 0 ? sectorData[0].name : '-';

    // Formatting Resolution Time Data
    const avgTimeData = Object.keys(resolutionTimes).map(setor => {
      const times = resolutionTimes[setor];
      const avgMs = times.reduce((a, b) => a + b, 0) / times.length;
      const hours = (avgMs / (1000 * 60 * 60)).toFixed(1);
      return { name: setor.charAt(0).toUpperCase() + setor.slice(1), horas: parseFloat(hours) };
    });

    // Formatting Time Series
    const seriesData = Object.keys(ticketsByDate).sort().map(date => ({
      date: new Date(date).toLocaleDateString(),
      count: ticketsByDate[date]
    }));

    // Fill missing dates if needed (optional, keeping it simple for now)

    // Formatting Day of Week
    const weekData = ticketsByDayOfWeek.map((count, i) => ({
      name: dayNames[i],
      count
    }));

    // Formatting Day of Month
    const monthData = ticketsByDayOfMonth.map((count, i) => ({
      day: i + 1,
      count
    }));

    return {
      total,
      mostActiveSector,
      sectorData,
      avgTimeData,
      seriesData,
      weekData,
      monthData
    };
  }, [tickets]);

  if (!stats) return <div className="p-10 text-center text-gray-500">Sem dados suficientes para gerar indicadores.</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-[#367588]">
          <h3 className="text-gray-500 text-sm uppercase font-bold">Total de Atendimentos</h3>
          <p className="text-4xl font-bold text-[#367588] mt-2">{stats.total}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-emerald-500">
          <h3 className="text-gray-500 text-sm uppercase font-bold">Setor Mais Crítico</h3>
          <p className="text-4xl font-bold text-emerald-700 mt-2">{stats.mostActiveSector}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-amber-500">
          <h3 className="text-gray-500 text-sm uppercase font-bold">Média Geral de Resolução</h3>
          <p className="text-2xl font-bold text-amber-700 mt-2">
             { stats.avgTimeData.length > 0
               ? `${(stats.avgTimeData.reduce((acc, curr) => acc + curr.horas, 0) / stats.avgTimeData.length).toFixed(1)} horas`
               : 'N/A' 
             }
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Requisições por Setor */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4 text-gray-800">Solicitações por Setor</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.sectorData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {stats.sectorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tempo Médio de Resolução */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4 text-gray-800">Tempo Médio de Resolução (Horas)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.avgTimeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="horas" fill="#367588" name="Horas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Linha do Tempo */}
        <div className="bg-white p-6 rounded-lg shadow lg:col-span-2">
           <h3 className="text-lg font-bold mb-4 text-gray-800">Evolução de Atendimentos</h3>
           <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={stats.seriesData}>
                 <CartesianGrid strokeDasharray="3 3" />
                 <XAxis dataKey="date" />
                 <YAxis allowDecimals={false} />
                 <Tooltip />
                 <Line type="monotone" dataKey="count" stroke="#367588" name="Tickets" strokeWidth={2} />
               </LineChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Histograma: Dia da Semana */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4 text-gray-800">Fluxo por Dia da Semana</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weekData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#ffc658" name="Tickets" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Histograma: Dia do Mês */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4 text-gray-800">Fluxo por Dia do Mês</h3>
          <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={stats.monthData}>
                 <CartesianGrid strokeDasharray="3 3" />
                 <XAxis dataKey="day" interval={2} />
                 <YAxis allowDecimals={false} />
                 <Tooltip />
                 <Bar dataKey="count" fill="#ff8042" name="Tickets" />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

      </div>
    </div>
  );
}
