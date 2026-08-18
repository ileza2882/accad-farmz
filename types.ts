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
  LIVESTOCK = 'Livestock Inventory',
  HATCHERY = 'Hatchery Record'
}

export enum FisherySection {
  GROW_OUT = 'Grow-Out Section',
  HATCHERY = 'Hatchery Section'
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
    totalBags?: number | string;
    totalFeedsInStore?: number | string;
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
    pumpingMachineA?: 'Good' | 'Faulty' | 'Needs Maintenance';
    pumpingMachineB?: 'Good' | 'Faulty' | 'Needs Maintenance';
    pumpingMachineC?: 'Good' | 'Faulty' | 'Needs Maintenance';
    pumpingMachineD?: 'Good' | 'Faulty' | 'Needs Maintenance';
    pumpingMachineE?: 'Good' | 'Faulty' | 'Needs Maintenance';
    pumpingMachine?: 'Good' | 'Faulty' | 'Needs Maintenance';
    chineseMixer?: 'Good' | 'Faulty' | 'Needs Maintenance';
    locallyFabricatedMixer?: 'Good' | 'Faulty' | 'Needs Maintenance';
    chineseGrindingMachine?: 'Good' | 'Faulty' | 'Needs Maintenance';
    locallyFabricatedGrindingMachine?: 'Good' | 'Faulty' | 'Needs Maintenance';
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
  lockedSections?: Record<string, boolean>;
}

export const MACHINE_LABELS: Record<string, string> = {
  localWetMixer: 'Local Wet Mixer',
  grinder: 'Grinder',
  dryerUnit: 'Dryer Unit',
  extrudingPelletingMachine: 'Extruding/Pelleting Machine',
  pumpingMachineA: '1.5 HP pumping machine – A',
  pumpingMachineB: '1.5 HP pumping machine – B (not in use)',
  pumpingMachineC: '1.5 HP pumping machine – C',
  pumpingMachineD: '1 HP pumping machine – D',
  pumpingMachineE: '5.5 HP pumping machine – E',
  chineseMixer: 'Chinese mixer',
  locallyFabricatedMixer: 'Locally fabricated mixer',
  chineseGrindingMachine: 'Chinese grinding machine',
  locallyFabricatedGrindingMachine: 'Locally fabricated grinding machine',
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
  // Immutability & Change Request Workflow
  isLocked?: boolean;
  lockedAt?: number;
  lockedBy?: string;
  lockedRows?: Record<string, boolean>;
  changeRequestStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  changeRequestReason?: string;
  changeRequestedBy?: string;
  changeRequestedAt?: number;
  changeRequestReviewedBy?: string;
  changeRequestReviewedAt?: number;
}

export interface FisheryLivestockFormData {
  ponds: FisheryLivestockPondData[];
  generalNotes?: string;
  isDraft?: boolean;
  isArchived?: boolean;
}

export const BROODSTOCK_SOURCE_OPTIONS = [
  'Outside the Farm',
  'Farm Produced'
];

export const BATCH_NUMBER_OPTIONS = [
  '1st', '2nd', '3rd', '4th', '5th',
  '6th', '7th', '8th', '9th', '10th',
  '11th', '12th', '13th', '14th', '15th',
  '16th', '17th', '18th', '19th', '20th',
  '21st', '22nd', '23rd', '24th', '25th',
  '26th', '27th', '28th', '29th', '30th'
];

export interface FisheryHatcheryBatchData {
  sourceOfBroodstock: string;
  batchNumber: string;
  hatcheryDate: string;
  firstDateOfFeeding: string;
  dateOfTransferToGrowOut: string;
  totalTransferredFingerlings: number | string;
  averageWeightTransferred: number | string;
  ageOfFingerlingsTransferred: number | string;
  healthStatusTransferred: 'Excellent' | 'Good' | 'Fair' | 'Under Observation' | 'Poor' | string;
  destinatedPondTransferred: string;
  remarks?: string;
  // Immutability & Change Request Workflow
  isLocked?: boolean;
  lockedAt?: number;
  lockedBy?: string;
  lockedRows?: Record<string, boolean>;
  changeRequestStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  changeRequestReason?: string;
  changeRequestedBy?: string;
  changeRequestedAt?: number;
  changeRequestReviewedBy?: string;
  changeRequestReviewedAt?: number;
}

export interface HatcheryChangeRequest {
  id: string;
  reportId: string;
  batchIndex: number;
  batchNumber: string;
  requestedBy: string;
  requestedByEmail: string;
  requestedAt: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  reviewedAt?: number;
  reviewNotes?: string;
}

export interface FisheryHatcheryFormData {
  batches: FisheryHatcheryBatchData[];
  generalNotes?: string;
  isDraft?: boolean;
}

export type HatcheryStage = 'Incubation' | 'Feeding Phase' | 'Fingerling Development' | 'Transferred to Grow-Out';

export function getHatcheryBatchStage(batch?: Partial<FisheryHatcheryBatchData>): {
  stage: HatcheryStage;
  progressPercent: number;
  badgeColor: string;
  isComplete: boolean;
} {
  if (!batch) {
    return {
      stage: 'Incubation',
      progressPercent: 10,
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
      isComplete: false
    };
  }

  const hasTransfer = Boolean(batch.dateOfTransferToGrowOut && batch.totalTransferredFingerlings && Number(batch.totalTransferredFingerlings) > 0);
  const hasDevelopment = Boolean(batch.averageWeightTransferred || batch.ageOfFingerlingsTransferred);
  const hasFeeding = Boolean(batch.firstDateOfFeeding);
  const hasHatching = Boolean(batch.hatcheryDate || batch.sourceOfBroodstock);

  if (hasTransfer) {
    return {
      stage: 'Transferred to Grow-Out',
      progressPercent: 100,
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      isComplete: true
    };
  }
  if (hasDevelopment) {
    return {
      stage: 'Fingerling Development',
      progressPercent: 75,
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      isComplete: false
    };
  }
  if (hasFeeding) {
    return {
      stage: 'Feeding Phase',
      progressPercent: 50,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      isComplete: false
    };
  }
  if (hasHatching) {
    return {
      stage: 'Incubation',
      progressPercent: 25,
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      isComplete: false
    };
  }
  return {
    stage: 'Incubation',
    progressPercent: 10,
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
    isComplete: false
  };
}

export interface Report {
  id: string;
  userId: string;
  email: string; // User email for identification
  fullName?: string; // Staff name for manager/ED view
  department: Department;
  inventoryType: InventoryType;
  section?: FisherySection | string;
  title: string;
  content: string;
  timestamp: number;
  status: ReportStatus;
  formData?: FisheryAssetFormData | FisheryLivestockFormData | FisheryHatcheryFormData | any;
  isReEntry?: boolean;
  rejectionReason?: string;
  rejectedBy?: string;
  rejectedAt?: number;
  managerApprovedBy?: string;
  edApprovedBy?: string;
  computerName?: string;
  updatedAt?: number;
  isArchived?: boolean;
  archivedAt?: number;
  archivedBy?: string;
  // Resubmission & Redo tracking
  isResubmitted?: boolean;
  resubmittedAt?: number;
  resubmissionCount?: number;
  previousRejectionReason?: string;
  redoNotes?: string;
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