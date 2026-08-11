import { parseExcelFromUrl } from './excelParser';
import { ProcessedFile } from './comparator';

export async function loadRealAuditData(): Promise<ProcessedFile[]> {
  const results: ProcessedFile[] = [];
  const manifestResponse = await fetch('/api/audits');
  if (!manifestResponse.ok) throw new Error(`No se pudo leer la carpeta de auditorías: HTTP ${manifestResponse.status}`);
  const files: Array<{ name: string; url: string; dateStr: string; date: string }> = await manifestResponse.json();

  for (const item of files) {
    try {
      const data = await parseExcelFromUrl(item.url, item.name);
      
      const normalizedData = data.map(row => ({
        ...row,
        downloadDate: row.downloadDate || item.dateStr
      }));

      results.push({
        name: item.name,
        dateStr: item.dateStr,
        date: new Date(item.date),
        data: normalizedData
      });
    } catch (err) {
      console.error(`Error al cargar ${item.name}:`, err);
    }
  }

  return results.sort((a, b) => a.date.getTime() - b.date.getTime());
}
