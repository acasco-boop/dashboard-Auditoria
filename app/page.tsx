'use client';

import React, { useState, useMemo } from 'react';
import { LayoutDashboard, FileSpreadsheet, AlertTriangle, Layers2, ShieldCheck, CalendarRange } from 'lucide-react';
import FileUploadZone from '../components/FileUploadZone';
import DashboardOverview from '../components/DashboardOverview';
import DetailsTable from '../components/DetailsTable';
import { ProcessedFile, analyzeMultiDay, MultiDayResult } from '../utils/comparator';
import { generateDemoData } from '../utils/demoGenerator';
import { loadRealAuditData } from '../utils/realDataLoader';

export default function Home() {
  const [loadedFiles, setLoadedFiles] = useState<ProcessedFile[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'table'>('dashboard');
  const [isLoadingReal, setIsLoadingReal] = useState(false);

  const handleFilesLoaded = (newFiles: ProcessedFile[]) => {
    setLoadedFiles(prev => {
      const updated = [...prev, ...newFiles];
      // Ordenar por fecha cronolÃ³gica para consistencia de anÃ¡lisis
      return updated.sort((a, b) => a.date.getTime() - b.date.getTime());
    });
  };

  const handleRemoveFile = (index: number) => {
    setLoadedFiles(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleClear = () => {
    setLoadedFiles([]);
  };

  const loadDemoData = () => {
    const demoFiles = generateDemoData();
    setLoadedFiles(demoFiles);
  };

  const loadRealData = async () => {
    setIsLoadingReal(true);
    try {
      const realFiles = await loadRealAuditData();
      setLoadedFiles(realFiles);
    } catch (err) {
      console.error('Error al cargar archivos reales:', err);
    } finally {
      setIsLoadingReal(false);
    }
  };

  // Ejecutar motor de anÃ¡lisis multidÃ­a
  const analysisResult = useMemo((): MultiDayResult | null => {
    if (loadedFiles.length > 0) {
      return analyzeMultiDay(loadedFiles);
    }
    return null;
  }, [loadedFiles]);

  const hasData = analysisResult !== null;
  const datesList = analysisResult?.allDates || [];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 pb-12 selection:bg-violet-500 selection:text-white relative overflow-hidden">
      {/* Background Glow effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* HEADER NAVBAR */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-tr from-violet-600 to-indigo-500 rounded-xl text-white shadow-lg shadow-violet-500/20">
              <Layers2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-base sm:text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-300">
                Auditoría de Mantenimiento
              </h1>
              <p className="text-[10px] text-slate-500 font-medium -mt-0.5">Evolución de Tareas vs Materiales</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-violet-500/20 bg-violet-500/5 text-violet-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Auditoría Local (Client-side)
            </span>

            {!hasData && (
              <button
                onClick={loadDemoData}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold px-4.5 py-2 rounded-xl text-xs transition duration-200"
              >
                Cargar Datos Demo
              </button>
            )}
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <div className="max-w-6xl mx-auto px-6 mt-8">
        
        {/* CASO: SIN DATOS CARGADOS */}
        {!hasData && (
          <div className="flex flex-col items-center justify-center py-12 md:py-16 text-center">
            <div className="max-w-xl mx-auto space-y-6">
              <div className="inline-flex p-3 rounded-2xl bg-slate-900 border border-slate-800 text-violet-400">
                <AlertTriangle className="h-8 w-8 animate-pulse" />
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">
                Auditoría y Evolución Temporal
              </h2>
              <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                Carga uno o múltiples archivos Excel correspondientes a diferentes fechas. El motor analizará el ciclo de vida de los materiales y órdenes de trabajo para visualizar cómo se reducen las discrepancias a lo largo del tiempo.
              </p>

              <div className="pt-6">
                <FileUploadZone
                  onFilesLoaded={handleFilesLoaded}
                  loadedFiles={loadedFiles}
                  onRemoveFile={handleRemoveFile}
                  onClear={handleClear}
                />
              </div>

              <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={loadRealData}
                  disabled={isLoadingReal}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs tracking-wide shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition duration-200 disabled:opacity-50"
                >
                  {isLoadingReal ? 'Cargando Auditorías...' : '⚡ Cargar Auditoría Real (13/07 al 31/07)'}
                </button>
                <button
                  onClick={loadDemoData}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold px-6 py-2.5 rounded-xl text-xs tracking-wide transition duration-200"
                >
                  Probar Datos Demo (3 Días)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CASO: CON DATOS CARGADOS */}
        {hasData && (
          <div className="space-y-8">
            
            {/* Cabecera del Dashboard activo */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-slate-900">
              <div className="space-y-1">
                <span className="text-xs text-violet-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <CalendarRange className="h-3.5 w-3.5" />
                  Evolución: {datesList[0]} al {datesList[datesList.length - 1]} ({datesList.length} fechas cargadas)
                </span>
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-100 tracking-tight">
                  Dashboard de Control Operativo
                </h2>
              </div>

              {/* Controles rÃ¡pidos */}
              <div className="flex items-center gap-2">
                <button
                  onClick={loadRealData}
                  disabled={isLoadingReal}
                  className="text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-lg transition font-semibold disabled:opacity-50"
                >
                  {isLoadingReal ? 'Cargando...' : '⚡ Cargar Auditoría Real'}
                </button>
                <button
                  onClick={loadDemoData}
                  className="text-xs text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg transition"
                >
                  Cargar Demo
                </button>
                <button
                  onClick={handleClear}
                  className="text-xs text-slate-100 hover:text-white bg-violet-600 hover:bg-violet-500 px-3 py-1.5 rounded-lg transition font-semibold"
                >
                  Limpiar
                </button>
              </div>
            </div>

            {/* Zona de Carga Secundaria (Colapsada/RÃ¡pida) */}
            <div className="bg-slate-900/30 border border-slate-900 p-4 rounded-xl">
              <FileUploadZone
                onFilesLoaded={handleFilesLoaded}
                loadedFiles={loadedFiles}
                onRemoveFile={handleRemoveFile}
                onClear={handleClear}
              />
            </div>

            {/* Selector de pestaÃ±as */}
            <div className="flex border-b border-slate-900">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition duration-200 ${
                  activeTab === 'dashboard'
                    ? 'border-violet-500 text-violet-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Métricas y Gráficos</span>
              </button>
              <button
                onClick={() => setActiveTab('table')}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition duration-200 ${
                  activeTab === 'table'
                    ? 'border-violet-500 text-violet-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Análisis por tarea e historial</span>
                <span className="ml-1 bg-slate-800 text-[10px] text-slate-300 px-1.5 py-0.5 rounded-full font-bold">
                  {analysisResult.rows.length}
                </span>
              </button>
            </div>

            {/* CONTENIDOS DE PESTAÃ‘AS */}
            {activeTab === 'dashboard' ? (
              <DashboardOverview result={analysisResult} />
            ) : (
              <DetailsTable
                rows={analysisResult.rows}
                costCenters={analysisResult.costCenters}
                allDates={analysisResult.allDates}
              />
            )}
          </div>
        )}

      </div>
    </main>
  );
}
