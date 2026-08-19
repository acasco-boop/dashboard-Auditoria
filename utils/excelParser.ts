import * as XLSX from 'xlsx';

export interface TaskDiscrepancy {
  orderNumber: string | number;
  orderType: string;
  costCenter: string;
  isAccounted: string;
  orderDate: string;
  docStatus: string;
  equipment: string;
  equipmentName: string;
  task: string;
  taskState: string;
  findingType: string;
  detail: string;
  downloadDate: string;
  controlState: string;
  okState: string;
  excludedFromMeasurement: boolean;
  key: string;
}

export function parseExcelArrayBuffer(arrayBuffer: ArrayBuffer, fileName: string): TaskDiscrepancy[] {
  const dataArray = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(dataArray, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  const rawRows = XLSX.utils.sheet_to_json<any>(sheet);
  const mappedRows: TaskDiscrepancy[] = [];
  const seenKeys = new Set<string>();

  for (const row of rawRows) {
    const orderNumber = row['Nro. Orden'] ?? row['Nro Orden'] ?? row['Orden'] ?? '';
    const task = row['Tarea'] ?? '';
    const okState = String(row['Estados OK'] ?? row['Estado OK'] ?? '').trim();
    const excludedFromMeasurement = okState.toLowerCase() === 'ok';

    if (!orderNumber && !task) continue;

    // Los registros marcados como OK se conservan en la carga para poder
    // informar la exclusión, pero nunca entran al análisis ni a las métricas.
    if (excludedFromMeasurement) continue;

    const key = `${orderNumber} - ${task}`;
    
    if (seenKeys.has(key)) {
      continue;
    }
    seenKeys.add(key);

    let orderDateStr = '';
    if (row['Fecha de la orden'] instanceof Date) {
      orderDateStr = row['Fecha de la orden'].toLocaleDateString('es-AR');
    } else {
      orderDateStr = row['Fecha de la orden']?.toString() ?? '';
    }

    let downloadDateStr = '';
    if (row['Descarga'] instanceof Date) {
      downloadDateStr = row['Descarga'].toLocaleDateString('es-AR');
    } else {
      downloadDateStr = row['Descarga']?.toString() ?? '';
    }

    mappedRows.push({
      orderNumber,
      orderType: row['Tipo de orden'] ?? row['Tipo orden'] ?? '',
      costCenter: row['Centros de costos'] ?? row['Centro de costo'] ?? row['Centro Costos'] ?? 'Sin Base',
      isAccounted: row['Contabilizada'] ?? '',
      orderDate: orderDateStr,
      docStatus: row['Status de documento'] ?? row['Status documento'] ?? '',
      equipment: row['Equipo'] ?? '',
      equipmentName: row['Nombre Equipo'] ?? row['Nombre equipo'] ?? '',
      task,
      taskState: row['Estado Tarea'] ?? row['Estado tarea'] ?? '',
      findingType: row['Tipo de Hallazgo'] ?? row['Tipo hallazgo'] ?? row['Hallazgo'] ?? '',
      detail: row['Detalle'] ?? '',
      downloadDate: downloadDateStr,
      controlState: row['Estados Control'] ?? row['Estados de control'] ?? '',
      okState,
      excludedFromMeasurement,
      key,
    });
  }
  return mappedRows;
}

export function parseExcelFile(file: File): Promise<TaskDiscrepancy[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          resolve([]);
          return;
        }
        const mappedRows = parseExcelArrayBuffer(data as ArrayBuffer, file.name);
        resolve(mappedRows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

export async function parseExcelFromUrl(url: string, fileName: string): Promise<TaskDiscrepancy[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error al descargar ${fileName}: HTTP ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  return parseExcelArrayBuffer(buffer, fileName);
}
