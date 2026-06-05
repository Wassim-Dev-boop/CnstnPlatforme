// Room & Equipment Reservations Models
export interface Room {
  id: string;
  name: string;
  description: string;
  capacity: number;
  location: string;
  status?: 'DISPONIBLE' | 'OCCUPEE' | 'MAINTENANCE' | 'INACTIVE';
  amenities: string[];
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface RoomReservation {
  id: string;
  referenceCode?: string;
  businessVersion?: number;
  eventId?: string;
  roomId: string;
  roomName: string;
  userId: string;
  userName: string;
  title: string;
  purpose: string;
  startDate: Date;
  endDate: Date;
  attendeeCount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
  approvedBy?: string;
  approvalDate?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Equipment {
  id: string;
  name: string;
  description: string;
  category: 'PROJECTOR' | 'LAPTOP' | 'CAMERA' | 'MICROPHONE' | 'SCREEN' | 'OTHER';
  type?: string;
  serialNumber: string;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'RETIRED';
  totalQuantity?: number;
  availableQuantity?: number;
  isActive?: boolean;
  location: string;
  imageUrl?: string;
  createdAt: Date;
}

export interface EquipmentReservation {
  id: string;
  referenceCode?: string;
  businessVersion?: number;
  eventId?: string;
  equipmentId: string;
  equipmentName: string;
  quantityRequested?: number;
  userId: string;
  userName: string;
  purpose: string;
  startDate: Date;
  endDate: Date;
  status: 'PENDING' | 'APPROVED' | 'IN_USE' | 'RETURNED' | 'CANCELLED';
  approvedBy?: string;
  pickedUpAt?: Date;
  returnedAt?: Date;
  approvalDate?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomAvailability {
  roomId: string;
  date: Date;
  availableTimeSlots: {
    startTime: string;
    endTime: string;
  }[];
}
