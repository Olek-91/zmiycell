export interface Material {
  id: string;
  name: string;
  unit: string;
  stock: number;
}

export interface BOMItem {
  matId: string;
  qty: number;
}

export interface BatteryType {
  id: string;
  name: string;
  color: string;
  bom: BOMItem[];
}

export const BATTERY_TYPES: BatteryType[] = [
  {
    id: 'TYPE_1',
    name: '16s3p 230Ah',
    color: '#39FF14', // Toxic Green
    bom: [
      { matId: 'CELL_230', qty: 48 },
      { matId: 'BMS_JK_16S', qty: 1 },
      { matId: 'ANDERSON_175', qty: 1 },
      { matId: 'CABLE_KGT25', qty: 2.5 },
      { matId: 'STUDS', qty: 32 },
      { matId: 'NUTS', qty: 64 },
      { matId: 'LED_RES', qty: 1 },
    ]
  },
  {
    id: 'TYPE_2',
    name: '15s1p 150Ah CATL',
    color: '#00D1FF', // Electric Blue
    bom: [
      { matId: 'CELL_150', qty: 15 },
      { matId: 'BMS_JK_15S', qty: 1 },
      { matId: 'WELDED_CASE', qty: 1 },
      { matId: 'HEATER', qty: 1 },
    ]
  },
  {
    id: 'TYPE_3',
    name: '8s2p CATL',
    color: '#F97316', // Orange
    bom: [
      { matId: 'CELL_CATL_8S', qty: 16 },
      { matId: 'BMS_JK_8S', qty: 1 },
      { matId: 'STUD_SET', qty: 1 },
    ]
  }
];
