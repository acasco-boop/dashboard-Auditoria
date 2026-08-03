import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area
} from 'recharts';
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  FileCheck2,
  Building2,
  Calendar,
  LineChartIcon,
  BarChart3,
  ListRestart,
  Percent,
  CheckCircle2,
  ClipboardList,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { ComparisonRow, MultiDayResult } from '../utils/comparator';

function Explanation({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-950/50 px-4 py-3 text-xs leading-relaxed text-slate-400">
      <span className="font-bold text-violet-300">¿Cómo leerlo? </span>{children}
    </div>
  );
}

interface DashboardOverviewProps {
  result: MultiDayResult;
}

export default function DashboardOverview({ result }: DashboardOverviewProps) {
  const { allDates } = result;
  const [analysisLevel, setAnalysisLevel] = useState<'orders' | 'tasks'>('orders');
  const [isMounted, setIsMounted] = useState(false);
  const [baseSearch, setBaseSearch] = useState('');
  const [sortField, setSortField] = useState<'pct' | 'total' | 'active' | 'resolved'>('total');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const latestDateStr = allDates[allDates.length - 1];
  const prevDateStr = allDates.length > 1 ? allDates[allDates.length - 2] : null;
  const summary = analysisLevel === 'orders' ? result.orderSummary : result.summary;
  const trendData = analysisLevel === 'orders' ? result.orderTrendData : result.trendData;
  const rows = analysisLevel === 'orders' ? result.orderRows : result.rows;
  const unitLabel = analysisLevel === 'orders' ? 'órdenes' : 'tareas';

  const orderResolutionData = useMemo(() => {
    return result.orderTrendData.map((point, index) => {
      const previous = index > 0 ? result.orderTrendData[index - 1] : null;
      const variation = previous ? point.resolved - previous.resolved : 0;
      const rate = previous && previous.active > 0
        ? Math.round((point.resolved / previous.active) * 100)
        : 0;

      return {
        ...point,
        previousActive: previous?.active ?? null,
        variation,
        resolutionRate: rate,
        direction: !previous ? 'BASE' : variation > 0 ? 'UP' : variation < 0 ? 'DOWN' : 'SAME'
      };
    });
  }, [result.orderTrendData]);

  // 1. Datos de % de Resolución Día a Día (Acumulado y Diario)
  const resolutionTrendData = useMemo(() => {
    if (trendData.length === 0) return [];
    
    const discoveredKeys = new Set<string>();
    
    return allDates.map((dateStr, idx) => {
      rows.forEach(r => {
        if (r.presence[dateStr]) {
          discoveredKeys.add(r.key);
        }
      });

      const activeCount = trendData[idx]?.active || 0;
      const totalDiscovered = Math.max(discoveredKeys.size, activeCount);
      const resolvedTotal = Math.max(0, totalDiscovered - activeCount);
      const acumPct = totalDiscovered > 0 ? Math.round((resolvedTotal / totalDiscovered) * 100) : 0;
      const dailyResolved = trendData[idx]?.resolved || 0;
      const prevActive = idx > 0 ? (trendData[idx - 1]?.active || 1) : activeCount;
      const dailyPct = prevActive > 0 ? Math.round((dailyResolved / prevActive) * 100) : 0;

      return {
        dateStr,
        'Tasa Acumulada (%)': acumPct,
        'Tasa Diaria (%)': dailyPct,
        resueltasAcumuladas: resolvedTotal,
        activas: activeCount,
        totalHistorico: totalDiscovered
      };
    });
  }, [allDates, trendData, rows]);

  // 2. Datos para el Stacked Bar Chart por Centro de Costo (Bases) enfocados en el LATEST DAY
  const barDataByBase = useMemo(() => {
    if (!latestDateStr) return [];
    
    const baseMap: Record<
      string,
      { base: string; Resueltos: number; Nuevos: number; Pendientes: number; totalActive: number }
    > = {};

    rows.forEach((row) => {
      const cc = row.costCenter || 'Sin Base';
      if (!baseMap[cc]) {
        baseMap[cc] = { base: cc, Resueltos: 0, Nuevos: 0, Pendientes: 0, totalActive: 0 };
      }

      const presentLatest = !!row.presence[latestDateStr];
      const presentPrev = prevDateStr ? !!row.presence[prevDateStr] : false;

      if (presentLatest && !presentPrev) {
        baseMap[cc].Nuevos++;
        baseMap[cc].totalActive++;
      } else if (!presentLatest && presentPrev) {
        baseMap[cc].Resueltos++;
      } else if (presentLatest && presentPrev) {
        baseMap[cc].Pendientes++;
        baseMap[cc].totalActive++;
      }
    });

    return Object.values(baseMap)
      .sort((a, b) => b.totalActive - a.totalActive)
      .slice(0, 8);
  }, [rows, latestDateStr, prevDateStr]);

  // 3. Tabla / Matriz completa de Eficiencia y % de Resolución por Base
  const baseEfficiencyList = useMemo(() => {
    if (!latestDateStr) return [];

    const map: Record<string, {
      base: string;
      keysSet: Set<string>;
      activeLatest: number;
    }> = {};

    rows.forEach(r => {
      const cc = r.costCenter || 'Sin Base';
      if (!map[cc]) {
        map[cc] = { base: cc, keysSet: new Set(), activeLatest: 0 };
      }
      map[cc].keysSet.add(r.key);
      if (r.presence[latestDateStr]) {
        map[cc].activeLatest++;
      }
    });

    return Object.values(map).map(b => {
      const total = b.keysSet.size;
      const active = b.activeLatest;
      const resolved = Math.max(0, total - active);
      const pct = total > 0 ? Math.round((resolved / total) * 100) : 0;
      return {
        base: b.base,
        total,
        active,
        resolved,
        pct
      };
    });
  }, [rows, latestDateStr]);

  // Filtrado y ordenamiento de la tabla de bases
  const filteredBaseList = useMemo(() => {
    return baseEfficiencyList
      .filter(item => item.base.toLowerCase().includes(baseSearch.toLowerCase()))
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        return sortAsc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      });
  }, [baseEfficiencyList, baseSearch, sortField, sortAsc]);

  const handleSort = (field: 'pct' | 'total' | 'active' | 'resolved') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-slate-500">
        Cargando visualizaciones...
      </div>
    );
  }

  const activeIssues = summary.latestTotal;
  const resolvedIssues = summary.latestResolved;
  const newIssues = summary.latestNew;
  const persistentIssues = summary.latestPersistent;

  const resolutionRate = (activeIssues + resolvedIssues) > 0
    ? Math.round((resolvedIssues / (activeIssues + resolvedIssues)) * 100)
    : 0;

  return (
    <div className="space-y-8 w-full max-w-6xl mx-auto">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/50 border border-slate-800 rounded-2xl p-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Nivel de medición</p>
          <p className="text-xs text-slate-500 mt-1">La medición principal es por orden; el detalle por tarea sigue disponible.</p>
        </div>
        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1">
          <button onClick={() => setAnalysisLevel('orders')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${analysisLevel === 'orders' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            <ClipboardList className="h-3.5 w-3.5" /> Por orden
          </button>
          <button onClick={() => setAnalysisLevel('tasks')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${analysisLevel === 'tasks' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Por tarea
          </button>
        </div>
      </div>
      
      {/* TARJETAS DE KPIs (ÚLTIMO DÍA ANALIZADO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI: TOTAL ACTIVAS */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden shadow-lg">
          <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 text-slate-800 opacity-15">
            <Building2 className="h-24 w-24" />
          </div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
            {analysisLevel === 'orders' ? 'Órdenes Activas' : 'Tareas Activas'}
          </p>
          <div className="flex items-baseline gap-2.5 mt-2">
            <span className="text-3xl font-extrabold text-slate-100">
              {activeIssues}
            </span>
            <span className="text-slate-500 text-xs font-medium">al {latestDateStr}</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="text-slate-500">Total en el archivo más reciente</span>
          </div>
        </div>

        {/* KPI: PERSISTENTES */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden shadow-lg border-l-4 border-l-rose-500">
          <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 text-rose-500 opacity-10">
            <AlertTriangle className="h-24 w-24" />
          </div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
            Pendientes Críticos
          </p>
          <div className="flex items-baseline gap-2.5 mt-2">
            <span className="text-3xl font-extrabold text-rose-400">
              {persistentIssues}
            </span>
            <span className="text-rose-500/80 text-xs font-bold">
              {Math.round((persistentIssues / (activeIssues || 1)) * 100)}%
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-rose-400/80">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Persisten de la fecha anterior</span>
          </div>
        </div>

        {/* KPI: RESUELTOS HOY */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden shadow-lg border-l-4 border-l-emerald-500">
          <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 text-emerald-500 opacity-10">
            <FileCheck2 className="h-24 w-24" />
          </div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
            Resueltos en Último Ciclo
          </p>
          <div className="flex items-baseline gap-2.5 mt-2">
            <span className="text-3xl font-extrabold text-emerald-400">
              {resolvedIssues}
            </span>
            <span className="text-emerald-500/80 text-xs font-bold">
              {resolutionRate}% tasa
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400/80">
            <TrendingDown className="h-3.5 w-3.5" />
            <span>Regularizados en el último día</span>
          </div>
        </div>

        {/* KPI: NUEVOS HOY */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden shadow-lg border-l-4 border-l-sky-500">
          <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 text-sky-500 opacity-10">
            <ListRestart className="h-24 w-24" />
          </div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
            Nuevas {analysisLevel === 'orders' ? 'Órdenes' : 'Tareas'}
          </p>
          <div className="flex items-baseline gap-2.5 mt-2">
            <span className="text-3xl font-extrabold text-sky-400">
              {newIssues}
            </span>
            <span className="text-slate-500 text-xs font-medium">nuevas {unitLabel}</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-sky-400/80">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Ingresaron en la última fecha</span>
          </div>
        </div>

      </div>

      {/* SECCIÓN DE GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRÁFICO 1: EVOLUCIÓN HISTÓRICA DE DISCREPANCIAS */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md shadow-lg lg:col-span-2 flex flex-col justify-between min-h-[380px]">
          <div>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <LineChartIcon className="h-4 w-4 text-violet-400" />
              Evolución Temporal de Auditoría
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Historial de volumen de discrepancias acumulado</p>
          </div>

          <div className="h-64 w-full mt-4">
            {trendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 italic text-sm">
                Sin datos históricos suficientes
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trendData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="dateStr"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                  <Area type="monotone" dataKey="active" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorActive)" name="Discrepancias Activas" />
                  <Line type="monotone" dataKey="new" stroke="#38bdf8" strokeWidth={2} name="Nuevas hoy" />
                  <Line type="monotone" dataKey="resolved" stroke="#34d399" strokeWidth={2} name="Resueltas hoy" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <Explanation>
            La zona violeta muestra cuántas {unitLabel} siguen activas en cada fecha. “Nuevas” indica las que aparecen por primera vez respecto del archivo anterior y “Resueltas” las que dejaron de aparecer.
          </Explanation>
        </div>

        {/* GRÁFICO 2: TOP BASES CON MÁS TAREAS ACTIVAS */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md shadow-lg flex flex-col justify-between min-h-[380px]">
          <div>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-violet-400" />
              Bases con Mayor Carga
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Top 8 bases en el último día ({latestDateStr})</p>
          </div>

          <div className="h-60 w-full mt-4">
            {barDataByBase.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 italic text-sm">
                Carga archivos para graficar por bases
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barDataByBase}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={9} />
                  <YAxis
                    dataKey="base"
                    type="category"
                    stroke="#94a3b8"
                    fontSize={10}
                    width={50}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                    itemStyle={{ fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="Pendientes" stackId="a" fill="#fbbf24" name="Persisten" />
                  <Bar dataKey="Nuevos" stackId="a" fill="#38bdf8" name="Nuevos" />
                  <Bar dataKey="Resueltos" fill="#34d399" name="Resueltos hoy" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <Explanation>
            Cada barra representa una base. La parte amarilla son {unitLabel} que continúan pendientes, la celeste son las nuevas y la verde las resueltas desde la fecha anterior. Las bases se ordenan por mayor carga actual.
          </Explanation>
        </div>

      </div>

      {/* NUEVO GRÁFICO: PORCENTAJE DE RESOLUCIÓN DÍA A DÍA (TASA DE EFICIENCIA) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Percent className="h-4.5 w-4.5 text-emerald-400" />
              Evolución del Porcentaje de Resolución (%) Día a Día
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Curva de efectividad de regularización acumulada vs. ritmo de resolución diaria
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full font-bold">
              Tasa Final: {resolutionTrendData[resolutionTrendData.length - 1]?.['Tasa Acumulada (%)'] || 0}% Resuelto
            </span>
          </div>
        </div>

        <div className="h-72 w-full mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={resolutionTrendData}
              margin={{ top: 15, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="dateStr" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                domain={[0, 100]}
                unit="%"
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                formatter={(value: any, name: any) => [`${value}%`, name]}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Line
                type="monotone"
                dataKey="Tasa Acumulada (%)"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 5, fill: '#10b981' }}
                activeDot={{ r: 7 }}
                name="Tasa de Resolución Acumulada (%)"
              />
              <Line
                type="monotone"
                dataKey="Tasa Diaria (%)"
                stroke="#06b6d4"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 4, fill: '#06b6d4' }}
                name="Eficiencia Diaria (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <Explanation>
          La línea continua muestra el porcentaje acumulado de {unitLabel} resueltas desde el inicio del período. La línea punteada muestra el ritmo de resolución de cada ciclo; cuanto más alto, mejor avance en esa fecha.
        </Explanation>
      </div>

      {/* NUEVA TABLA: MATRIZ DE EFICIENCIA Y PORCENTAJE DE RESOLUCIÓN POR BASE */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="h-4.5 w-4.5 text-violet-400" />
              Matriz de Eficiencia y Porcentaje de Resolución por Base
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Desglose detallado de avance de limpieza, tareas activas y resueltas por cada Centro de Costos
            </p>
          </div>

          {/* Filtro de búsqueda por base */}
          <div className="relative min-w-[240px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por base..."
              value={baseSearch}
              onChange={(e) => setBaseSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition"
            />
          </div>
        </div>

        {/* TABLA DE BASES */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Base / Centro de Costos</th>
                <th
                  onClick={() => handleSort('total')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200 transition"
                >
                  <div className="flex items-center gap-1">
                    Total Detectadas <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('active')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200 transition"
                >
                  <div className="flex items-center gap-1">
                    Activas Actuales <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('resolved')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200 transition"
                >
                  <div className="flex items-center gap-1">
                    Resueltas Totales <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('pct')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200 transition text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    % Resolución <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Estado de Avance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredBaseList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                    No se encontraron bases matching la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredBaseList.map((item) => {
                  let statusBadge = {
                    text: 'Excelente',
                    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  };
                  if (item.pct < 40) {
                    statusBadge = {
                      text: 'Requiere Atención',
                      color: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    };
                  } else if (item.pct < 75) {
                    statusBadge = {
                      text: 'En Progreso',
                      color: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    };
                  }

                  return (
                    <tr key={item.base} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-bold text-slate-200">{item.base}</td>
                      <td className="py-3 px-4 text-slate-300">{item.total}</td>
                      <td className="py-3 px-4 text-amber-400 font-semibold">{item.active}</td>
                      <td className="py-3 px-4 text-emerald-400 font-semibold">{item.resolved}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <span className="font-extrabold text-sm text-slate-100 min-w-[36px]">
                            {item.pct}%
                          </span>
                          {/* Progress Bar */}
                          <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                item.pct >= 75
                                  ? 'bg-emerald-500'
                                  : item.pct >= 40
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${item.pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusBadge.color}`}>
                          {statusBadge.text}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Explanation>
          “Total detectadas” es la cantidad histórica de {unitLabel} de esa base. “Activas actuales” son las que todavía tienen un hallazgo en la última fecha y “Resueltas totales” son las que ya no aparecen. El porcentaje y la barra muestran el avance de resolución.
        </Explanation>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-sky-400" />
              Reporte diario de resolución de órdenes
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Mide si la cantidad de órdenes resueltas sube o baja en cada fecha.
            </p>
          </div>
          {orderResolutionData.length > 0 && (() => {
            const latest = orderResolutionData[orderResolutionData.length - 1];
            const direction = latest.direction;
            const Icon = direction === 'UP' ? ArrowUp : direction === 'DOWN' ? ArrowDown : Minus;
            const label = direction === 'UP' ? 'Sube' : direction === 'DOWN' ? 'Baja' : direction === 'BASE' ? 'Base inicial' : 'Sin cambios';
            const color = direction === 'UP' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : direction === 'DOWN' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-slate-300 bg-slate-500/10 border-slate-500/20';
            return (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${color}`}>
                <Icon className="h-3.5 w-3.5" /> {label} {direction === 'BASE' ? '' : `${Math.abs(latest.variation)} vs. fecha anterior`}
              </span>
            );
          })()}
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={orderResolutionData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="dateStr" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                formatter={(value: any, name: any) => [value, name]}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="resolved" fill="#34d399" radius={[4, 4, 0, 0]} name="Órdenes resueltas" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Órdenes activas día anterior</th>
                <th className="py-3 px-4">Órdenes resueltas</th>
                <th className="py-3 px-4">Variación</th>
                <th className="py-3 px-4">Tasa del día</th>
                <th className="py-3 px-4">Tendencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {orderResolutionData.map((item) => {
                const Icon = item.direction === 'UP' ? ArrowUp : item.direction === 'DOWN' ? ArrowDown : Minus;
                const color = item.direction === 'UP' ? 'text-emerald-400' : item.direction === 'DOWN' ? 'text-rose-400' : 'text-slate-400';
                const trend = item.direction === 'BASE' ? 'Base inicial' : item.direction === 'UP' ? 'Sube' : item.direction === 'DOWN' ? 'Baja' : 'Igual';
                return (
                  <tr key={item.dateStr} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-4 font-semibold">{item.dateStr}</td>
                    <td className="py-2.5 px-4 text-slate-200 font-bold">{item.previousActive === null ? '—' : item.previousActive}</td>
                    <td className="py-2.5 px-4 text-emerald-400 font-bold">{item.resolved}</td>
                    <td className={`py-2.5 px-4 font-bold ${color}`}>
                      {item.direction === 'BASE' ? '—' : `${item.variation > 0 ? '+' : ''}${item.variation}`}
                    </td>
                    <td className="py-2.5 px-4">{item.direction === 'BASE' ? '—' : `${item.resolutionRate}%`}</td>
                    <td className={`py-2.5 px-4 font-bold ${color}`}><span className="inline-flex items-center gap-1"><Icon className="h-3.5 w-3.5" />{trend}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Explanation>
          “Órdenes activas día anterior” muestra la base de comparación. “Órdenes resueltas” son las que estaban pendientes y ya no aparecen en la fecha actual. “Variación” compara contra el día anterior: verde significa que se resolvieron más, rojo que se resolvieron menos y gris que no cambió. La tasa indica qué porcentaje de la base anterior se resolvió.
        </Explanation>
      </div>

    </div>
  );
}
