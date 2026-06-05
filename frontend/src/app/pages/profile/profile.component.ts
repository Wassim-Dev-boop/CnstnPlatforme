
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageBreadcrumbComponent } from '../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  imports: [
    CommonModule,
    FormsModule,
    PageBreadcrumbComponent,
  ],
  templateUrl: './profile.component.html',
  styles: ``
})
export class ProfileComponent implements OnInit, OnDestroy {
  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  form = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    username: '',
    role: '',
  };

  private userSubscription?: Subscription;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser$.subscribe((user) => {
      this.loading = false;
      if (!user) {
        this.errorMessage = 'Session utilisateur indisponible.';
        return;
      }

      this.form = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone ?? '',
        username: user.username ?? '',
        role: this.authService.roleLabels[user.role] ?? user.role,
      };
    });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  saveProfile(): void {
    if (this.saving) {
      return;
    }

    const firstName = this.form.firstName.trim();
    const lastName = this.form.lastName.trim();
    const email = this.form.email.trim();
    const phone = this.form.phone.trim();

    if (!firstName || !lastName || !email) {
      this.errorMessage = 'Nom, prenom et email sont obligatoires.';
      this.successMessage = '';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.updateProfile({
      firstName,
      lastName,
      email,
      phone,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Profil mis a jour avec succes.';
      },
      error: (error: Error) => {
        this.saving = false;
        this.errorMessage = error.message || 'Impossible de mettre a jour le profil.';
      },
    });
  }

}
