import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EventPhoto } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { EventService } from '../../../core/services/event.service';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'app-event-album',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './event-album.component.html',
})
export class EventAlbumComponent implements OnInit, OnDestroy {
  readonly maxFileSizeBytes = 10 * 1024 * 1024;
  readonly allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

  eventId = '';
  eventTitle = 'Evenement';
  photos: EventPhoto[] = [];
  isLoading = false;
  isUploading = false;
  uploadError = '';
  uploadSuccess = '';

  selectedFile: File | null = null;
  selectedFileName = '';
  selectedFileSize = 0;
  selectedFileType = '';

  previewPhoto: EventPhoto | null = null;
  previewUrl: string | null = null;
  previewError = '';

  private routeSubscription?: Subscription;
  private photoObjectUrls = new Map<string, string>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly eventService: EventService,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      this.eventId = params.get('id') ?? '';
      if (!this.eventId) {
        void this.router.navigate(['/events']);
        return;
      }
      this.loadEventContext();
      this.loadPhotos();
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.revokeAllPhotoUrls();
  }

  get canManageAlbum(): boolean {
    return this.authService.hasPermission('CREATE_EVENT');
  }

  get hasPhotos(): boolean {
    return this.photos.length > 0;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.uploadError = '';
    this.uploadSuccess = '';

    if (!file) {
      this.clearSelectedFile();
      return;
    }

    this.selectedFile = file;
    this.selectedFileName = file.name;
    this.selectedFileSize = file.size;
    this.selectedFileType = file.type || 'inconnu';
  }

  clearSelectedFile(): void {
    this.selectedFile = null;
    this.selectedFileName = '';
    this.selectedFileSize = 0;
    this.selectedFileType = '';
  }

  uploadSelectedPhoto(): void {
    if (!this.canManageAlbum || this.isUploading) {
      return;
    }

    this.uploadError = '';
    this.uploadSuccess = '';

    if (!this.selectedFile) {
      this.uploadError = 'Veuillez choisir une image avant de continuer.';
      return;
    }

    if (!this.allowedMimeTypes.includes((this.selectedFile.type || '').toLowerCase())) {
      this.uploadError = 'Type non autorise. Utilisez PNG, JPG, JPEG ou WEBP.';
      return;
    }

    if (this.selectedFile.size <= 0) {
      this.uploadError = 'Le fichier selectionne est vide.';
      return;
    }

    if (this.selectedFile.size > this.maxFileSizeBytes) {
      this.uploadError = 'La taille maximale autorisee est de 10 Mo.';
      return;
    }

    this.isUploading = true;
    this.eventService.uploadEventPhoto(this.eventId, this.selectedFile).subscribe({
      next: () => {
        this.isUploading = false;
        this.uploadSuccess = 'Photo ajoutee avec succes.';
        this.clearSelectedFile();
        this.loadPhotos();
      },
      error: (error) => {
        this.isUploading = false;
        this.uploadError = error?.error?.detail || error?.message || 'Echec de l upload de la photo.';
      },
    });
  }

  openPreview(photo: EventPhoto): void {
    this.previewPhoto = photo;
    this.previewError = '';
    const existingUrl = this.photoObjectUrls.get(photo.id);
    if (existingUrl) {
      this.previewUrl = existingUrl;
      return;
    }

    this.previewUrl = null;
    this.eventService.getEventPhotoBlob(this.eventId, photo.id).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        this.photoObjectUrls.set(photo.id, objectUrl);
        this.previewUrl = objectUrl;
      },
      error: () => {
        this.previewError = 'Apercu indisponible pour cette photo.';
      },
    });
  }

  closePreview(): void {
    this.previewPhoto = null;
    this.previewUrl = null;
    this.previewError = '';
  }

  downloadPhoto(photo: EventPhoto): void {
    this.eventService.downloadEventPhoto(this.eventId, photo).subscribe({
      error: (error) => {
        this.uploadError = error?.error?.detail || error?.message || 'Telechargement impossible.';
      },
    });
  }

  archivePhoto(photo: EventPhoto): void {
    if (!this.canManageAlbum) {
      return;
    }
    const confirmed = window.confirm('Archiver cette photo ?');
    if (!confirmed) {
      return;
    }

    this.eventService.archiveEventPhoto(this.eventId, photo.id).subscribe({
      next: () => {
        const objectUrl = this.photoObjectUrls.get(photo.id);
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          this.photoObjectUrls.delete(photo.id);
        }
        this.photos = this.photos.filter((item) => item.id !== photo.id);
      },
      error: (error) => {
        this.uploadError = error?.error?.detail || error?.message || 'Archivage impossible.';
      },
    });
  }

  photoPreviewUrl(photoId: string): string | null {
    return this.photoObjectUrls.get(photoId) ?? null;
  }

  formatFileSize(fileSize: number): string {
    if (fileSize < 1024) {
      return `${fileSize} o`;
    }
    if (fileSize < 1024 * 1024) {
      return `${(fileSize / 1024).toFixed(1)} Ko`;
    }
    return `${(fileSize / (1024 * 1024)).toFixed(1)} Mo`;
  }

  private loadEventContext(): void {
    this.eventService.getEventById(this.eventId).subscribe((event) => {
      if (event) {
        this.eventTitle = event.title;
      }
    });
  }

  private loadPhotos(): void {
    this.isLoading = true;
    this.uploadError = '';
    this.eventService.listEventPhotos(this.eventId).subscribe({
      next: (photos) => {
        this.isLoading = false;
        this.photos = photos;
        this.loadPhotoPreviews(photos);
      },
      error: (error) => {
        this.isLoading = false;
        this.uploadError = error?.error?.detail || error?.message || 'Chargement des photos impossible.';
      },
    });
  }

  private loadPhotoPreviews(photos: EventPhoto[]): void {
    this.revokeAllPhotoUrls();
    if (!photos.length) {
      return;
    }

    forkJoin(
      photos.map((photo) =>
        this.eventService.getEventPhotoBlob(this.eventId, photo.id).pipe(
          map((blob) => ({ id: photo.id, url: URL.createObjectURL(blob) })),
          catchError(() => of(null)),
        ),
      ),
    ).subscribe((items) => {
      items.forEach((item) => {
        if (item) {
          this.photoObjectUrls.set(item.id, item.url);
        }
      });
    });
  }

  private revokeAllPhotoUrls(): void {
    this.photoObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.photoObjectUrls.clear();
  }
}
