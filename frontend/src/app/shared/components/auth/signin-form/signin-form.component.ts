import { Component, OnInit } from '@angular/core';
import { LabelComponent } from '../../form/label/label.component';
import { CheckboxComponent } from '../../form/input/checkbox.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signin-form',
  imports: [
    CommonModule,
    LabelComponent,
    CheckboxComponent,
    ButtonComponent,
    InputFieldComponent,
    RouterModule,
    FormsModule
],
  templateUrl: './signin-form.component.html',
  styles: ``
})
export class SigninFormComponent implements OnInit {

  showPassword = false;
  isChecked = false;
  isSubmitting = false;

  identifier = '';
  password = '';
  signInError = '';

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onIdentifierChange(value: string | number): void {
    this.identifier = String(value);
  }

  onPasswordChange(value: string | number): void {
    this.password = String(value);
  }

  onSignIn() {
    if (this.isSubmitting) {
      return;
    }

    if (!this.identifier.trim() || !this.password.trim()) {
      this.signInError = 'Identifiant et mot de passe obligatoires.';
      return;
    }

    this.isSubmitting = true;
    this.signInError = '';

    this.authService
      .signIn(this.identifier, this.password)
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          const redirectTo = this.resolveRedirectTarget();
          if (redirectTo && redirectTo.startsWith('/')) {
            void this.router.navigateByUrl(redirectTo);
            return;
          }
          void this.router.navigate(['/dashboard']);
        },
        error: (error: Error) => {
          this.isSubmitting = false;
          this.signInError = error.message || 'Echec de connexion.';
        },
      });
  }

  private resolveRedirectTarget(): string | null {
    const routeRedirect = this.route.snapshot.queryParamMap.get('redirectTo')?.trim();
    if (routeRedirect && routeRedirect.startsWith('/')) {
      return routeRedirect;
    }

    const parsedUrl = this.router.parseUrl(this.router.url);
    const rawRedirect = parsedUrl.queryParams?.['redirectTo'];
    if (typeof rawRedirect !== 'string') {
      return null;
    }

    const safeRedirect = rawRedirect.trim();
    return safeRedirect.startsWith('/') ? safeRedirect : null;
  }
}
