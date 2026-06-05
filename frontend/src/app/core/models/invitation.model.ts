// Invitations Management Models
export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

export interface Invitation {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: Date;
  eventEndDate?: Date;
  eventMode?: 'PRESENTIEL' | 'EN_LIGNE' | 'HYBRIDE';
  eventLocation: string;
  onlineMeetingLink?: string;
  recipientId: string;
  recipientUsername?: string;
  recipientEmail: string;
  recipientName: string;
  senderId: string;
  senderUsername?: string;
  senderName: string;
  status: InvitationStatus;
  sentAt: Date;
  expiresAt?: Date;
  respondedAt?: Date;
  message?: string;
  responseReason?: string;
  isExternalPartner?: boolean;
  isVerifiedByDsn?: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  partnerOrganization?: string;
}

export interface InvitationResponse {
  invitationId: string;
  status: InvitationStatus;
  responseReason?: string;
  respondedAt: Date;
}
