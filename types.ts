export enum Role {
  STAFF = 'STAFF',
  MANAGER = 'MANAGER',
  EXECUTIVE_DIRECTOR = 'EXECUTIVE_DIRECTOR' // Also acts as ADMIN
}

export enum Department {
  FISHERY = 'Fishery',
  POULTRY = 'Poultry',
  CATTLE = 'Cattle',
  PIGS = 'Pigs'
}

export enum InventoryType {
  ASSET = 'Asset Inventory',
  LIVESTOCK = 'Livestock Inventory'
}

export enum ReportStatus {
  PENDING_MANAGER = 'pending_manager',
  PENDING_ED = 'pending_ed',
  APPROVED = 'approved',
  REJECTED_BY_MANAGER = 'rejected_by_manager',
  REJECTED_BY_ED = 'rejected_by_ed'
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: Role;
  department?: Department;
  staffId?: string;
  position?: string;
  status: 'active' | 'inactive';
  profilePicture?: string;
  password?: string;
  createdAt?: number;
}

export interface FisheryAssetFormData {
  feedsInventory: {
    items: { 
      type: 'Branded' | 'Farm-produced'; 
      size: string; 
      brand?: string; 
      quantityKg: number | string 
    }[];
    totalBags: number | string;
    totalFeedsInStore: number | string;
  };
  ingredientsUsed: {
    wheatOffal: number | string;
    fishMeal: number | string;
    meatMeal: number | string;
    bloodMeal: number | string;
    limestone: number | string;
    fishOil: number | string;
    soyaOil: number | string;
    gnc: number | string;
    maize: number | string;
    soyaBeans: number | string;
    cassava: number | string;
    klinoFeeds: number | string;
    lysine: number | string;
    probiotic: number | string;
    enzyme: number | string;
    fishPremix: number | string;
    methionine: number | string;
    dcp: number | string;
    salt: number | string;
    ascorbicAcid: number | string;
    [key: string]: number | string | undefined;
  };
  drugsUsed: {
    klinoFeed: number | string;
    lysine: number | string;
    probiotic: number | string;
    enzyme: number | string;
    fishPremix: number | string;
    toxin: number | string;
    methionine: number | string;
    dcp: number | string;
    salt: number | string;
  };
  machineCheck: {
    localWetMixer: 'Good' | 'Faulty' | 'Needs Maintenance';
    grinder: 'Good' | 'Faulty' | 'Needs Maintenance';
    dryerUnit: 'Good' | 'Faulty' | 'Needs Maintenance';
    extrudingPelletingMachine?: 'Good' | 'Faulty' | 'Needs Maintenance';
    pelletQuality?: 'Good' | 'Faulty' | 'Needs Maintenance';
    shapeQuality: 'Good' | 'Faulty' | 'Needs Maintenance';
    pumpingMachineA?: 'Good' | 'Faulty' | 'Needs Maintenance';
    pumpingMachineB?: 'Good' | 'Faulty' | 'Needs Maintenance';
    pumpingMachineC?: 'Good' | 'Faulty' | 'Needs Maintenance';
    pumpingMachineD?: 'Good' | 'Faulty' | 'Needs Maintenance';
    pumpingMachineE?: 'Good' | 'Faulty' | 'Needs Maintenance';
    pumpingMachine?: 'Good' | 'Faulty' | 'Needs Maintenance';
    solarSystemA?: 'Good' | 'Faulty' | 'Needs Maintenance';
    solarSystemB?: 'Good' | 'Faulty' | 'Needs Maintenance';
    solarSystemC?: 'Good' | 'Faulty' | 'Needs Maintenance';
    solarSystemD?: 'Good' | 'Faulty' | 'Needs Maintenance';
    solarSystemE?: 'Good' | 'Faulty' | 'Needs Maintenance';
    solarInverter?: 'Good' | 'Faulty' | 'Needs Maintenance';
    [key: string]: 'Good' | 'Faulty' | 'Needs Maintenance' | undefined;
  };
  feedStorage: {
    totalFeedInStoreKg: number | string;
    machineIssues: { hasIssue: boolean; comment: string };
    wastageNoticed: { hasWastage: boolean; comment: string };
  };
  technicalReport: {
    dieselGeneratorLitres: number | string;
    dieselKegsLitres: number | string;
    totalDieselAvailable: number | string;
    generatorMeterPhoto?: string;
  };
}

export const MACHINE_LABELS: Record<string, string> = {
  localWetMixer: 'Local Wet Mixer',
  grinder: 'Grinder',
  dryerUnit: 'Dryer Unit',
  extrudingPelletingMachine: 'Extruding/Pelleting Machine',
  pelletQuality: 'Extruding/Pelleting Machine',
  shapeQuality: 'Shape Quality',
  pumpingMachineA: '1.5 HP pumping machine – A',
  pumpingMachineB: '1.5 HP pumping machine – B (not in use)',
  pumpingMachineC: '1.5 HP pumping machine – C',
  pumpingMachineD: '1 HP pumping machine – D',
  pumpingMachineE: '5.5 HP pumping machine – E',
  solarSystemA: 'Solar system A',
  solarSystemB: 'Solar system B',
  solarSystemC: 'Solar system C',
  solarSystemD: 'Solar system D',
  solarSystemE: 'Solar system E',
  pumpingMachine: 'Pumping Machine (General)',
  solarInverter: 'Solar Inverter (General)'
};

export interface FisheryLivestockPondData {
  pondNo: string;
  pondSizeSqm: number | string;
  quantityOfFish: number | string;
  batch: string;
  waterCondition: 'Clear' | 'Unclear';
  waterChangedToday: {
    hasChanged: boolean;
    times?: number | string;
  };
  feedingRecords: {
    items: { 
      type: 'Branded' | 'Farm-produced'; 
      size: string; 
      brand?: string; 
      quantityKg: number | string 
    }[];
  };
  feedingResponse: 'Active' | 'Slow' | 'Poor';
  mortality: number | string;
  pondPhoto?: string;
}

export interface FisheryLivestockFormData {
  ponds: FisheryLivestockPondData[];
}

export interface Report {
  id: string;
  userId: string;
  email: string; // User email for identification
  fullName?: string; // Staff name for manager/ED view
  department: Department;
  inventoryType: InventoryType;
  title: string;
  content: string;
  timestamp: number;
  status: ReportStatus;
  formData?: FisheryAssetFormData | FisheryLivestockFormData | any;
  isReEntry?: boolean;
  rejectionReason?: string;
  managerApprovedBy?: string;
  edApprovedBy?: string;
  computerName?: string;
  updatedAt?: number;
}

export interface NotificationItem {
  id: string;
  userId: string;
  userEmail: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: number;
}

export interface AuditLog {
  id: string;
  actorName: string;
  actorEmail: string;
  action: string;
  details: string;
  timestamp: number;
}

export interface AppState {
  currentUser: User | null;
  selectedDepartment: Department | null;
  selectedInventoryType: InventoryType | null;
}