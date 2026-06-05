import { Injectable } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import type { Document } from '../../../core/models';
import type { AppRole } from '../../../core/models/auth.model';

@Injectable({ providedIn: 'root' })
export class GedPermissionsService {
  constructor(private authService: AuthService) {}

  canManageGed(): boolean {
    return this.authService.hasRole('ADMIN', 'QUALITY_MANAGER');
  }

  canCreateGedDocument(): boolean {
    return this.canManageGed() || this.authService.hasRole('EMPLOYEE');
  }

  canPublish(): boolean {
    return this.authService.hasPermission('PUBLISH_DOCUMENT');
  }

  canSubmit(document: Document): boolean {
    return !document.isArchived && (document.gedStatus === 'Brouillon' || document.gedStatus === 'Refuse');
  }

  canApprove(document: Document): boolean {
    return this.canManageGed() && !document.isArchived && document.gedStatus === 'En attente qualite';
  }

  canPublishDocument(document: Document): boolean {
    return (
      this.canManageGed() &&
      this.canPublish() &&
      !document.isArchived &&
      document.gedStatus === 'Valide qualite'
    );
  }

  canArchiveDocument(document: Document): boolean {
    return this.canManageGed() && !document.isArchived;
  }

  canEditDocument(): boolean {
    return this.canManageGed();
  }

  canViewAuditLogs(): boolean {
    return this.authService.hasRole('ADMIN');
  }

  hasRole(...roles: AppRole[]): boolean {
    return this.authService.hasRole(...roles);
  }
}
