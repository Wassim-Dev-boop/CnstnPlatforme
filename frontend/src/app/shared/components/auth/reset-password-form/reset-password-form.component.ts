import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { LabelComponent } from '../../form/label/label.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { ButtonComponent } from '../../ui/button/button.component';

@Component({
  selector: 'app-reset-password-form',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LabelComponent,
    InputFieldComponent,
    ButtonComponent,
  ],
  templateUrl: './reset-password-form.component.html',
  styles: ``,
})
export class ResetPasswordFormComponent implements OnInit {
  token = '';
  newPassword = '';
  confirmPassword = '';

  showNewPassword = false;
  showConfirmPassword = false;
  isSubmitting = false;

  infoMessage = '';
  errorMessage = '';
  successMessage = '';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const tokenFromQuery = params.get('token')?.trim() || '';
      if (tokenFromQuery) {
        this.token = tokenFromQuery;
        this.infoMessage = 'Token recu automatiquement depuis le lien email.';
      }
    });
  }

  onTokenChange(value: string | number): void {
    this.token = String(value);
  }

  onNewPasswordChange(value: string | number): void {
    this.newPassword = String(value);
  }

  onConfirmPasswordChange(value: string | number): void {
    this.confirmPassword = String(value);
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit(): void {
    if (this.isSubmitting) {
      return;
    }

    if (!this.token.trim() || !this.newPassword.trim() || !this.confirmPassword.trim()) {
      this.errorMessage = 'Token, mot de passe et confirmation sont obligatoires.';
      this.successMessage = '';
      return;
    }

    if (this.newPassword.trim().length < 8 || this.confirmPassword.trim().length < 8) {
      this.errorMessage = 'Le mot de passe doit contenir au moins 8 caracteres.';
      this.successMessage = '';
      return;
    }

    if (this.newPassword.trim() !== this.confirmPassword.trim()) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      this.successMessage = '';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.resetPassword(this.token, this.newPassword, this.confirmPassword).subscribe({
      next: (message) => {
        this.isSubmitting = false;
        this.successMessage = message;
        this.newPassword = '';
        this.confirmPassword = '';
      },
      error: (error: Error) => {
        this.isSubmitting = false;
        this.errorMessage = error.message || 'Operation impossible pour le moment.';
      },
    });
  }
}

