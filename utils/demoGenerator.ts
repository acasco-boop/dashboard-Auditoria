import { TaskDiscrepancy } from './excelParser';

export interface ProcessedFile {
  name: string;
  dateStr: string;
  date: Date;
  data: TaskDiscrepancy[];
}

const bases = ['CIUD', 'PACH', 'PIER', 'PILA', 'SANI', 'LUJA', 'ZARA'];
const orderTypes = ['Correctivo', 'Preventivo', 'Predictivo'];
const equipmentList = [
  { code: 'KNE956', name: 'AXOR 1933 - CAMION' },
  { code: 'LPM124', name: 'MB 2541 - ACTROS' },
  { code: 'OPD876', name: 'SEMI REMOLQUE BAIML' },
  { code: 'JHB321', name: 'AXOR 2036 - CAMION' },
  { code: 'AA543BB', name: 'FORD CARGO 1722' },
  { code: 'AD876CC', name: 'SCANIA G310' }
];

const tasksDefinitions = [
  { task: 'Cambiar Cinta Frenos 3Eje', finding: "2) Desconexión de material (Falta 'CINTA FRENOS')", detail: 'Materiales cargados no coinciden: PRECINTOS GRETEL 400X4,8MM, TORNILLO HEXAGONAL 5/16' },
  { task: 'Colocar Paragolpes Trasero', finding: "2) Desconexión de material (Falta 'PARAGOLPE')", detail: 'Materiales cargados no coinciden: BATERIA 12V 90A - MOURA, BULONES 1/2"' },
  { task: 'Colocar Grafica TDU', finding: '1) Orden sin repuestos asignados', detail: 'Ningún material cargado en la orden' },
  { task: 'Cambiar Radiador De Calefaccion', finding: "2) Desconexión de material (Falta 'MOTOR DE CALEFACCION')", detail: 'Materiales cargados no coinciden: MANGUERA DE AGUA 5/8, ABRAZADERA 16-25MM' },
  { task: 'Colocar Tanque Aire', finding: "2) Desconexión de material (Falta 'DEPOSITO')", detail: 'Materiales cargados no coinciden: AMORTIGUADOR MB 2541, VALVULA DE PURGA' },
  { task: 'Reemplazo Amortiguadores Delanteros', finding: "2) Desconexión de material (Falta 'AMORTIGUADOR SACHS')", detail: 'Materiales cargados no coinciden: ARANDELAS PLANAS DE 8MM, TUERCA AUTOFRENANTE' },
  { task: 'Service 50.000 KM', finding: '3) Planificado sin Salida física (Salidas = 0)', detail: 'Materiales cargados no coinciden: ACEITE 15W40 TAMBOR, FILTRO DE AIRE MANN' },
  { task: 'Reparación Instalación Eléctrica Luces', finding: "2) Desconexión de material (Falta 'FARO LED BAIML')", detail: 'Materiales cargados no coinciden: CABLE TERMOCONTRAIBLE, LAMPARA 24V 5W' },
  { task: 'Cambio de Parabrisas', finding: "2) Desconexión de material (Falta 'PARABRISAS MB')", detail: 'Materiales cargados no coinciden: SELLADOR DE POLIURETANO, CINTA ENMASCARAR' },
  { task: 'Ajuste de Dirección y Extremos', finding: "2) Desconexión de material (Falta 'EXTREMO')", detail: 'Materiales cargados no coinciden: FUELLE DIRECCION, GRASA MULTIPROPOSITO' }
];

