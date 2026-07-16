'use client';

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
  ListRestart
} from 'lucide-react';
import { ComparisonRow, MultiDayResult } from '../utils/comparator';

interface DashboardOverviewProps {
  result: MultiDayResult;
}

export default function DashboardOverview({ result }: DashboardOverviewProps) {
  const { summary, trendData, rows, allDates } = result;
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 1. Datos para el Stacked Bar Chart por Centro de Costo (Bases) enfocados en el LATEST DAY
  const latestDateStr = allDates[allDates.length - 1];
  const prevDateStr = allDates.length > 1 ? allDates[allDates.length - 2] : null;

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

      // Evaluamos el estado en el último día
      const presentLatest = !!row.presence[latestDateStr];
      const presentPrev = prevDateStr ? !!row.presence[prevDateStr] : false;

      if (presentLatest && !presentPrev) {
        // Nueva hoy
        baseMap[cc].Nuevos++;
        baseMap[cc].totalActive++;
      } else if (!presentLatest && presentPrev) {
        // Resuelta hoy
        baseMap[cc].Resueltos++;
      } else if (presentLatest && presentPrev) {
        // Persistente hoy
        baseMap[cc].Pendientes++;
        baseMap[cc].totalActive++;
      }
    });

    return Object.values(baseMap)
      .sort((a, b) => b.totalActive - a.totalActive)
      .slice(0, 8); // Top 8 bases con más problemas hoy
  }, [rows, latestDateStr, prevDateStr]);

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-slate-500">
        Cargando visualizaciones...
      </div>
    );
  }

  // Cálculos comparativos del último día
  const activeIssues = summary.latestTotal;
  const resolvedIssues = summary.latestResolved;
  const newIssues = summary.latestNew;
  const persistentIssues = summary.latestPersistent;

  const resolutionRate = (activeIssues + resolvedIssues) > 0
    ? Math.round((resolvedIssues / (activeIssues + resolvedIssues)) * 100)
    : 0;

  return (
    <div className="space-y-8 w-full max-w-6xl mx-auto">
      
      {/* TARJETAS DE KPIs (ÚLTIMO DÍA ANALIZADO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI: TOTAL ACTIVAS */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden shadow-lg">
          <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 text-slate-800 opacity-15">
            <Building2 className="h-24 w-24" />
          </div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
            Discrepancias Activas
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
            Nuevas Discrepancias
          </p>
          <div className="flex items-baseline gap-2.5 mt-2">
            <span className="text-3xl font-extrabold text-sky-400">
              {newIssues}
            </span>
            <span className="text-slate-500 text-xs font-medium">nuevas</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-sky-400/80">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Ingresaron en la última fecha</span>
          </div>
        </div>

      </div>

      {/* SECCIÓN DE GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRÁFICO 1: EVOLUCIÓN HISTÓRICA / MENSUAL (TREND LINE & AREA CHART) */}
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
        </div>

        {/* GRÁFICO 2: TOP BASES CON MÁS TAREAS ACTIVAS (LATEST BAR CHART) */}
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
        </div>

      </div>
    </div>
  );
}
