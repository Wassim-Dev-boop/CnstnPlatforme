// Technical Interventions Management Models
export enum InterventionStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

export enum InterventionPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface InterventionAssignment {
  id: string;
  interventionId: string;
  technicianId: string;
  technicianName: string;
  assignedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  notes?: string;
}

export interface Intervention {
  id: string;
  title: string;
  description: string;
  type: 'MAINTENANCE' | 'REPAIR' | 'INSTALLATION' | 'SUPPORT' | 'OTHER';
  priority: InterventionPriority;
  status: InterventionStatus;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  location: string;
  assignment?: InterventionAssignment;
  createdAt: Date;
  updatedAt: Date;
  estimatedCompletionDate?: Date;
  resolutionDate?: Date;
  attachments?: string[];
  notes?: string;
  resolution?: string;
  satisfactionRating?: number;
}

export interface InterventionFilter {
  searchTerm?: string;
  status?: InterventionStatus;
  priority?: InterventionPriority;
  technicianId?: string;
  requesterId?: string;
  startDate?: Date;
  endDate?: Date;
}
