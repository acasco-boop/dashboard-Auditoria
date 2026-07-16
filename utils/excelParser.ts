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
  key: string;
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
        
        // Use read array buffer
        const dataArray = new Uint8Array(data as ArrayBuffer);
        const workbook = XLSX.read(dataArray, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Parse raw JSON rows
        const rawRows = XLSX.utils.sheet_to_json<any>(sheet);

        const mappedRows: TaskDiscrepancy[] = [];
        const seenKeys = new Set<string>();

        for (const row of rawRows) {
          // Normalización de campos clave
          const orderNumber = row['Nro. Orden'] ?? row['Nro Orden'] ?? row['Orden'] ?? '';
          const task = row['Tarea'] ?? '';
          
          if (!orderNumber && !task) continue;

          const key = `${orderNumber} - ${task}`;
          
          // Eliminar duplicados exactos en el archivo cargado
          if (seenKeys.has(key)) {
            continue;
          }
          seenKeys.add(key);

          // Formateo de fecha de la orden si es un objeto Date
          let orderDateStr = '';
          if (row['Fecha de la orden'] instanceof Date) {
            orderDateStr = row['Fecha de la orden'].toLocaleDateString('es-AR');
          } else {
            orderDateStr = row['Fecha de la orden']?.toString() ?? '';
          }

          // Formateo de fecha de descarga si es un objeto Date
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
            key,
          });
        }
        resolve(mappedRows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