export function generateDemoData(): ProcessedFile[] {
  const day13: TaskDiscrepancy[] = [];
  const day14: TaskDiscrepancy[] = [];
  const day15: TaskDiscrepancy[] = [];

  let baseOrderNum = 35000;

  // --- DÍA 13/07/2026 (70 tareas) ---
  for (let i = 0; i < 70; i++) {
    const orderNumber = baseOrderNum + i;
    const taskDef = tasksDefinitions[i % tasksDefinitions.length];
    const equip = equipmentList[i % equipmentList.length];
    const costCenter = bases[i % bases.length];
    const orderType = orderTypes[i % orderTypes.length];
    const key = `${orderNumber} - ${taskDef.task}`;

    day13.push({
      orderNumber,
      orderType,
      costCenter,
      isAccounted: i % 5 === 0 ? 'No' : 'Si',
      orderDate: '10/07/2026',
      docStatus: 'C',
      equipment: equip.code,
      equipmentName: equip.name,
      task: taskDef.task,
      taskState: 'Terminada',
      findingType: taskDef.finding,
      detail: taskDef.detail,
      downloadDate: '13/07/2026',
      controlState: ' - ',
      okState: '',
      excludedFromMeasurement: false,
      key
    });
  }

  // --- DÍA 14/07/2026 (50 persisten, 20 resueltas, 30 nuevas = 80 total) ---
  
  // 50 persisten de ayer
  for (let i = 0; i < 50; i++) {
    day14.push({
      ...day13[i],
      downloadDate: '14/07/2026'
    });
  }
  // (Las tareas 50 a 69 del 13/07 se resuelven aquí)

  // 30 nuevas discrepancias el 14/07
  for (let i = 0; i < 30; i++) {
    const orderNumber = baseOrderNum + 100 + i;
    const taskDef = tasksDefinitions[(i + 3) % tasksDefinitions.length];
    const equip = equipmentList[(i + 1) % equipmentList.length];
    const costCenter = bases[(i + 2) % bases.length];
    const orderType = orderTypes[(i + 1) % orderTypes.length];
    const key = `${orderNumber} - ${taskDef.task}`;

    day14.push({
      orderNumber,
      orderType,
      costCenter,
      isAccounted: 'Si',
      orderDate: '12/07/2026',
      docStatus: 'C',
      equipment: equip.code,
      equipmentName: equip.name,
      task: taskDef.task,
      taskState: 'Terminada',
      findingType: taskDef.finding,
      detail: taskDef.detail,
      downloadDate: '14/07/2026',
      controlState: ' - ',
      okState: '',
      excludedFromMeasurement: false,
      key
    });
  }

  // --- DÍA 15/07/2026 (40 de 14/07 persisten, 40 se resuelven, 25 nuevas = 65 total) ---
  
  // 25 persisten de las primeras 50 (las 13/07 que aún siguen vivas)
  for (let i = 0; i < 25; i++) {
    day15.push({
      ...day14[i],
      downloadDate: '15/07/2026'
    });
  }

  // 15 persisten de las nuevas que entraron el 14/07 (las tareas 50 a 64 de day14)
  for (let i = 50; i < 65; i++) {
    const original = day14[i];
    // Le hacemos una modificación de hallazgo/materiales a 5 de ellas para marcar "Pendiente Modificado"
    const modify = i % 3 === 0;
    day15.push({
      ...original,
      findingType: modify ? original.findingType + " e HILO DE LINO" : original.findingType,
      detail: modify ? original.detail + ", HILO DE LINO" : original.detail,
      downloadDate: '15/07/2026'
    });
  }

  // (Las tareas 25 a 49 y 65 a 79 de day14 se resuelven aquí)

  // 25 nuevas el 15/07
  for (let i = 0; i < 25; i++) {
    const orderNumber = baseOrderNum + 200 + i;
    const taskDef = tasksDefinitions[(i + 5) % tasksDefinitions.length];
    const equip = equipmentList[(i + 3) % equipmentList.length];
    const costCenter = bases[(i + 3) % bases.length];
    const orderType = orderTypes[(i + 2) % orderTypes.length];
    const key = `${orderNumber} - ${taskDef.task}`;

    day15.push({
      orderNumber,
      orderType,
      costCenter,
      isAccounted: 'Si',
      orderDate: '14/07/2026',
      docStatus: 'C',
      equipment: equip.code,
      equipmentName: equip.name,
      task: taskDef.task,
      taskState: 'Terminada',
      findingType: taskDef.finding,
      detail: taskDef.detail,
      downloadDate: '15/07/2026',
      controlState: ' - ',
      okState: '',
      excludedFromMeasurement: false,
      key
    });
  }

  return [
    {
      name: 'Auditoria_Mantenimiento_Generado (13-07).xlsx',
      dateStr: '13/07/2026',
      date: new Date(2026, 6, 13),
      data: day13
    },
    {
      name: 'Auditoria_Mantenimiento_Generado (14-07).xlsx',
      dateStr: '14/07/2026',
      date: new Date(2026, 6, 14),
      data: day14
    },
    {
      name: 'Auditoria_Mantenimiento_Generado (15-07).xlsx',
      dateStr: '15/07/2026',
      date: new Date(2026, 6, 15),
      data: day15
    }
  ];
}
