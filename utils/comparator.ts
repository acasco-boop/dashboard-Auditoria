import { TaskDiscrepancy } from './excelParser';

export interface ProcessedFile {
  name: string;
  dateStr: string; // e.g. "13/07/2026"
  date: Date;
  data: TaskDiscrepancy[];
}

export type ComparisonStatus = 'RESOLVED' | 'NEW' | 'PERSISTENT_SAME' | 'PERSISTENT_CHANGED';

export interface TimelinePoint {
  dateStr: string;
  present: boolean;
  finding?: string;
  detail?: string;
}

export interface ComparisonRow {
  key: string;
  orderNumber: string | number;
  task: string;
  equipment: string;
  equipmentName: string;
  costCenter: string;
  status: ComparisonStatus;
  
  // Presencia por cada fecha
  presence: Record<string, boolean>;
  
  // Línea de tiempo ordenada cronológicamente
  timeline: TimelinePoint[];

  // Información más reciente disponible
  latestFinding: string;
  latestDetail: string;
  latestDate: string;
}

export interface OrderComparisonRow extends ComparisonRow {
  taskCount: number;
  activeTaskCount: number;
}

export interface DailyTrendPoint {
  dateStr: string;
  active: number;
  new: number;
  resolved: number;
  persistent: number;
}

export interface MultiDayResult {
  summary: {
    totalFiles: number;
    latestTotal: number;
    latestResolved: number;
    latestNew: number;
    latestPersistent: number;
    totalDiscovered: number; // total de tareas distintas en toda la historia
  };
  trendData: DailyTrendPoint[];
  rows: ComparisonRow[];
  orderRows: OrderComparisonRow[];
  orderSummary: MultiDayResult['summary'];
  orderTrendData: DailyTrendPoint[];
  orderCostCenters: string[];
  costCenters: string[];
  allDates: string[]; // lista de todas las fechas ordenadas
}

/**
 * Procesa múltiples archivos de auditoría ordenados cronológicamente
 * y calcula la evolución diaria y el ciclo de vida de cada tarea.
 */
