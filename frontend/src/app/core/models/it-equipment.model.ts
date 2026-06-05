export type ItEquipmentState =
  | 'OPERATIONAL'
  | 'IN_REPAIR'
  | 'IN_MAINTENANCE'
  | 'OUT_OF_SERVICE'
  | 'ARCHIVED';

export type ItEquipmentAssignmentStatus = 'NOT_ASSIGNED' | 'ASSIGNED';

export interface ItEquipmentCategory {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItEquipment {
  id: string;
  categoryId: string;
  name: string;
  serialNumber: string;
  categoryName: string;
  brand?: string;
  model?: string;
  state: ItEquipmentState;
  assignmentStatus: ItEquipmentAssignmentStatus;
  description?: string;
  currentEmployeeId?: string;
  currentEmployeeName?: string;
  assignedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItEquipmentAssignment {
  id: string;
  equipmentId: string;
  equipmentName: string;
  equipmentSerialNumber: string;
  equipmentCategoryName: string;
  employeeId: string;
  employeeName: string;
  status: string;
  assignedAt: Date;
  returnedAt?: Date;
  assignedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItAssignableEmployee {
  username: string;
  fullName: string;
  email: string;
  departmentName?: string;
}
