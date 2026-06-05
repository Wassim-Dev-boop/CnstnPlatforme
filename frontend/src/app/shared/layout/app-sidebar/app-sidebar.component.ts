import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Params, Router, RouterModule } from '@angular/router';
import { combineLatest, Subscription, filter } from 'rxjs';
import { AppRole, InvitationStatus } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { InvitationService } from '../../../core/services/invitation.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SafeHtmlPipe } from '../../pipe/safe-html.pipe';
import { SidebarService } from '../../services/sidebar.service';
import { ThemeService } from '../../services/theme.service';

type NavItem = {
  name: string;
  icon: string;
  path: string;
  queryParams?: Params;
  roles?: AppRole[];
  permissions?: string[];
  count?: number;
  countTone?: 'brand' | 'warning';
};

const ALL_ROLES: AppRole[] = [
  'ADMIN',
  'EMPLOYEE',
  'MANAGER',
  'ROOM_MANAGER',
  'IT_MANAGER',
  'SECURITY_MANAGER',
  'DSN_DIRECTOR',
  'QUALITY_MANAGER',
];

const RESERVATION_ROLES: AppRole[] = [
  'ADMIN',
  'EMPLOYEE',
  'MANAGER',
  'ROOM_MANAGER',
  'IT_MANAGER',
  'SECURITY_MANAGER',
  'DSN_DIRECTOR',
  'QUALITY_MANAGER',
];

