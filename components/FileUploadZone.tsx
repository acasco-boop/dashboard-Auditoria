'use client';

import React, { useRef, useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, Trash2, Calendar } from 'lucide-react';
import { parseExcelFile } from '../utils/excelParser';
import { ProcessedFile } from '../utils/comparator';

interface FileUploadZoneProps {
  onFilesLoaded: (newFiles: ProcessedFile[]) => void;
  loadedFiles: ProcessedFile[];
  onRemoveFile: (index: number) => void;
  onClear: () => void;
}

export default function FileUploadZone({
  onFilesLoaded,
  loadedFiles,
  onRemoveFile,
  onClear
}: FileUploadZoneProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const processFilesList = async (files: FileList) => {
    setError(null);
    setLoading(true);
    const parsedFiles: ProcessedFile[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Evitar duplicados por nombre
        if (loadedFiles.some(lf => lf.name === file.name)) {
          continue;
        }

        const data = await parseExcelFile(file);
        if (data.length === 0) {
          throw new Error(`El archivo ${file.name} no contiene registros válidos.`);
        }

        // Determinar fecha del archivo
        const firstRow = data[0];
        let dateStr = firstRow.downloadDate || '';
        let date = new Date();

        if (dateStr) {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            date = new Date(year, month, day);
          } else {
            const parsed = Date.parse(dateStr);
            if (!isNaN(parsed)) {
              date = new Date(parsed);
            }
          }
        } else {
          // Intentar parsear fecha del nombre, e.g. "13-07" o "13_07"
          const regex = /(\d{1,2})[-_](\d{1,2})/;
          const match = file.name.match(regex);
          if (match) {
            const day = parseInt(match[1], 10);
            const month = parseInt(match[2], 10) - 1;
            date = new Date(2026, month, day); // fijamos 2026
            dateStr = `${day.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}/2026`;
          } else {
            dateStr = date.toLocaleDateString('es-AR');
          }
        }

        // Normalizar downloadDate en todas las filas de este archivo
        const normalizedData = data.map(row => ({
          ...row,
          downloadDate: dateStr
        }));

        parsedFiles.push({
          name: file.name,
          dateStr,
          date,
          data: normalizedData
        });
      }

      if (parsedFiles.length > 0) {
        onFilesLoaded(parsedFiles);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Error al procesar los archivos. Verifique que tengan el formato correcto.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFilesList(files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFilesList(files);
    }
  };

  // Ordenar archivos cargados por fecha para visualizarlos cronológicamente en la lista de carga
  const sortedLoadedFiles = [...loadedFiles].sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      {/* DROPZONE */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-10 cursor-pointer transition-all duration-300 min-h-[220px] ${
          loading
            ? 'border-violet-500 bg-slate-900'
            : error
            ? 'border-rose-500 bg-rose-500/5 hover:bg-rose-500/10'
            : 'border-slate-700 bg-slate-900 hover:border-violet-500 hover:bg-slate-800/80'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx,.xls,.csv"
          multiple
          className="hidden"
        />

        {loading ? (
          <div className="flex flex-col items-center space-y-3">
            <RefreshCw className="h-10 w-10 text-violet-500 animate-spin" />
            <p className="text-slate-400 text-sm font-medium">Procesando archivos Excel...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3 text-center">
            <div className="p-3.5 rounded-full bg-slate-800 text-slate-400">
              <Upload className="h-7 w-7" />
            </div>
            <div>
              <p className="text-slate-200 font-semibold text-lg">Carga de Auditoría Diaria</p>
              <p className="text-slate-400 text-xs mt-1">
                Arrastra o haz click para seleccionar uno o **múltiples archivos** (.xlsx, .csv)
              </p>
            </div>
            {error && (
              <div className="flex items-center space-x-1.5 text-rose-500 bg-rose-500/10 px-4 py-1.5 rounded-xl text-xs mt-2 max-w-md">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* LISTA DE ARCHIVOS CARGADOS */}
      {sortedLoadedFiles.length > 0 && (
        <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 shadow-xl backdrop-blur-md">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
              <Calendar className="h-4 w-4 text-violet-400" />
              Archivos en la Línea Temporal ({sortedLoadedFiles.length})
            </h3>
            <button
              onClick={onClear}
              className="text-[10px] text-rose-400 hover:text-rose-350 hover:bg-rose-500/10 px-2.5 py-1.5 rounded-lg transition font-semibold"
            >
              Quitar todos
            </button>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-56 overflow-y-auto pr-1">
            {sortedLoadedFiles.map((file, idx) => (
              <div key={file.name} className="flex justify-between items-center py-2.5 first:pt-0 last:pb-0 group">
                <div className="flex items-center space-x-3 truncate">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-violet-400 shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-semibold text-slate-200 truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                      <span className="font-semibold text-violet-400">Fecha: {file.dateStr}</span>
                      <span className="text-slate-600">|</span>
                      <span>{file.data.length} discrepancias encontradas</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    // Buscar el índice original en el arreglo desordenado para borrarlo
                    const originalIdx = loadedFiles.findIndex(lf => lf.name === file.name);
                    if (originalIdx !== -1) {
                      onRemoveFile(originalIdx);
                    }
                  }}
                  className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
