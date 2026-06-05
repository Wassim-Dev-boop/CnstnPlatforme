import { Component } from '@angular/core';
import { DropdownComponent } from '../../ui/dropdown/dropdown.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DropdownItemTwoComponent } from '../../ui/dropdown/dropdown-item/dropdown-item.component-two';
import { AuthService } from '../../../../core/services/auth.service';
import { AppRole } from '../../../../core/models';

@Component({
  selector: 'app-user-dropdown',
  templateUrl: './user-dropdown.component.html',
  imports:[CommonModule,RouterModule,DropdownComponent,DropdownItemTwoComponent]
})
export class UserDropdownComponent {
  isOpen = false;

  readonly currentUser$;
  readonly roleLabels: Record<AppRole, string>;

  constructor(private authService: AuthService) {
    this.currentUser$ = this.authService.currentUser$;
    this.roleLabels = this.authService.roleLabels;
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  closeDropdown() {
    this.isOpen = false;
  }

  switchRole(role: AppRole): void {
    this.authService.switchRole(role);
  }

  signOut(): void {
    this.closeDropdown();
    this.authService.signOut();
  }
}
