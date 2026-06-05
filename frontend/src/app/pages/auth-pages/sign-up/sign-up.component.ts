import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface DepartmentOption {
  id: string;
  code: string;
  name: string;
}

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './sign-up.component.html',
})
export class SignUpComponent implements OnInit {
  firstName = '';
  lastName = '';
  email = '';
  phone = '';
  departmentId = '';
  password = '';
  confirmPassword = '';

  departments: DepartmentOption[] = [];

  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.getPublicDepartments().subscribe((departments) => {
      this.departments = departments;
    });
  }

  onSubmit(): void {
    if (this.isSubmitting) {
      return;
    }

    this.successMessage = '';
    this.errorMessage = '';

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Les deux mots de passe doivent être identiques.';
      return;
    }

    this.isSubmitting = true;
    this.authService.signUp({
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      phone: this.phone,
      departmentId: this.departmentId || undefined,
      password: this.password,
      confirmPassword: this.confirmPassword,
    }).subscribe({
      next: (message) => {
        this.isSubmitting = false;
        this.successMessage = message;
        this.password = '';
        this.confirmPassword = '';
      },
      error: (error: Error) => {
        this.isSubmitting = false;
        this.errorMessage = this.toFrenchErrorMessage(error.message);
      },
    });
  }

  private toFrenchErrorMessage(rawMessage?: string): string {
    const message = (rawMessage || '').trim();
    const normalized = message.toLowerCase();

    if (!message) {
      return 'Inscription impossible. Veuillez réessayer.';
    }

    if (
      normalized.includes('email already exists') ||
      (normalized.includes('already exists') && normalized.includes('email')) ||
      normalized.includes('duplicate key') ||
      normalized.includes('adresse e-mail déjà utilisée')
    ) {
      return this.email
        ? `Cette adresse e-mail est déjà utilisée : ${this.email}.`
        : 'Cette adresse e-mail est déjà utilisée.';
    }

    if (normalized.includes('password') && normalized.includes('match')) {
      return 'Les deux mots de passe doivent être identiques.';
    }

    if (normalized.includes('department') && normalized.includes('invalid')) {
      return 'Le service demandé est invalide.';
    }

    if (normalized.includes('validation failed') || normalized.includes('bad request')) {
      return 'Veuillez vérifier les informations saisies puis réessayer.';
    }

    return message;
  }
}
