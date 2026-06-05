// Document Management (GED) Models
export enum UserRole {
  ARCHIVIST = 'ARCHIVIST',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER'
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon?: string;
  createdAt: Date;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: Date;
  downloadUrl: string;
  changeLog?: string;
}

export interface Document {
  id: string;
  folderId?: string;
  title: string;
  description?: string;
  category: Category;
  categoryId: string;
  mainCategory?: string;
  subCategory?: string;
  categorieNom?: string;
  typeCategorie?: string;
  direction?: string;
  gedStatus?:
    | 'Publie'
    | 'Valide qualite'
    | 'Valide qualite (publiable)'
    | 'En attente qualite'
    | 'Brouillon'
    | 'Refuse'
    | 'Archive'
    | 'Obsolete';
  referenceCode?: string;
  confidentialityLevel?: 'PUBLIC' | 'INTERNAL' | 'RESTRICTED' | 'CONFIDENTIAL';
  currentVersionNumber?: number;
  ownerService?: string;
  versions: DocumentVersion[];
  currentVersion: DocumentVersion;
  author: string;
  uploadedAt: Date;
  updatedAt: Date;
  accessControl: {
    roles: UserRole[];
    specificUsers?: string[];
  };
  tags?: string[];
  isArchived: boolean;
  fileSize: number;
  previewUrl?: string;
}

export interface DocumentSearchFilter {
  searchTerm?: string;
  categoryId?: string;
  author?: string;
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  roles?: UserRole[];
}
