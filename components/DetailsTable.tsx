'use client';

import React, { useState, useMemo } from 'react';
import { Search, Filter, ArrowUpDown, ChevronDown, ChevronUp, FileSpreadsheet, Eye, CalendarCheck2 } from 'lucide-react';
import { ComparisonRow, ComparisonStatus } from '../utils/comparator';

interface DetailsTableProps {
  rows: ComparisonRow[];
  costCenters: string[];
  allDates: string[];
}

const statusConfig: Record<
  ComparisonStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  RESOLVED: {
    label: 'Resuelto',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-500'
  },
  NEW: {
    label: 'Nuevo',
    bg: 'bg-sky-500/10',
    text: 'text-sky-400',
    border: 'border-sky-500/20',
    dot: 'bg-sky-500'
  },
  PERSISTENT_SAME: {
    label: 'Pendiente sin cambios',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
    dot: 'bg-rose-500'
  },
  PERSISTENT_CHANGED: {
    label: 'Pendiente modificado',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    dot: 'bg-amber-500'
  }
};

export default function DetailsTable({ rows, costCenters, allDates }: DetailsTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [costCenterFilter, setCostCenterFilter] = useState<string>('ALL');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  
  // Ordenamiento
  const [sortField, setSortField] = useState<'orderNumber' | 'costCenter' | 'status'>('orderNumber');
  const [sortAsc, setSortAsc] = useState(true);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const toggleSort = (field: 'orderNumber' | 'costCenter' | 'status') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
    setCurrentPage(1);
  };

  const handleRowClick = (key: string) => {
    setExpandedKey(expandedKey === key ? null : key);
  };

  // Filtrado de filas
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // 1. Filtro de búsqueda
      const searchStr = `${row.orderNumber} ${row.task} ${row.equipment} ${row.equipmentName} ${row.costCenter}`.toLowerCase();
      if (search && !searchStr.includes(search.toLowerCase())) {
        return false;
      }

      // 2. Filtro de estado
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'PENDING_ANY') {
          if (row.status !== 'PERSISTENT_SAME' && row.status !== 'PERSISTENT_CHANGED') return false;
        } else if (row.status !== statusFilter) {
          return false;
        }
      }

      // 3. Filtro de centro de costos
      if (costCenterFilter !== 'ALL' && row.costCenter !== costCenterFilter) {
        return false;
      }

      return true;
    });
  }, [rows, search, statusFilter, costCenterFilter]);

  // Ordenamiento de filas
  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];
    sorted.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'orderNumber') {
        const numA = Number(valA) || 0;
        const numB = Number(valB) || 0;
        return sortAsc ? numA - numB : numB - numA;
      }

      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredRows, sortField, sortAsc]);

  // Paginación
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedRows.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedRows, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedRows.length / rowsPerPage) || 1;

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md w-full max-w-6xl mx-auto shadow-2xl">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-violet-400" />
            Detalle de Auditoría e Historial
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Historial completo de presencia. Mostrando {filteredRows.length} de {rows.length} tareas detectadas.
          </p>
        </div>

        {/* Buscador y selectores de filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-3 w-full lg:w-auto">
          {/* Búsqueda */}
          <div className="relative w-full lg:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar orden, tarea o equipo..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition duration-200"
            />
          </div>

          {/* Filtro de Estado */}
          <div className="relative w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-violet-500 appearance-none cursor-pointer pr-10"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="RESOLVED">Resueltos hoy / en el pasado</option>
              <option value="NEW">Nuevos (Aparecieron hoy)</option>
              <option value="PENDING_ANY">Cualquier Pendiente (Persiste)</option>
              <option value="PERSISTENT_SAME">Pendientes sin Cambios</option>
              <option value="PERSISTENT_CHANGED">Pendientes con Cambios</option>
            </select>
            <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Filtro de Centro de Costos */}
          <div className="relative w-full sm:w-auto">
            <select
              value={costCenterFilter}
              onChange={(e) => {
                setCostCenterFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-violet-500 appearance-none cursor-pointer pr-10"
            >
              <option value="ALL">Todas las Bases</option>
              {costCenters.map((cc) => (
                <option key={cc} value={cc}>
                  {cc}
                </option>
              ))}
            </select>
            <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-xs font-semibold uppercase text-slate-400 bg-slate-950/80">
              <th className="py-4 px-4">
                <button
                  onClick={() => toggleSort('orderNumber')}
                  className="flex items-center gap-1 hover:text-slate-200 transition"
                >
                  Orden / Tarea
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="py-4 px-4">Equipo</th>
              <th className="py-4 px-4">
                <button
                  onClick={() => toggleSort('costCenter')}
                  className="flex items-center gap-1 hover:text-slate-200 transition"
                >
                  Base
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="py-4 px-4">Línea de Tiempo</th>
              <th className="py-4 px-4">
                <button
                  onClick={() => toggleSort('status')}
                  className="flex items-center gap-1 hover:text-slate-200 transition"
                >
                  Último Estado
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="py-4 px-4 text-right">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  Ningún registro coincide con los filtros aplicados.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => {
                const conf = statusConfig[row.status];
                const isExpanded = expandedKey === row.key;

                return (
                  <React.Fragment key={row.key}>
                    <tr
                      onClick={() => handleRowClick(row.key)}
                      className={`hover:bg-slate-800/30 transition duration-200 cursor-pointer ${
                        isExpanded ? 'bg-slate-800/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 max-w-xs sm:max-w-sm">
                        <div className="font-semibold text-slate-200 text-xs sm:text-sm">
                          #{row.orderNumber}
                        </div>
                        <div className="text-xs text-slate-400 truncate mt-0.5" title={row.task}>
                          {row.task}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-xs sm:text-sm font-medium text-slate-300">
                          {row.equipment}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                          {row.equipmentName}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-400">
                        {row.costCenter}
                      </td>
                      <td className="py-3.5 px-4">
                        {/* Línea de tiempo visual en celdas */}
                        <div className="flex items-center space-x-1.5">
                          {allDates.map((dateStr) => {
                            const isPresent = !!row.presence[dateStr];
                            const dateLabel = dateStr.substring(0, 5); // DD/MM
                            
                            let indicatorBg = 'bg-slate-800 text-slate-500';
                            if (isPresent) {
                              if (row.status === 'NEW' && dateStr === row.latestDate) {
                                indicatorBg = 'bg-sky-500/20 text-sky-400 border border-sky-500/30';
                              } else if (dateStr === row.latestDate) {
                                indicatorBg = 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
                              } else {
                                indicatorBg = 'bg-rose-500/10 text-rose-500/60 border border-rose-500/15';
                              }
                            } else {
                              // Si en esta fecha ya no está presente, pero estuvo presente antes (significa que está resuelto aquí)
                              const indexInAll = allDates.indexOf(dateStr);
                              const wasPresentBefore = allDates.slice(0, indexInAll).some(d => row.presence[d]);
                              if (wasPresentBefore) {
                                indicatorBg = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
                              }
                            }

                            return (
                              <span
                                key={dateStr}
                                className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold tracking-tight ${indicatorBg}`}
                                title={`${dateStr}: ${isPresent ? 'Discrepancia Activa' : 'Sin Discrepancia / Resuelta'}`}
                              >
                                {dateLabel}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${conf.bg} ${conf.text} ${conf.border}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${conf.dot}`} />
                          {conf.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button className="text-violet-400 hover:text-violet-300 p-1.5 rounded-lg hover:bg-violet-500/10 transition">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                    
                    {/* Fila Expandida de Historial Detallado */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="bg-slate-950/60 p-6 border-l-2 border-violet-500">
                          <div className="space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-2">
                              <CalendarCheck2 className="h-4 w-4 text-violet-400" />
                              Ciclo de Vida de la Discrepancia
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {row.timeline.map((tp) => (
                                <div
                                  key={tp.dateStr}
                                  className={`p-3.5 rounded-xl border text-xs leading-relaxed transition ${
                                    tp.present
                                      ? tp.dateStr === row.latestDate
                                        ? 'bg-rose-500/5 border-rose-500/20'
                                        : 'bg-slate-900/50 border-slate-800/80 opacity-70'
                                      : 'bg-emerald-500/5 border-emerald-500/15'
                                  }`}
                                >
                                  <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 mb-2 font-semibold">
                                    <span className="text-slate-400">Fecha: {tp.dateStr}</span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                                        tp.present
                                          ? 'bg-rose-500/10 text-rose-400'
                                          : 'bg-emerald-500/10 text-emerald-400'
                                      }`}
                                    >
                                      {tp.present ? 'Discrepante' : 'Limpio / Resuelto'}
                                    </span>
                                  </div>

                                  {tp.present ? (
                                    <div className="space-y-1.5">
                                      <p className="text-slate-400">
                                        <span className="text-slate-500 font-medium">Hallazgo:</span> {tp.finding}
                                      </p>
                                      <p className="text-slate-300 bg-slate-950/80 p-2 rounded border border-slate-800/40 text-[11px] whitespace-pre-wrap max-h-20 overflow-y-auto">
                                        {tp.detail}
                                      </p>
                                    </div>
                                  ) : (
                                    <p className="text-emerald-400/90 font-medium py-2">
                                      ✓ Sin discrepancias en este reporte.
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-950/50 px-4 py-3 text-xs leading-relaxed text-slate-400">
        <span className="font-bold text-violet-300">¿Cómo leer esta tabla? </span>
        Cada fila representa una tarea con hallazgo. En la línea de tiempo, rojo significa que la tarea estaba pendiente, verde que dejó de aparecer y azul que apareció como nueva. Haz clic en una fila para ver el detalle de cada fecha.
      </div>

      {/* Paginación */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-5 pt-4 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Filas por página:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 py-1 px-2 focus:outline-none focus:border-violet-500 cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 disabled:opacity-30 disabled:hover:bg-slate-950 text-slate-300 rounded-lg transition"
          >
            Primero
          </button>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 disabled:opacity-30 disabled:hover:bg-slate-950 text-slate-300 rounded-lg transition"
          >
            Anterior
          </button>
          <span className="text-slate-400 px-2.5">
            Pág. <span className="text-slate-200 font-bold">{currentPage}</span> de {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 disabled:opacity-30 disabled:hover:bg-slate-950 text-slate-300 rounded-lg transition"
          >
            Siguiente
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 disabled:opacity-30 disabled:hover:bg-slate-950 text-slate-300 rounded-lg transition"
          >
            Último
          </button>
        </div>
      </div>
    </div>
  );
}
