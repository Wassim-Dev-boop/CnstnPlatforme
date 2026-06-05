import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { LabelComponent } from '../../form/label/label.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { ButtonComponent } from '../../ui/button/button.component';

@Component({
  selector: 'app-forgot-password-form',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LabelComponent,
    InputFieldComponent,
    ButtonComponent,
  ],
  templateUrl: './forgot-password-form.component.html',
  styles: ``,
})
export class ForgotPasswordFormComponent {
  email = '';
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  constructor(private authService: AuthService) {}

  onEmailChange(value: string | number): void {
    this.email = String(value);
  }

  onSubmit(): void {
    if (this.isSubmitting) {
      return;
    }

    if (!this.email.trim()) {
      this.errorMessage = 'Email obligatoire.';
      this.successMessage = '';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.forgotPassword(this.email).subscribe({
      next: (message) => {
        this.isSubmitting = false;
        this.successMessage = message;
      },
      error: (error: Error) => {
        this.isSubmitting = false;
        this.errorMessage = error.message || 'Operation impossible pour le moment.';
      },
    });
  }
}

