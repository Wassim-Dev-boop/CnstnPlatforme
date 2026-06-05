import { Component } from '@angular/core';
import { ResetPasswordFormComponent } from '../../../shared/components/auth/reset-password-form/reset-password-form.component';
import { AuthPageLayoutComponent } from '../../../shared/layout/auth-page-layout/auth-page-layout.component';

@Component({
  selector: 'app-reset-password',
  imports: [
    AuthPageLayoutComponent,
    ResetPasswordFormComponent,
  ],
  templateUrl: './reset-password.component.html',
  styles: ``,
})
export class ResetPasswordComponent {}

