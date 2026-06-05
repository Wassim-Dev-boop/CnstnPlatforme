import { Component } from '@angular/core';
import { ForgotPasswordFormComponent } from '../../../shared/components/auth/forgot-password-form/forgot-password-form.component';
import { AuthPageLayoutComponent } from '../../../shared/layout/auth-page-layout/auth-page-layout.component';

@Component({
  selector: 'app-forgot-password',
  imports: [
    AuthPageLayoutComponent,
    ForgotPasswordFormComponent,
  ],
  templateUrl: './forgot-password.component.html',
  styles: ``,
})
export class ForgotPasswordComponent {}

