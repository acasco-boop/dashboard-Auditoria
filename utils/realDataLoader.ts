import { parseExcelFromUrl } from './excelParser';
import { ProcessedFile } from './comparator';

const REAL_FILES = [
  { name: 'Auditoria_Mantenimiento_Generado (13-07).xlsx', dateStr: '13/07/2026', date: new Date(2026, 6, 13) },
  { name: 'Auditoria_Mantenimiento_Generado (14-07).xlsx', dateStr: '14/07/2026', date: new Date(2026, 6, 14) },
  { name: 'Auditoria_Mantenimiento_Generado (15-07).xlsx', dateStr: '15/07/2026', date: new Date(2026, 6, 15) },
  { name: 'Auditoria_Mantenimiento_Generado (16-07).xlsx', dateStr: '16/07/2026', date: new Date(2026, 6, 16) },
  { name: 'Auditoria_Mantenimiento_Generado (23-07).xlsx', dateStr: '23/07/2026', date: new Date(2026, 6, 23) },
  { name: 'Auditoria_Mantenimiento_Generado (27-07).xlsx', dateStr: '27/07/2026', date: new Date(2026, 6, 27) },
  { name: 'Auditoria_Mantenimiento_Generado (28-07).xlsx', dateStr: '28/07/2026', date: new Date(2026, 6, 28) },
];

export async function loadRealAuditData(): Promise<ProcessedFile[]> {
  const results: ProcessedFile[] = [];

  for (const item of REAL_FILES) {
    try {
      const data = await parseExcelFromUrl(`/data/${encodeURIComponent(item.name)}`, item.name);
      
      const normalizedData = data.map(row => ({
        ...row,
        downloadDate: row.downloadDate || item.dateStr
      }));

      results.push({
        name: item.name,
        dateStr: item.dateStr,
        date: item.date,
        data: normalizedData
      });
    } catch (err) {
      console.error(`Error al cargar ${item.name}:`, err);
    }
  }

  return results.sort((a, b) => a.date.getTime() - b.date.getTime());
}