export function analyzeMultiDay(files: ProcessedFile[]): MultiDayResult {
  if (files.length === 0) {
    return {
      summary: { totalFiles: 0, latestTotal: 0, latestResolved: 0, latestNew: 0, latestPersistent: 0, totalDiscovered: 0 },
      trendData: [], rows: [], orderRows: [],
      orderSummary: { totalFiles: 0, latestTotal: 0, latestResolved: 0, latestNew: 0, latestPersistent: 0, totalDiscovered: 0 },
      orderTrendData: [], orderCostCenters: [], costCenters: [], allDates: []
    };
  }

  // 1. Ordenar archivos cronológicamente por fecha
  const sortedFiles = [...files].sort((a, b) => a.date.getTime() - b.date.getTime());
  const allDates = sortedFiles.map(f => f.dateStr);

  const taskMap = new Map<string, {
    key: string;
    orderNumber: string | number;
    task: string;
    equipment: string;
    equipmentName: string;
    costCenter: string;
    findingsByDate: Record<string, string>;
    detailsByDate: Record<string, string>;
    presence: Record<string, boolean>;
  }>();

  const costCentersSet = new Set<string>();

  // 2. Mapear la presencia e historial de hallazgos por cada tarea
  sortedFiles.forEach(file => {
    file.data.forEach(row => {
      if (row.excludedFromMeasurement) return;
      const cc = row.costCenter || 'Sin Base';
      costCentersSet.add(cc);

      if (!taskMap.has(row.key)) {
        taskMap.set(row.key, {
          key: row.key,
          orderNumber: row.orderNumber,
          task: row.task,
          equipment: row.equipment,
          equipmentName: row.equipmentName,
          costCenter: cc,
          findingsByDate: {},
          detailsByDate: {},
          presence: {}
        });
      }

      const task = taskMap.get(row.key)!;
      task.presence[file.dateStr] = true;
      task.findingsByDate[file.dateStr] = row.findingType;
      task.detailsByDate[file.dateStr] = row.detail;
      // Actualizar centro de costos al más reciente
      task.costCenter = cc;
    });
  });

  // 3. Calcular métricas diarias de evolución (Trend Data)
  const trendData: DailyTrendPoint[] = [];
  
  for (let i = 0; i < sortedFiles.length; i++) {
    const currentFile = sortedFiles[i];
    const currentDateStr = currentFile.dateStr;
    const currentKeys = new Set(currentFile.data.map(r => r.key));

    if (i === 0) {
      // Primer día: línea base
      trendData.push({
        dateStr: currentDateStr,
        active: currentKeys.size,
        new: currentKeys.size, // Al ser el primer día, todas son "nuevas" en la visualización inicial
        resolved: 0,
        persistent: 0
      });
    } else {
      const prevFile = sortedFiles[i - 1];
      const prevKeys = new Set(prevFile.data.map(r => r.key));

      let newCount = 0;
      let resolvedCount = 0;
      let persistentCount = 0;

      // Nuevas y persistentes hoy
      currentKeys.forEach(key => {
        if (prevKeys.has(key)) {
          persistentCount++;
        } else {
          newCount++;
        }
      });

      // Resueltas hoy (estaban ayer y ya no hoy)
      prevKeys.forEach(key => {
        if (!currentKeys.has(key)) {
          resolvedCount++;
        }
      });

      trendData.push({
        dateStr: currentDateStr,
        active: currentKeys.size,
        new: newCount,
        resolved: resolvedCount,
        persistent: persistentCount
      });
    }
  }

  // 4. Formatear las filas detalladas con su ciclo de vida y estado final
  const latestFileIndex = sortedFiles.length - 1;
  const latestDateStr = sortedFiles[latestFileIndex].dateStr;
  const prevDateStr = latestFileIndex > 0 ? sortedFiles[latestFileIndex - 1].dateStr : null;

  const rows: ComparisonRow[] = [];

  taskMap.forEach(task => {
    // Generar línea de tiempo cronológica
    const timeline: TimelinePoint[] = allDates.map(dateStr => ({
      dateStr,
      present: !!task.presence[dateStr],
      finding: task.findingsByDate[dateStr],
      detail: task.detailsByDate[dateStr]
    }));

    // Determinar el último hallazgo cargado
    let latestFinding = '';
    let latestDetail = '';
    let latestDate = '';

    for (let i = sortedFiles.length - 1; i >= 0; i--) {
      const dStr = sortedFiles[i].dateStr;
      if (task.presence[dStr]) {
        latestFinding = task.findingsByDate[dStr];
        latestDetail = task.detailsByDate[dStr];
        latestDate = dStr;
        break;
      }
    }

    // Clasificación de estado final según el último día analizado comparado con el anterior
    const presentLatest = !!task.presence[latestDateStr];
    const presentPrev = prevDateStr ? !!task.presence[prevDateStr] : false;

    let status: ComparisonStatus = 'PERSISTENT_SAME';

    if (presentLatest && !presentPrev) {
      status = 'NEW';
    } else if (!presentLatest && presentPrev) {
      status = 'RESOLVED';
    } else if (presentLatest && presentPrev) {
      const findLatest = task.findingsByDate[latestDateStr];
      const findPrev = task.findingsByDate[prevDateStr!];
      const detailLatest = task.detailsByDate[latestDateStr];
      const detailPrev = task.detailsByDate[prevDateStr!];

      if (findLatest === findPrev && detailLatest === detailPrev) {
        status = 'PERSISTENT_SAME';
      } else {
        status = 'PERSISTENT_CHANGED';
      }
    } else {
      // Resuelto en el pasado (no estaba ayer ni hoy, pero estuvo antes)
      status = 'RESOLVED';
    }

    rows.push({
      key: task.key,
      orderNumber: task.orderNumber,
      task: task.task,
      equipment: task.equipment,
      equipmentName: task.equipmentName,
      costCenter: task.costCenter,
      status,
      presence: task.presence,
      timeline,
      latestFinding,
      latestDetail,
      latestDate
    });
  });

  // Métricas del último día para tarjetas de KPI
  const latestTrend = trendData[trendData.length - 1];

  // Segunda lectura del mismo resultado: agrupa las tareas por orden para que
  // una orden con varias tareas no pese varias veces en la medición principal.
  const orderMap = new Map<string, OrderComparisonRow>();
  rows.forEach(row => {
    const orderKey = String(row.orderNumber);
    const existing = orderMap.get(orderKey);
    if (!existing) {
      orderMap.set(orderKey, {
        ...row,
        key: orderKey,
        task: '',
        taskCount: 1,
        activeTaskCount: allDates.reduce((count, date) => count + (row.presence[date] ? 1 : 0), 0),
        latestFinding: row.latestFinding,
        latestDetail: row.latestDetail,
      });
      return;
    }

    existing.taskCount += 1;
    existing.activeTaskCount += allDates.reduce((count, date) => count + (row.presence[date] ? 1 : 0), 0);
    allDates.forEach(date => {
      existing.presence[date] = !!existing.presence[date] || !!row.presence[date];
      const point = existing.timeline.find(item => item.dateStr === date);
      const rowPoint = row.timeline.find(item => item.dateStr === date);
      if (point && rowPoint?.present) {
        point.present = true;
        point.finding = [point.finding, rowPoint.finding].filter(Boolean).join(' | ');
        point.detail = [point.detail, rowPoint.detail].filter(Boolean).join(' | ');
      }
    });
    existing.latestFinding = [existing.latestFinding, row.latestFinding].filter(Boolean).join(' | ');
    existing.latestDetail = [existing.latestDetail, row.latestDetail].filter(Boolean).join(' | ');
    if (String(row.latestDate).localeCompare(existing.latestDate) > 0) {
      existing.latestDate = row.latestDate;
    }
  });

  const orderRows = Array.from(orderMap.values()).map(row => {
    const presentLatest = !!row.presence[latestDateStr];
    const presentPrev = prevDateStr ? !!row.presence[prevDateStr] : false;
    let status: ComparisonStatus = 'PERSISTENT_SAME';
    if (presentLatest && !presentPrev) status = 'NEW';
    else if (!presentLatest && presentPrev) status = 'RESOLVED';
    else if (presentLatest && presentPrev) {
      const latest = row.timeline.find(point => point.dateStr === latestDateStr);
      const previous = row.timeline.find(point => point.dateStr === prevDateStr);
      status = latest?.finding === previous?.finding && latest?.detail === previous?.detail
        ? 'PERSISTENT_SAME'
        : 'PERSISTENT_CHANGED';
    } else if (!presentLatest && !presentPrev) status = 'RESOLVED';
    return { ...row, status };
  });

  const orderTrendData = sortedFiles.map((file, index) => {
    const currentKeys = new Set(file.data.filter(row => !row.excludedFromMeasurement).map(row => String(row.orderNumber)));
    const previousKeys = index > 0
      ? new Set(sortedFiles[index - 1].data.filter(row => !row.excludedFromMeasurement).map(row => String(row.orderNumber)))
      : new Set<string>();
    let newCount = 0;
    let resolvedCount = 0;
    let persistentCount = 0;
    currentKeys.forEach(key => previousKeys.has(key) ? persistentCount++ : newCount++);
    previousKeys.forEach(key => { if (!currentKeys.has(key)) resolvedCount++; });
    return { dateStr: file.dateStr, active: currentKeys.size, new: newCount, resolved: resolvedCount, persistent: persistentCount };
  });

  const orderSummary = {
    totalFiles: files.length,
    latestTotal: orderTrendData[orderTrendData.length - 1]?.active || 0,
    latestResolved: orderTrendData[orderTrendData.length - 1]?.resolved || 0,
    latestNew: orderTrendData[orderTrendData.length - 1]?.new || 0,
    latestPersistent: orderTrendData[orderTrendData.length - 1]?.persistent || 0,
    totalDiscovered: new Set(orderRows.map(row => row.key)).size
  };

  return {
    summary: {
      totalFiles: files.length,
      latestTotal: latestTrend.active,
      latestResolved: latestTrend.resolved,
      latestNew: latestTrend.new,
      latestPersistent: latestTrend.persistent,
      totalDiscovered: taskMap.size
    },
    trendData,
    rows,
    orderRows,
    orderSummary,
    orderTrendData,
    orderCostCenters: Array.from(new Set(orderRows.map(row => row.costCenter))).filter(Boolean).sort(),
    costCenters: Array.from(costCentersSet).filter(Boolean).sort(),
    allDates
  };
}
