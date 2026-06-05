import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationDropdownComponent } from '../../components/header/notification-dropdown/notification-dropdown.component';
import { UserDropdownComponent } from '../../components/header/user-dropdown/user-dropdown.component';
import { SidebarService } from '../../services/sidebar.service';

type BreadcrumbItem = {
  label: string;
  route: string;
};

@Component({
  selector: 'app-header',
  imports: [CommonModule, FormsModule, RouterModule, NotificationDropdownComponent, UserDropdownComponent],
  templateUrl: './app-header.component.html',
})
export class AppHeaderComponent implements OnInit, OnDestroy {
  @ViewChild('globalSearchInput')
  globalSearchInput?: ElementRef<HTMLInputElement>;

  isApplicationMenuOpen = false;
  globalSearch = '';
  breadcrumbItems: BreadcrumbItem[] = [];
  unreadNotificationsCount = 0;

  readonly isMobileOpen$;

  private readonly subscription = new Subscription();

  constructor(
    public sidebarService: SidebarService,
    private router: Router,
    private notificationService: NotificationService
  ) {
    this.isMobileOpen$ = this.sidebarService.isMobileOpen$;
  }

  ngOnInit(): void {
    this.breadcrumbItems = this.buildBreadcrumbs(this.router.url);
    this.syncGlobalSearchInput(this.router.url);

    this.subscription.add(
      this.router.events
        .pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe((event) => {
          const navigation = event as NavigationEnd;
          this.breadcrumbItems = this.buildBreadcrumbs(navigation.urlAfterRedirects);
          this.syncGlobalSearchInput(navigation.urlAfterRedirects);
        })
    );

    this.subscription.add(
      this.notificationService.getUnreadCount().subscribe({
        next: (count) => {
          this.unreadNotificationsCount = Math.max(0, Number(count) || 0);
        },
        error: () => {
          this.unreadNotificationsCount = 0;
        },
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  handleToggle(): void {
    if (window.innerWidth >= 1280) {
      this.sidebarService.toggleExpanded();
    } else {
      this.sidebarService.toggleMobileOpen();
    }
  }

  toggleApplicationMenu(): void {
    this.isApplicationMenuOpen = !this.isApplicationMenuOpen;
  }

  onSubmitGlobalSearch(event: Event): void {
    event.preventDefault();
    const query = this.globalSearch.trim();

    if (!query) {
      void this.router.navigateByUrl('/dashboard');
      return;
    }

    void this.router.navigate(['/search'], { queryParams: { q: query } });
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.focusSearchInput();
    }
  }

  private focusSearchInput(): void {
    if (!this.globalSearchInput?.nativeElement) {
      return;
    }
    this.globalSearchInput.nativeElement.focus();
    this.globalSearchInput.nativeElement.select();
  }

  private syncGlobalSearchInput(url: string): void {
    const tree = this.router.parseUrl(url);
    const query = tree.queryParams['q'] ?? tree.queryParams['search'];
    this.globalSearch = typeof query === 'string' ? query : '';
  }

  private buildBreadcrumbs(url: string): BreadcrumbItem[] {
    const path = url.split('?')[0] || '';
    const segments = path.split('/').filter(Boolean);

    if (segments.length === 0) {
      return [{ label: 'Accueil', route: '/dashboard' }];
    }

    const labels: Record<string, string> = {
      dashboard: 'Tableau de bord',
      documents: 'GED',
      events: 'Evenements',
      invitations: 'Invitations',
      reservations: 'Reservations',
      salles: 'Salles',
      equipements: 'Equipements',
      interventions: 'Interventions',
      it: 'Parc IT',
      notifications: 'Notifications',
      admin: 'Administration',
      workflows: 'Workflows',
      profile: 'Profil',
      search: 'Recherche',
    };

    const breadcrumbs: BreadcrumbItem[] = [{ label: 'Accueil', route: '/dashboard' }];
    let cumulativeRoute = '';

    segments.forEach((segment) => {
      cumulativeRoute += `/${segment}`;
      breadcrumbs.push({
        label: labels[segment] || this.toTitleCase(segment),
        route: cumulativeRoute,
      });
    });

    return breadcrumbs;
  }

  private toTitleCase(value: string): string {
    if (!value) {
      return value;
    }

    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