const DASHBOARD_ICON = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12L12 4L20 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path><path d="M6.5 10.5V19.5H17.5V10.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
const GED_ICON = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 3.5H14L18.5 8V20.5H7C5.89543 20.5 5 19.6046 5 18.5V5.5C5 4.39543 5.89543 3.5 7 3.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path><path d="M14 3.5V8H18.5" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path></svg>`;
const EVENT_ICON = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" stroke-width="1.8"></rect><path d="M8 3V7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path><path d="M16 3V7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path><path d="M3.5 10H20.5" stroke="currentColor" stroke-width="1.8"></path></svg>`;
const INVITATION_ICON = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.8"></rect><path d="M3.5 7L12 13L20.5 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
const ROOM_ICON = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 10.5L12 3L21 10.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path><path d="M5.5 9.5V20H18.5V9.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
const MY_RESERVATIONS_ICON = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3.5" y="4.5" width="17" height="16" rx="2" stroke="currentColor" stroke-width="1.8"></rect><path d="M8 3V7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path><path d="M16 3V7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path><path d="M3.5 9H20.5" stroke="currentColor" stroke-width="1.8"></path><path d="M8.5 13.5L10.8 15.8L15.5 11.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
const EQUIPMENT_ICON = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.8"></rect><path d="M9 7V5.5C9 4.67157 9.67157 4 10.5 4H13.5C14.3284 4 15 4.67157 15 5.5V7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path></svg>`;
const INTERVENTION_ICON = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.5 6.5L17.5 3.5L20.5 6.5L17.5 9.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path><path d="M4 20L10.2 13.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path><path d="M7.2 12.8L10.6 16.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path><path d="M14.5 6.5L7.2 13.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path></svg>`;
const NOTIFICATION_ICON = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 17H18L16.8 15.8C16.2861 15.2861 16 14.5891 16 13.8627V11C16 8.79086 14.2091 7 12 7C9.79086 7 8 8.79086 8 11V13.8627C8 14.5891 7.71392 15.2861 7.2 15.8L6 17Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path><path d="M10 18.5C10 19.6046 10.8954 20.5 12 20.5C13.1046 20.5 14 19.6046 14 18.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path></svg>`;
const ADMIN_ICON = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.5 2.8C11.4 2.3 12.6 2.3 13.5 2.8L15 3.7C15.3 3.9 15.7 4 16.1 4H17.8C18.9 4 19.8 4.9 19.8 6V7.9C19.8 8.3 19.9 8.7 20.1 9L21 10.5C21.5 11.4 21.5 12.6 21 13.5L20.1 15C19.9 15.3 19.8 15.7 19.8 16.1V17.8C19.8 18.9 18.9 19.8 17.8 19.8H16.1C15.7 19.8 15.3 19.9 15 20.1L13.5 21C12.6 21.5 11.4 21.5 10.5 21L9 20.1C8.7 19.9 8.3 19.8 7.9 19.8H6.2C5.1 19.8 4.2 18.9 4.2 17.8V16.1C4.2 15.7 4.1 15.3 3.9 15L3 13.5C2.5 12.6 2.5 11.4 3 10.5L3.9 9C4.1 8.7 4.2 8.3 4.2 7.9V6C4.2 4.9 5.1 4 6.2 4H7.9C8.3 4 8.7 3.9 9 3.7L10.5 2.8Z" stroke="currentColor" stroke-width="1.6"></path><circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.6"></circle></svg>`;

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule, SafeHtmlPipe],
  templateUrl: './app-sidebar.component.html',
})
export class AppSidebarComponent implements OnInit, OnDestroy {
  unreadNotificationsCount = 0;
  pendingInvitationsCount = 0;

  navItems: NavItem[] = [];
  currentTheme: 'light' | 'dark' = 'light';

  readonly isExpanded$;
  readonly isMobileOpen$;
  readonly isHovered$;

  private subscription = new Subscription();
  private dynamicCountSubscription = new Subscription();

  constructor(
    public sidebarService: SidebarService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private notificationService: NotificationService,
    private invitationService: InvitationService,
    private themeService: ThemeService
  ) {
    this.isExpanded$ = this.sidebarService.isExpanded$;
    this.isMobileOpen$ = this.sidebarService.isMobileOpen$;
    this.isHovered$ = this.sidebarService.isHovered$;
  }

  ngOnInit(): void {
    this.rebuildNavItems();

    this.subscription.add(
      this.router.events
        .pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe(() => this.cdr.markForCheck())
    );

    this.subscription.add(
      this.authService.currentRole$.subscribe(() => {
        this.rebuildNavItems();
        this.loadDynamicCounts();
      })
    );

    this.subscription.add(
      this.themeService.theme$.subscribe((theme) => {
        this.currentTheme = theme;
      })
    );

    this.subscription.add(
      combineLatest([this.isExpanded$, this.isMobileOpen$, this.isHovered$]).subscribe(
        () => this.cdr.markForCheck()
      )
    );

    this.loadDynamicCounts();
  }

  ngOnDestroy(): void {
    this.dynamicCountSubscription.unsubscribe();
    this.subscription.unsubscribe();
  }

  get modeLabel(): string {
    return this.currentTheme === 'dark' ? 'Mode sombre' : 'Mode clair';
  }

  canSeeNav(nav: NavItem): boolean {
    if (!nav.roles || nav.roles.length === 0) {
      return this.authService.hasAllPermissions(nav.permissions);
    }
    return this.authService.canAccess(nav.roles) && this.authService.hasAllPermissions(nav.permissions);
  }

  isNavItemActive(nav: NavItem): boolean {
    const [currentPath] = this.router.url.split('?');
    return currentPath === nav.path;
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  onSidebarMouseEnter(): void {
    this.isExpanded$.subscribe((expanded) => {
      if (!expanded) {
        this.sidebarService.setHovered(true);
      }
    }).unsubscribe();
  }

  onLinkClick(): void {
    this.isMobileOpen$.subscribe((isMobileOpen) => {
      if (isMobileOpen) {
        this.sidebarService.setMobileOpen(false);
      }
    }).unsubscribe();
  }

  private loadDynamicCounts(): void {
    this.dynamicCountSubscription.unsubscribe();
    this.dynamicCountSubscription = new Subscription();

    this.dynamicCountSubscription.add(
      this.notificationService.getUnreadCount().subscribe({
        next: (count) => {
          this.unreadNotificationsCount = Math.max(0, Number(count) || 0);
          this.rebuildNavItems();
        },
        error: () => {
          this.unreadNotificationsCount = 0;
          this.rebuildNavItems();
        },
      })
    );

    this.dynamicCountSubscription.add(
      this.invitationService.getInvitations().subscribe({
        next: (invitations) => {
          this.pendingInvitationsCount = invitations.filter(
            (invitation) => invitation.status === InvitationStatus.PENDING
          ).length;
          this.rebuildNavItems();
        },
        error: () => {
          this.pendingInvitationsCount = 0;
          this.rebuildNavItems();
        },
      })
    );
  }

  private rebuildNavItems(): void {
    const equipmentNavigation = this.resolveEquipmentNavigation();
    const interventionsNavigation = this.resolveInterventionsNavigation();

    this.navItems = [
      {
        name: 'Tableau de bord',
        path: '/dashboard',
        roles: ALL_ROLES,
        icon: DASHBOARD_ICON,
      },
      {
        name: 'GED',
        path: '/documents',
        roles: ALL_ROLES,
        permissions: ['VIEW_GED_MODULE'],
        icon: GED_ICON,
      },
      {
        name: 'Evenements',
        path: '/events',
        roles: ALL_ROLES,
        permissions: ['VIEW_EVENTS_MODULE'],
        icon: EVENT_ICON,
      },
      {
        name: 'Invitations',
        path: '/invitations',
        roles: ['ADMIN', 'EMPLOYEE', 'MANAGER', 'DSN_DIRECTOR', 'QUALITY_MANAGER', 'SECURITY_MANAGER'],
        permissions: ['VIEW_EVENTS_MODULE'],
        count: this.pendingInvitationsCount,
        icon: INVITATION_ICON,
      },
      {
        name: 'Salles',
        path: '/reservations/salles',
        roles: RESERVATION_ROLES,
        icon: ROOM_ICON,
      },
      {
        name: 'Mes reservations',
        path: '/reservations/mes-reservations',
        roles: RESERVATION_ROLES,
        icon: MY_RESERVATIONS_ICON,
      },
      {
        name: 'Equipements',
        path: equipmentNavigation.path,
        roles: equipmentNavigation.roles,
        icon: EQUIPMENT_ICON,
      },
      {
        name: 'Interventions',
        path: interventionsNavigation.path,
        roles: interventionsNavigation.roles,
        permissions: ['VIEW_INTERVENTIONS_MODULE'],
        icon: INTERVENTION_ICON,
      },
      {
        name: 'Notifications',
        path: '/notifications',
        roles: ALL_ROLES,
        count: this.unreadNotificationsCount,
        countTone: 'warning',
        icon: NOTIFICATION_ICON,
      },
      {
        name: 'Administration',
        path: '/admin',
        roles: ['ADMIN'],
        permissions: ['VIEW_USERS_MODULE'],
        icon: ADMIN_ICON,
      },
    ];
  }

  private resolveEquipmentNavigation(): { path: string; roles: AppRole[] } {
    if (this.authService.hasRole('ADMIN', 'IT_MANAGER')) {
      return {
        path: '/it/equipements',
        roles: ['ADMIN', 'IT_MANAGER'],
      };
    }

    return {
      path: '/reservations/equipements',
      roles: RESERVATION_ROLES,
    };
  }

  private resolveInterventionsNavigation(): { path: string; roles: AppRole[] } {
    if (this.authService.hasRole('ADMIN', 'ROOM_MANAGER')) {
      return {
        path: '/interventions',
        roles: ['ADMIN', 'ROOM_MANAGER'],
      };
    }

    return {
      path: '/it/interventions',
      roles: ['ADMIN', 'EMPLOYEE', 'MANAGER', 'DSN_DIRECTOR', 'IT_MANAGER'],
    };
  }
}
