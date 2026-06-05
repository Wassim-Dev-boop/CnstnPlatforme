import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import { catchError, forkJoin, map, of, shareReplay, Subscription } from 'rxjs';
import { ApiPageResponse } from '../../../core/config/backend-api.config';
import { DocumentService, GedFolderTreeNode } from '../../../core/services/document.service';
import { EventService } from '../../../core/services/event.service';
import { ReservationService } from '../../../core/services/reservation.service';
import { InterventionService } from '../../../core/services/intervention.service';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { InvitationService } from '../../../core/services/invitation.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ItEquipmentService } from '../../../core/services/it-equipment.service';
import { ItInterventionService } from '../../../core/services/it-intervention.service';
import {
  AppRole,
  Document as GedDocument,
  Equipment,
  EquipmentReservation,
  Event as EnterpriseEvent,
  EventStatus,
  Intervention,
  InterventionStatus,
  Invitation,
  InvitationStatus,
  ItEquipment,
  ItEquipmentAssignment,
  ItIntervention,
  Notification as AppNotification,
  Room,
  RoomReservation,
  UserStatistics,
} from '../../../core/models';

type ApexOptions = Record<string, unknown>;
type KpiTone = 'success' | 'warning' | 'danger' | 'brand' | 'neutral';
type AmChartKind = 'treemap' | 'calendar' | 'sankey' | 'timeline' | 'force' | 'map' | 'sunburst' | 'network';

interface KpiCard {
  label: string;
  value: string;
  hint: string;
  tone: KpiTone;
}

interface DashboardChart {
  id: string;
  title: string;
  description: string;
  options: ApexOptions;
  empty: boolean;
}

interface AmChartPanel {
  id: string;
  title: string;
  description: string;
  kind: AmChartKind;
  empty: boolean;
}

interface DashboardVm {
  role: AppRole;
  title: string;
  subtitle: string;
  summaryEmpty: boolean;
  kpis: KpiCard[];
  charts: DashboardChart[];
  amChart: AmChartPanel;
  emptyNote: string;
}

type DashboardVmContent = Omit<DashboardVm, 'summaryEmpty'>;

interface DashboardData {
  userStats: UserStatistics;
  documents: GedDocument[];
  folderTree: GedFolderTreeNode[];
  events: EnterpriseEvent[];
  interventions: Intervention[];
  itInterventions: ItIntervention[];
  itEquipments: ItEquipment[];
  itAssignments: ItEquipmentAssignment[];
  invitations: Invitation[];
  notifications: AppNotification[];
  roomReservations: RoomReservation[];
  equipmentReservations: EquipmentReservation[];
  rooms: Room[];
  equipment: Equipment[];
}

interface DashboardTaskItem {
  title: string;
  detail: string;
  tone: 'high' | 'medium' | 'low';
  route?: string;
  queryParams?: Record<string, string>;
}

interface UpcomingEventItem {
  id: string;
  title: string;
  dateLabel: string;
  locationLabel: string;
  statusLabel: string;
  statusClass: string;
  route: string;
}

interface ActivityItem {
  title: string;
  timestamp: Date;
  timeAgo: string;
  tag: string;
  tagClass: string;
  dotClass: string;
}

interface QuickAction {
  label: string;
  route: string;
  queryParams?: Record<string, string>;
}

interface MiniCalendarCell {
  date: Date | null;
  dayNumber: number | null;
  isCurrentMonth: boolean;
  isToday: boolean;
  eventCount: number;
}

const ROLE_PRIORITY: AppRole[] = [
  'ADMIN',
  'MANAGER',
  'ROOM_MANAGER',
  'SECURITY_MANAGER',
  'IT_MANAGER',
  'DSN_DIRECTOR',
  'QUALITY_MANAGER',
  'EMPLOYEE',
];

const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: 'ADMIN',
  EMPLOYEE: 'EMPLOYE',
  MANAGER: 'CHEF_HIERARCHIQUE',
  ROOM_MANAGER: 'RESPONSABLE_SALLE',
  SECURITY_MANAGER: 'RESPONSABLE_SECURITE',
  DSN_DIRECTOR: 'DIRECTEUR_DSN',
  QUALITY_MANAGER: 'RESPONSABLE_QUALITE',
  IT_MANAGER: 'RESPONSABLE_IT',
};

const ROLE_COLORS = ['#0C488C', '#D8A528', '#10B981', '#EF4444', '#F59E0B', '#6B7280', '#2563EB', '#7C3AED'];
const STATUS_COLORS = ['#0C488C', '#F59E0B', '#10B981', '#EF4444', '#6B7280'];
const EMPTY_USER_STATS: UserStatistics = {
  totalUsers: 0,
  activeUsers: 0,
  inactiveUsers: 0,
  usersByRole: [],
  newUsersThisMonth: 0,
  userActivityChart: [],
};

@Component({
  selector: 'app-enterprise-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NgApexchartsModule],
  templateUrl: './enterprise-dashboard.component.html',
  styleUrls: ['./enterprise-dashboard.component.css'],
})
export class EnterpriseDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('amChartHost') private amChartHost?: ElementRef<HTMLDivElement>;

  readonly isLoading = signal(true);
  readonly hasError = signal(false);
  readonly loadErrorMessage = signal('');
  readonly selectedRole = signal<AppRole>('EMPLOYEE');
  readonly dashboardData = signal<DashboardData | null>(null);
  readonly adminDemoRoles = ROLE_PRIORITY;

  readonly isAdminUser = computed(() => this.resolveHighestRole() === 'ADMIN');
  readonly currentRoleLabel = computed(() => ROLE_LABELS[this.selectedRole()]);
  readonly vm = computed(() => {
    const data = this.dashboardData();
    return data ? this.buildRoleDashboard(this.selectedRole(), data) : null;
  });

  private readonly subscription = new Subscription();
  private observer?: IntersectionObserver;
  private amRoot?: { dispose: () => void };
  private activeAmChartId = '';

  constructor(
    private readonly documentService: DocumentService,
    private readonly eventService: EventService,
    private readonly reservationService: ReservationService,
    private readonly interventionService: InterventionService,
    private readonly adminService: AdminService,
    private readonly authService: AuthService,
    private readonly invitationService: InvitationService,
    private readonly notificationService: NotificationService,
    private readonly itEquipmentService: ItEquipmentService,
    private readonly itInterventionService: ItInterventionService,
    private readonly zone: NgZone,
  ) {}

  ngOnInit(): void {
    this.selectedRole.set(this.resolveHighestRole());
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    this.setupLazyAmChart();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.observer?.disconnect();
    this.disposeAmChart();
  }

  reloadDashboard(): void {
    this.loadDashboardData();
  }

  changeDemoRole(role: AppRole): void {
    this.selectedRole.set(role);
    this.activeAmChartId = '';
    setTimeout(() => this.renderAmChartIfVisible(), 0);
  }

  kpiToneClass(tone: KpiTone): string {
    const classes: Record<KpiTone, string> = {
      brand: 'border-[#0C488C]/20 bg-[#0C488C]/5 text-[#0C488C] dark:border-[#0C488C]/50 dark:bg-[#0C488C]/20 dark:text-blue-200',
      success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200',
      warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200',
      danger: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-200',
      neutral: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200',
    };
    return classes[tone];
  }

  chartSeries(chart: DashboardChart): any {
    return chart.options['series'];
  }

  chartOption(chart: DashboardChart, key: string): any {
    return chart.options[key];
  }

  legacyTasks(data: DashboardData, role: AppRole): DashboardTaskItem[] {
    const pendingDocuments = data.documents.filter((item) => item.gedStatus === 'En attente qualite').length;
    const pendingEvents = data.events.filter((item) => item.status === EventStatus.SUBMITTED).length;
    const pendingRooms = data.roomReservations.filter((item) => item.status === 'PENDING').length;
    const openInterventions = data.interventions.filter((item) => !this.isClosedStatus(item.status)).length;
    const openItInterventions = data.itInterventions.filter((item) => !this.isClosedStatus(item.itWorkflowStatus)).length;

    const tasks: DashboardTaskItem[] = [];
    if (role === 'ADMIN') {
      tasks.push(
        { title: 'Workflows a surveiller', detail: `${this.countPendingWorkflows(data)} demandes ouvertes sur les modules metier.`, tone: this.countPendingWorkflows(data) > 0 ? 'high' : 'low', route: '/notifications' },
        { title: 'Utilisateurs actifs', detail: `${data.userStats.activeUsers} comptes actifs sur ${data.userStats.totalUsers}.`, tone: 'low', route: '/admin' },
      );
    } else if (role === 'QUALITY_MANAGER') {
      tasks.push({ title: 'Validation qualite GED', detail: `${pendingDocuments} document(s) en attente de validation.`, tone: pendingDocuments > 0 ? 'high' : 'low', route: '/documents', queryParams: { status: 'En attente qualite' } });
    } else if (role === 'ROOM_MANAGER') {
      tasks.push({ title: 'Reservations salles', detail: `${pendingRooms} demande(s) de salle en attente.`, tone: pendingRooms > 0 ? 'high' : 'low', route: '/reservations/salles' });
    } else if (role === 'IT_MANAGER') {
      tasks.push({ title: 'Interventions IT', detail: `${openItInterventions} intervention(s) IT a traiter.`, tone: openItInterventions > 0 ? 'high' : 'low', route: '/it/interventions' });
    } else if (role === 'SECURITY_MANAGER' || role === 'DSN_DIRECTOR' || role === 'MANAGER') {
      tasks.push({ title: 'Validations evenements', detail: `${pendingEvents} evenement(s) soumis dans le workflow.`, tone: pendingEvents > 0 ? 'high' : 'low', route: '/events' });
    } else {
      const mine = this.filterPersonalData(data);
      const myReservations = [...mine.rooms, ...mine.equipment];
      const upcomingReservations = myReservations.filter((item) => this.isBetween(item.startDate, new Date(), this.addDays(new Date(), 30))).length;
      const myOpen = [...mine.interventions, ...mine.itInterventions].filter((item) => !this.isClosedStatus(this.getStatus(item))).length;
      tasks.push(
        { title: 'Mes reservations', detail: `${upcomingReservations} reservation(s) a venir sur les 30 prochains jours.`, tone: upcomingReservations > 0 ? 'medium' : 'low', route: '/reservations/mes-reservations' },
        { title: 'Mes interventions', detail: `${myOpen} demande(s) encore ouvertes.`, tone: myOpen > 0 ? 'medium' : 'low', route: '/it/interventions' },
        { title: 'Mes invitations', detail: `${mine.invitations.filter((item) => item.status === InvitationStatus.PENDING).length} invitation(s) en attente de reponse.`, tone: 'medium', route: '/invitations' },
      );
    }

    tasks.push({ title: 'Suivi operationnel', detail: `${openInterventions + openItInterventions} intervention(s) ouvertes au total.`, tone: openInterventions + openItInterventions > 0 ? 'medium' : 'low', route: '/interventions' });
    return tasks.slice(0, 5);
  }

  legacyUpcomingEvents(data: DashboardData, role: AppRole): UpcomingEventItem[] {
    const source = role === 'EMPLOYEE' ? this.filterPersonalData(data).events : data.events;
    return source
      .filter((event) => event.startDate >= new Date())
      .sort((left, right) => left.startDate.getTime() - right.startDate.getTime())
      .slice(0, 4)
      .map((event) => ({
        id: event.id,
        title: event.title,
        dateLabel: this.formatEventDateRange(event.startDate, event.endDate),
        locationLabel: event.location || event.eventMode || 'Lieu a confirmer',
        statusLabel: this.eventStatusLabel(event.status),
        statusClass: this.eventStatusClass(event.status),
        route: '/events',
      }));
  }

  legacyActivities(data: DashboardData, role: AppRole): ActivityItem[] {
    const mine = role === 'EMPLOYEE' ? this.filterPersonalData(data) : null;
    const documents = mine ? mine.documents : data.documents;
    const events = mine ? mine.events : data.events;
    const rooms = mine ? mine.rooms : data.roomReservations;
    const interventions = mine ? mine.interventions : data.interventions;
    const itInterventions = mine ? mine.itInterventions : data.itInterventions;

    const activities: ActivityItem[] = [
      ...documents.map((document) => ({
        title: `Document GED: ${document.title}`,
        timestamp: document.updatedAt,
        timeAgo: this.formatTimeAgo(document.updatedAt),
        tag: 'GED',
        tagClass: 'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300',
        dotClass: 'bg-[#0C488C]',
      })),
      ...events.map((event) => ({
        title: `Evenement: ${event.title}`,
        timestamp: event.updatedAt,
        timeAgo: this.formatTimeAgo(event.updatedAt),
        tag: this.eventStatusLabel(event.status),
        tagClass: this.eventStatusClass(event.status),
        dotClass: 'bg-warning-500',
      })),
      ...rooms.map((reservation) => ({
        title: `Salle ${reservation.roomName} reservee par ${reservation.userName}`,
        timestamp: reservation.updatedAt,
        timeAgo: this.formatTimeAgo(reservation.updatedAt),
        tag: reservation.status,
        tagClass: this.reservationStatusClass(reservation.status),
        dotClass: 'bg-success-500',
      })),
      ...interventions.map((intervention) => ({
        title: `Intervention: ${intervention.title}`,
        timestamp: intervention.updatedAt,
        timeAgo: this.formatTimeAgo(intervention.updatedAt),
        tag: intervention.status,
        tagClass: this.interventionToneClass(intervention.status),
        dotClass: intervention.priority === 'CRITICAL' ? 'bg-error-500' : 'bg-warning-500',
      })),
      ...itInterventions.map((intervention) => ({
        title: `Intervention IT: ${intervention.title}`,
        timestamp: intervention.updatedAt,
        timeAgo: this.formatTimeAgo(intervention.updatedAt),
        tag: intervention.itWorkflowStatus,
        tagClass: this.interventionToneClass(intervention.itWorkflowStatus),
        dotClass: intervention.priority === 'CRITICAL' || intervention.priority === 'HIGH' ? 'bg-error-500' : 'bg-blue-light-500',
      })),
    ];

    if (role !== 'EMPLOYEE') {
      activities.push(...data.notifications.slice(0, 8).map((notification) => ({
        title: notification.title,
        timestamp: notification.createdAt,
        timeAgo: this.formatTimeAgo(notification.createdAt),
        tag: notification.isRead ? 'Lu' : 'Non lu',
        tagClass: notification.isRead ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' : 'bg-warning-50 text-warning-700 dark:bg-warning-500/20 dark:text-warning-300',
        dotClass: notification.isRead ? 'bg-gray-400' : 'bg-warning-500',
      })));
    }

    return activities
      .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
      .slice(0, 5);
  }

  legacyQuickActions(role: AppRole): QuickAction[] {
    if (role === 'ADMIN') {
      return [
        { label: 'Gerer les utilisateurs', route: '/admin' },
        { label: 'Voir les reservations', route: '/reservations/salles' },
        { label: 'Interventions', route: '/interventions' },
        { label: 'Notifications', route: '/notifications' },
      ];
    }
    if (role === 'QUALITY_MANAGER') {
      return [
        { label: 'Parcourir la GED', route: '/documents' },
        { label: 'Documents a valider', route: '/documents', queryParams: { status: 'En attente qualite' } },
        { label: 'Evenements', route: '/events' },
      ];
    }
    if (role === 'IT_MANAGER') {
      return [
        { label: 'Interventions IT', route: '/it/interventions' },
        { label: 'Parc IT', route: '/it/equipements' },
        { label: 'Notifications', route: '/notifications' },
      ];
    }
    return [
      { label: 'Mes reservations', route: '/reservations/mes-reservations' },
      { label: 'Reserver une salle', route: '/reservations/salles' },
      { label: 'Reserver un equipement', route: '/reservations/equipements' },
      { label: 'Declarer une intervention', route: '/it/interventions' },
      { label: 'Parcourir la GED', route: '/documents' },
      { label: 'Evenements', route: '/events' },
    ];
  }

  legacyMiniCalendarCells(data: DashboardData, role: AppRole): MiniCalendarCell[] {
    const events = role === 'EMPLOYEE' ? this.filterPersonalData(data).events : data.events;
    return this.buildMiniCalendarCells(new Date(), events.map((event) => event.startDate));
  }

  legacyMiniCalendarMonthLabel(): string {
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date());
  }

  getTaskToneClass(task: DashboardTaskItem): string {
    if (task.tone === 'high') {
      return 'bg-error-50 text-error-700 dark:bg-error-500/20 dark:text-error-300';
    }
    if (task.tone === 'medium') {
      return 'bg-warning-50 text-warning-700 dark:bg-warning-500/20 dark:text-warning-300';
    }
    return 'bg-success-50 text-success-700 dark:bg-success-500/20 dark:text-success-300';
  }

  private loadDashboardData(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.loadErrorMessage.set('');
    this.disposeAmChart();

    const currentRole = this.resolveHighestRole();
    const canViewAll = currentRole === 'ADMIN';
    const canViewGed = canViewAll || ['EMPLOYEE', 'MANAGER', 'ROOM_MANAGER', 'SECURITY_MANAGER', 'DSN_DIRECTOR', 'QUALITY_MANAGER'].includes(currentRole);
    const canViewFolders = canViewAll || currentRole === 'QUALITY_MANAGER';
    const canViewEvents = canViewAll || ['EMPLOYEE', 'MANAGER', 'ROOM_MANAGER', 'SECURITY_MANAGER', 'DSN_DIRECTOR', 'QUALITY_MANAGER'].includes(currentRole);
    const canViewOperationalInterventions = canViewAll || ['EMPLOYEE', 'MANAGER', 'ROOM_MANAGER', 'DSN_DIRECTOR', 'QUALITY_MANAGER'].includes(currentRole);
    const canViewReservations = canViewAll || ['EMPLOYEE', 'MANAGER', 'ROOM_MANAGER', 'SECURITY_MANAGER', 'DSN_DIRECTOR', 'QUALITY_MANAGER'].includes(currentRole);
    const canViewInvitations = canViewAll || ['EMPLOYEE', 'MANAGER', 'ROOM_MANAGER', 'SECURITY_MANAGER', 'DSN_DIRECTOR', 'QUALITY_MANAGER'].includes(currentRole);
    const canViewItEquipment = canViewAll || currentRole === 'IT_MANAGER';
    const canViewItAssignments = canViewAll || currentRole === 'IT_MANAGER';
    const canViewItInterventions = canViewAll || ['EMPLOYEE', 'MANAGER', 'DSN_DIRECTOR', 'IT_MANAGER'].includes(currentRole);
    const data$ = forkJoin({
      userStats: this.safeSource('Utilisateurs', canViewAll ? this.adminService.getUserStatistics() : of(EMPTY_USER_STATS), EMPTY_USER_STATS),
      documents: this.safeSource('GED', canViewGed ? this.documentService.getDocuments({ page: 0, size: 500 }) : of([] as GedDocument[]), [] as GedDocument[]),
      folderTree: this.safeSource('Dossiers GED', canViewFolders ? this.documentService.getFoldersTree() : of([] as GedFolderTreeNode[]), [] as GedFolderTreeNode[]),
      events: this.safeSource('Evenements', canViewEvents ? this.eventService.getEvents() : of([] as EnterpriseEvent[]), [] as EnterpriseEvent[]),
      interventions: this.safeSource('Interventions', canViewOperationalInterventions ? this.interventionService.getInterventions() : of([] as Intervention[]), [] as Intervention[]),
      itInterventions: canViewItInterventions ? this.loadItInterventionsForRole(currentRole) : of([] as ItIntervention[]),
      itEquipments: canViewItEquipment ? this.safePageSource('Parc IT', this.itEquipmentService.listEquipments({ page: 0, size: 500 })) : of([] as ItEquipment[]),
      itAssignments: canViewItAssignments ? this.safePageSource('Affectations IT', this.itEquipmentService.listAssignments(0, 500)) : of([] as ItEquipmentAssignment[]),
      invitations: this.safeSource('Invitations', canViewInvitations ? this.invitationService.getInvitations(canViewAll) : of([] as Invitation[]), [] as Invitation[]),
      notifications: this.safeSource('Notifications', this.notificationService.getNotifications({ page: 0, size: 500, sort: 'createdAt,desc' }), [] as AppNotification[]),
      roomReservations: this.safeSource('Reservations salles', canViewReservations ? this.reservationService.getRoomReservations() : of([] as RoomReservation[]), [] as RoomReservation[]),
      equipmentReservations: this.safeSource('Reservations equipements', canViewReservations ? this.reservationService.getEquipmentReservations() : of([] as EquipmentReservation[]), [] as EquipmentReservation[]),
      rooms: this.safeSource('Salles', canViewReservations ? this.reservationService.getRooms({ page: 0, size: 500 }) : of([] as Room[]), [] as Room[]),
      equipment: this.safeSource('Equipements', canViewReservations ? this.reservationService.getEquipment({ page: 0, size: 500 }) : of([] as Equipment[]), [] as Equipment[]),
    }).pipe(shareReplay({ bufferSize: 1, refCount: true }));

    this.subscription.add(
      data$.subscribe({
        next: (data) => {
          this.dashboardData.set(data);
          this.isLoading.set(false);
          setTimeout(() => this.renderAmChartIfVisible(), 0);
        },
        error: (error: unknown) => {
          this.hasError.set(true);
          this.loadErrorMessage.set(error instanceof Error ? error.message : 'Chargement impossible.');
          this.isLoading.set(false);
        },
      }),
    );
  }

  private safeSource<T>(label: string, source$: import('rxjs').Observable<T>, fallback: T): import('rxjs').Observable<T> {
    return source$.pipe(
      catchError((error: unknown) => {
        console.warn(`[Dashboard] ${label}`, error);
        return of(fallback);
      }),
    );
  }

  private safePageSource<T>(label: string, source$: import('rxjs').Observable<ApiPageResponse<T>>): import('rxjs').Observable<T[]> {
    return source$.pipe(
      map((response) => response.content ?? []),
      catchError((error: unknown) => {
        console.warn(`[Dashboard] ${label}`, error);
        return of([] as T[]);
      }),
    );
  }

  private loadItInterventionsForRole(role: AppRole): import('rxjs').Observable<ItIntervention[]> {
    if (role === 'ADMIN') {
      return this.safePageSource('Interventions IT', this.itInterventionService.listAll(0, 500));
    }
    if (role === 'MANAGER') {
      return this.safePageSource('Interventions IT', this.itInterventionService.listManager(0, 500));
    }
    if (role === 'DSN_DIRECTOR') {
      return this.safePageSource('Interventions IT', this.itInterventionService.listDsn(0, 500));
    }
    if (role === 'IT_MANAGER') {
      return this.safePageSource('Interventions IT', this.itInterventionService.listProcessing(0, 500));
    }
    return this.safePageSource('Interventions IT', this.itInterventionService.listMine(0, 500));
  }

  private resolveHighestRole(): AppRole {
    const user = this.authService.currentUser;
    const roles = user?.roles?.length ? user.roles : [this.authService.currentRole];
    return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? 'EMPLOYEE';
  }

  private buildRoleDashboard(role: AppRole, data: DashboardData): DashboardVm {
    const dashboard: DashboardVmContent = (() => {
      switch (role) {
        case 'ADMIN':
          return this.buildAdminDashboard(data);
        case 'MANAGER':
          return this.buildManagerDashboard(data);
        case 'ROOM_MANAGER':
          return this.buildRoomManagerDashboard(data);
        case 'SECURITY_MANAGER':
          return this.buildSecurityDashboard(data);
        case 'DSN_DIRECTOR':
          return this.buildDsnDashboard(data);
        case 'QUALITY_MANAGER':
          return this.buildQualityDashboard(data);
        case 'IT_MANAGER':
          return this.buildItDashboard(data);
        default:
          return this.buildEmployeeDashboard(data);
      }
    })();

    return {
      ...dashboard,
      summaryEmpty: this.isDashboardSummaryEmpty(role, data),
    };
  }

  private isDashboardSummaryEmpty(role: AppRole, data: DashboardData): boolean {
    switch (role) {
      case 'ADMIN':
        return data.userStats.totalUsers === 0
          && data.documents.length === 0
          && data.events.length === 0
          && data.interventions.length === 0
          && data.itInterventions.length === 0
          && data.roomReservations.length === 0
          && data.equipmentReservations.length === 0
          && data.notifications.length === 0
          && data.rooms.length === 0
          && data.equipment.length === 0;
      case 'MANAGER':
        return data.events.length === 0
          && data.interventions.length === 0
          && data.notifications.length === 0
          && data.roomReservations.length === 0
          && data.equipmentReservations.length === 0;
      case 'ROOM_MANAGER':
        return data.rooms.length === 0
          && data.roomReservations.length === 0
          && data.equipmentReservations.length === 0
          && data.interventions.length === 0;
      case 'SECURITY_MANAGER':
        return data.events.length === 0
          && data.roomReservations.length === 0;
      case 'DSN_DIRECTOR':
        return data.events.length === 0
          && data.invitations.length === 0
          && data.documents.length === 0
          && data.interventions.length === 0
          && data.itInterventions.length === 0
          && data.roomReservations.length === 0
          && data.equipmentReservations.length === 0;
      case 'QUALITY_MANAGER':
        return data.documents.length === 0
          && data.folderTree.length === 0;
      case 'IT_MANAGER':
        return data.itEquipments.length === 0
          && data.itAssignments.length === 0
          && data.itInterventions.length === 0;
      default: {
        const mine = this.filterPersonalData(data);
        return mine.documents.length === 0
          && mine.events.length === 0
          && mine.rooms.length === 0
          && mine.equipment.length === 0
          && mine.interventions.length === 0
          && mine.itInterventions.length === 0
          && mine.invitations.length === 0;
      }
    }
  }

  private buildAdminDashboard(data: DashboardData): DashboardVmContent {
    const pendingWorkflows = this.countPendingWorkflows(data);
    const recentUnread = data.notifications.filter((item) => !item.isRead && this.daysBetween(item.createdAt, new Date()) <= 7).length;
    return {
      role: 'ADMIN',
      title: 'Vue globale systeme',
      subtitle: 'Pilotage transverse des utilisateurs, workflows et modules metier.',
      kpis: [
        { label: 'Total utilisateurs actifs', value: this.formatNumber(data.userStats.activeUsers), hint: `${data.userStats.totalUsers} comptes au total`, tone: 'brand' },
        { label: 'Microservices UP', value: '6', hint: 'Services metier V1 supervises', tone: 'success' },
        { label: 'Notifications non lues', value: this.formatNumber(recentUnread), hint: 'Toutes confondues, 7 derniers jours', tone: recentUnread > 0 ? 'warning' : 'success' },
        { label: 'Workflows actifs', value: this.formatNumber(pendingWorkflows), hint: 'Demandes et validations ouvertes', tone: pendingWorkflows > 0 ? 'warning' : 'neutral' },
      ],
      charts: [
        this.barChart('users-role', 'Repartition utilisateurs par role', 'Nombre de comptes actifs par role applicatif.', ROLE_PRIORITY.map((role) => ROLE_LABELS[role]), [{ name: 'Utilisateurs', data: this.countUsersByRole(data.userStats) }]),
        this.donutChart('event-status', 'Statuts evenements', 'Evenements regroupes par etat de workflow.', ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'], this.countEventWorkflowStatus(data.events)),
        this.lineChart('login-volume', 'Volume de connexions par jour', 'Connexions connues via les statistiques utilisateurs, 30 derniers jours.', this.lastDaysLabels(30), [{ name: 'Connexions', data: this.userActivityForLastDays(data.userStats, 30) }]),
        this.stackedBarChart('reservation-status-week', 'Reservations par statut', 'Reservations salles et equipements par semaine sur 8 semaines.', this.lastWeekLabels(8), this.reservationStatusByWeek(data, 8)),
      ],
      amChart: { id: 'am-admin-treemap', title: 'GED par categorie', description: 'Treemap des documents GED par categorie et sous-categorie.', kind: 'treemap', empty: data.documents.length === 0 },
      emptyNote: 'Aucune donnee disponible pour la vue administrateur.',
    };
  }

  private buildEmployeeDashboard(data: DashboardData): DashboardVmContent {
    const mine = this.filterPersonalData(data);
    const nextReservations = [...mine.rooms, ...mine.equipment].filter((item) => this.isBetween(item.startDate, new Date(), this.addDays(new Date(), 7)));
    const myOpenInterventions = [...mine.interventions, ...mine.itInterventions].filter((item) => !this.isClosedStatus(this.getStatus(item)));
    const pendingInvitations = mine.invitations.filter((item) => item.status === InvitationStatus.PENDING);
    const publishedDocuments = mine.documents.filter((item) => item.gedStatus === 'Publie' || item.gedStatus === 'Valide qualite').length;
    const occupancy = nextReservations.length === 0 ? 0 : Math.round(nextReservations.reduce((sum, item) => sum + this.hoursBetween(item.startDate, item.endDate), 0) / (7 * 8) * 100);

    return {
      role: 'EMPLOYEE',
      title: 'Vue personnelle',
      subtitle: 'Vos reservations, interventions, invitations et publications GED.',
      kpis: [
        { label: 'Mes reservations a venir', value: this.formatNumber(nextReservations.length), hint: '7 prochains jours', tone: 'brand' },
        { label: 'Mes interventions en cours', value: this.formatNumber(myOpenInterventions.length), hint: 'Demandes operationnelles et IT', tone: myOpenInterventions.length > 0 ? 'warning' : 'success' },
        { label: 'Mes invitations en attente', value: this.formatNumber(pendingInvitations.length), hint: 'Reponse attendue', tone: pendingInvitations.length > 0 ? 'warning' : 'success' },
        { label: 'Mes documents publies', value: this.formatNumber(publishedDocuments), hint: 'Compteur GED personnel', tone: 'neutral' },
      ],
      charts: [
        this.radialChart('my-occupancy', "Taux d'occupation", 'Occupation estimee de vos prochaines reservations.', occupancy),
        this.horizontalBarChart('my-interventions-status', 'Mes interventions par statut', 'Interventions operationnelles et IT ouvertes par statut.', this.statusCounts(mine.interventions, 'status', mine.itInterventions, 'itWorkflowStatus')),
        this.areaChart('my-activity', 'Mes activites sur 30 jours', 'Reservations, interventions et publications GED personnelles.', this.lastDaysLabels(30), this.personalActivitySeries(mine, 30)),
      ],
      amChart: { id: 'am-employee-calendar', title: 'Calendrier personnel', description: 'Heatmap des evenements et reservations des 3 derniers mois.', kind: 'calendar', empty: mine.rooms.length + mine.equipment.length + mine.events.length === 0 },
      emptyNote: 'Aucune donnee personnelle disponible.',
    };
  }

  private buildManagerDashboard(data: DashboardData): DashboardVmContent {
    const pending = data.events.filter((event) => event.workflowStep === 'VALIDATION_MANAGER' || event.status === EventStatus.SUBMITTED);
    const monthlyEvents = data.events.filter((event) => this.isCurrentMonth(event.startDate));
    const activeTeamInterventions = data.interventions.filter((item) => !this.isClosedStatus(item.status));
    const handled = data.events.filter((event) => event.updatedAt >= this.addDays(new Date(), -30));
    const approved = handled.filter((event) => event.status === EventStatus.PUBLISHED || event.status === EventStatus.COMPLETED).length;
    const approvalRate = handled.length ? Math.round((approved / handled.length) * 100) : 0;

    return {
      role: 'MANAGER',
      title: 'Vue equipe',
      subtitle: "Suivi des validations, de l'activite du service et des delais de traitement.",
      kpis: [
        { label: 'Demandes en attente', value: this.formatNumber(pending.length), hint: 'Validation manager', tone: pending.length > 0 ? 'warning' : 'success' },
        { label: 'Evenements du service', value: this.formatNumber(monthlyEvents.length), hint: 'Ce mois', tone: 'brand' },
        { label: 'Interventions equipe', value: this.formatNumber(activeTeamInterventions.length), hint: 'En cours', tone: activeTeamInterventions.length > 0 ? 'warning' : 'success' },
        { label: "Taux d'approbation", value: `${approvalRate}%`, hint: '30 derniers jours', tone: approvalRate >= 70 ? 'success' : 'warning' },
      ],
      charts: [
        this.donutChart('manager-decisions', 'Demandes traitees', 'Approuvees, refusees et en attente.', ['Approuvees', 'Refusees', 'En attente'], [approved, handled.filter((event) => event.status === EventStatus.CANCELLED).length, pending.length]),
        this.barChart('team-activity', 'Activite par membre', 'Evenements et interventions par personne.', this.topActors(data), [{ name: 'Activites', data: this.topActorCounts(data) }]),
        this.comboChart('processing-time', 'Temps moyen de traitement', 'Delai moyen en jours par type de demande.', ['Evenements', 'Reservations', 'Interventions'], [{ name: 'Demandes', type: 'column', data: [data.events.length, data.roomReservations.length + data.equipmentReservations.length, data.interventions.length] }, { name: 'Jours moyens', type: 'line', data: [this.averageDays(data.events), this.averageDays([...data.roomReservations, ...data.equipmentReservations]), this.averageDays(data.interventions)] }]),
      ],
      amChart: { id: 'am-manager-sankey', title: 'Flux des workflows evenement', description: 'Sankey des validations Manager vers les etapes suivantes.', kind: 'sankey', empty: data.events.length === 0 },
      emptyNote: 'Aucune donnee equipe disponible.',
    };
  }

  private buildRoomManagerDashboard(data: DashboardData): DashboardVmContent {
    const now = new Date();
    const occupiedRoomIds = new Set(data.roomReservations.filter((item) => item.status === 'APPROVED' && item.startDate <= now && item.endDate >= now).map((item) => item.roomId));
    const availableNow = data.rooms.filter((room) => room.isActive && room.status !== 'MAINTENANCE' && !occupiedRoomIds.has(room.id)).length;
    const thisWeek = data.roomReservations.filter((item) => this.isCurrentWeek(item.startDate));
    const occupancyRate = this.roomOccupancyRate(data.roomReservations, data.rooms);
    const logistics = data.interventions.filter((item) => !this.isClosedStatus(item.status) && ['INSTALLATION', 'MAINTENANCE'].includes(item.type)).length;

    return {
      role: 'ROOM_MANAGER',
      title: 'Vue ressources',
      subtitle: 'Occupation des salles, reservations et besoins logistiques.',
      kpis: [
        { label: 'Salles disponibles', value: this.formatNumber(availableNow), hint: 'Disponibles maintenant', tone: availableNow > 0 ? 'success' : 'warning' },
        { label: 'Reservations semaine', value: this.formatNumber(thisWeek.length), hint: 'Semaine courante', tone: 'brand' },
        { label: "Taux d'occupation", value: `${occupancyRate}%`, hint: 'Moyenne estimee', tone: occupancyRate > 80 ? 'warning' : 'success' },
        { label: 'Interventions logistiques', value: this.formatNumber(logistics), hint: 'En cours', tone: logistics > 0 ? 'warning' : 'neutral' },
      ],
      charts: [
        this.heatmapChart('room-heatmap', 'Occupation jour/heure', 'Taux d occupation des salles par jour et heure cette semaine.', this.roomHeatmap(data.roomReservations)),
        this.barChart('top-rooms', 'Top 5 salles', 'Salles les plus reservees.', this.topRooms(data.roomReservations).labels, [{ name: 'Reservations', data: this.topRooms(data.roomReservations).values }]),
        this.donutChart('reservation-types', 'Types de reservation', 'Salle vs equipement.', ['Salles', 'Equipements'], [data.roomReservations.length, data.equipmentReservations.length]),
      ],
      amChart: { id: 'am-room-timeline', title: 'Planning salles', description: 'Timeline des reservations des 2 prochaines semaines.', kind: 'timeline', empty: data.roomReservations.length === 0 },
      emptyNote: 'Aucune donnee ressources disponible.',
    };
  }

  private buildSecurityDashboard(data: DashboardData): DashboardVmContent {
    const pendingReservations = data.roomReservations.filter((item) => item.status === 'PENDING').length;
    const pendingPhysicalEvents = data.events.filter((event) => event.eventMode !== 'EN_LIGNE' && (event.workflowStep === 'VALIDATION_SECURITE' || event.status === EventStatus.SUBMITTED)).length;
    const decisions = data.events.filter((event) => this.isCurrentMonth(event.updatedAt) && ['VALIDATION_DSN', 'VALIDATION_SALLE', 'TERMINE', 'REFUSE'].includes(event.workflowStep ?? '')).length;
    const avgDays = this.averageDays(data.events.filter((event) => event.workflowStep === 'VALIDATION_SECURITE' || event.updatedAt));

    return {
      role: 'SECURITY_MANAGER',
      title: 'Vue validations',
      subtitle: 'Validations securite, delais de reponse et liens salles/evenements.',
      kpis: [
        { label: 'Reservations a valider', value: this.formatNumber(pendingReservations), hint: 'Salles en attente', tone: pendingReservations > 0 ? 'warning' : 'success' },
        { label: 'Evenements physiques', value: this.formatNumber(pendingPhysicalEvents), hint: 'En attente securite', tone: pendingPhysicalEvents > 0 ? 'warning' : 'success' },
        { label: 'Validations effectuees', value: this.formatNumber(decisions), hint: 'Ce mois', tone: 'brand' },
        { label: 'Temps moyen', value: `${avgDays} j`, hint: 'Traitement estime', tone: avgDays <= 3 ? 'success' : 'warning' },
      ],
      charts: [
        this.barChart('security-daily', 'Validations par jour', 'Volume quotidien sur 30 jours.', this.lastDaysLabels(30), [{ name: 'Validations', data: this.updatedCountsByDay(data.events, 30) }]),
        this.donutChart('security-decisions', 'Mes decisions', 'Validees, refusees et en attente.', ['Validees', 'Refusees', 'En attente'], [data.events.filter((e) => e.status === EventStatus.PUBLISHED).length, data.events.filter((e) => e.status === EventStatus.CANCELLED).length, pendingPhysicalEvents]),
        this.lineChart('security-response', 'Temps de reponse moyen', 'Evolution estimee du delai moyen.', this.lastDaysLabels(30), [{ name: 'Jours', data: this.rollingAverageDays(data.events, 30) }]),
      ],
      amChart: { id: 'am-security-force', title: 'Evenements et salles', description: 'Graphe des liens entre evenements approuves et salles reservees.', kind: 'force', empty: data.events.length === 0 || data.roomReservations.length === 0 },
      emptyNote: 'Aucune donnee de validation securite disponible.',
    };
  }

  private buildDsnDashboard(data: DashboardData): DashboardVmContent {
    const externalEvents = data.events.filter((event) => event.hasExternalPartners);
    const monthlyDecisions = data.events.filter((event) => this.isCurrentMonth(event.updatedAt) && ['VALIDATION_SALLE', 'TERMINE', 'REFUSE'].includes(event.workflowStep ?? '')).length;
    const yearPartners = data.invitations.filter((item) => item.isExternalPartner && item.sentAt.getFullYear() === new Date().getFullYear()).length;
    const coverage = this.moduleCoverage(data);

    return {
      role: 'DSN_DIRECTOR',
      title: 'Vue strategique',
      subtitle: 'Orientation DSN, partenaires externes et couverture des modules.',
      kpis: [
        { label: 'Evenements externes', value: this.formatNumber(externalEvents.length), hint: 'Avec partenaires', tone: 'brand' },
        { label: 'Decisions DSN', value: this.formatNumber(monthlyDecisions), hint: 'Ce mois', tone: 'success' },
        { label: 'Partenaires invites', value: this.formatNumber(yearPartners), hint: 'Cumul annee', tone: 'neutral' },
        { label: 'Couverture services', value: `${coverage}%`, hint: 'Modules avec donnees', tone: coverage >= 70 ? 'success' : 'warning' },
      ],
      charts: [
        this.comboChart('dsn-events', 'Evenements externes vs internes', 'Evolution mensuelle.', this.lastMonthLabels(12), this.externalInternalSeries(data.events)),
        this.donutChart('dsn-partners', 'Partenaires par organisme', 'Repartition des invitations externes par organisme.', this.partnerDistribution(data.invitations).labels, this.partnerDistribution(data.invitations).values),
        this.radarChart('dsn-maturity', 'Maturite operationnelle', 'Score par module base sur les volumes reels.', ['Events', 'GED', 'Interventions', 'Reservations', 'IT', 'Invitations'], this.moduleMaturity(data)),
      ],
      amChart: { id: 'am-dsn-map', title: 'Partenaires par pays', description: 'Carte mondiale des partenaires externes par pays quand le pays est detectable.', kind: 'map', empty: data.invitations.filter((item) => item.isExternalPartner).length === 0 },
      emptyNote: 'Aucune donnee strategique disponible.',
    };
  }

  private buildQualityDashboard(data: DashboardData): DashboardVmContent {
    const publishedMonth = data.documents.filter((doc) => (doc.gedStatus === 'Publie' || doc.gedStatus === 'Valide qualite') && this.isCurrentMonth(doc.updatedAt)).length;
    const pendingApproval = data.documents.filter((doc) => doc.gedStatus === 'En attente qualite').length;
    const aclRequests = data.documents.filter((doc) => (doc.accessControl.roles?.length ?? 0) > 1).length;
    const confidentialityKnown = data.documents.filter((doc) => !!doc.confidentialityLevel).length;

    return {
      role: 'QUALITY_MANAGER',
      title: 'Vue documentaire',
      subtitle: 'Qualite GED, statuts documentaires, confidentialite et arborescence.',
      kpis: [
        { label: 'Documents publies', value: this.formatNumber(publishedMonth), hint: 'Ce mois', tone: 'success' },
        { label: 'En attente approbation', value: this.formatNumber(pendingApproval), hint: 'Qualite GED', tone: pendingApproval > 0 ? 'warning' : 'success' },
        { label: 'Demandes ACL', value: this.formatNumber(aclRequests), hint: "Acces roles/services detectes", tone: 'neutral' },
        { label: 'Confidentialite renseignee', value: this.formatNumber(confidentialityKnown), hint: 'Documents avec niveau', tone: 'brand' },
      ],
      charts: [
        this.barChart('quality-status', 'Documents par statut', 'Brouillon, soumis, approuve et publie.', ['DRAFT', 'SUBMITTED', 'APPROVED', 'PUBLISHED'], [{ name: 'Documents', data: this.documentStatusCounts(data.documents) }]),
        this.donutChart('quality-confidentiality', 'Niveaux de confidentialite', 'PUBLIC, INTERNAL, RESTRICTED, CONFIDENTIAL.', ['PUBLIC', 'INTERNAL', 'RESTRICTED', 'CONFIDENTIAL'], this.countByFixed(data.documents, 'confidentialityLevel', ['PUBLIC', 'INTERNAL', 'RESTRICTED', 'CONFIDENTIAL'])),
        this.lineChart('quality-versions', 'Versions par document', 'Top 10 documents par nombre de versions.', data.documents.slice(0, 10).map((doc) => this.shorten(doc.title)), [{ name: 'Versions', data: data.documents.slice(0, 10).map((doc) => doc.currentVersionNumber ?? doc.versions.length) }]),
      ],
      amChart: { id: 'am-quality-sunburst', title: 'Arborescence GED', description: 'Sunburst des dossiers GED par volume de documents.', kind: 'sunburst', empty: data.folderTree.length === 0 },
      emptyNote: 'Aucune donnee documentaire disponible.',
    };
  }

  private buildItDashboard(data: DashboardData): DashboardVmContent {
    const openTickets = data.itInterventions.filter((item) => !this.isClosedStatus(item.itWorkflowStatus)).length;
    const inService = data.itEquipments.filter((item) => item.state === 'OPERATIONAL').length;
    const maintenance = data.itEquipments.filter((item) => item.state === 'IN_MAINTENANCE' || item.state === 'IN_REPAIR').length;
    const avgResolution = this.averageDays(data.itInterventions.filter((item) => ['IT_RESOLVED', 'IT_CLOSED'].includes(item.itWorkflowStatus)));

    return {
      role: 'IT_MANAGER',
      title: 'Vue parc et support',
      subtitle: 'Tickets IT, etat du parc, SLA et affectations equipements.',
      kpis: [
        { label: 'Tickets IT ouverts', value: this.formatNumber(openTickets), hint: 'Workflow non clos', tone: openTickets > 0 ? 'warning' : 'success' },
        { label: 'En service / total', value: `${inService}/${data.itEquipments.length}`, hint: 'Parc IT operationnel', tone: 'brand' },
        { label: 'En maintenance', value: this.formatNumber(maintenance), hint: 'Maintenance ou reparation', tone: maintenance > 0 ? 'warning' : 'success' },
        { label: 'Resolution moyenne', value: `${avgResolution} j`, hint: 'Tickets resolus', tone: avgResolution <= 5 ? 'success' : 'warning' },
      ],
      charts: [
        this.stackedBarChart('it-priority-status', 'Interventions IT par priorite', 'Priorite croisee avec le statut.', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], this.itPriorityStatusSeries(data.itInterventions)),
        this.donutChart('it-fleet-state', 'Etat du parc', 'EN_SERVICE, EN_STOCK, EN_MAINTENANCE, HORS_SERVICE, RETIRE.', ['EN_SERVICE', 'EN_STOCK', 'EN_MAINTENANCE', 'HORS_SERVICE', 'RETIRE'], this.itFleetCounts(data.itEquipments)),
        this.lineChart('it-sla', 'SLA resolution tickets', 'Evolution sur 12 semaines.', this.lastWeekLabels(12), [{ name: 'Jours moyens', data: this.itSlaByWeek(data.itInterventions, 12) }]),
      ],
      amChart: { id: 'am-it-network', title: 'Affectations equipements', description: 'Network graph des relations equipements et utilisateurs.', kind: 'network', empty: data.itAssignments.length === 0 && data.itEquipments.filter((item) => item.currentEmployeeName).length === 0 },
      emptyNote: 'Aucune donnee IT disponible.',
    };
  }

  private setupLazyAmChart(): void {
    if (!this.amChartHost?.nativeElement || typeof IntersectionObserver === 'undefined') {
      setTimeout(() => this.renderAmChartIfVisible(), 0);
      return;
    }

    this.observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        this.renderAmChartIfVisible();
      }
    }, { threshold: 0.2 });
    this.observer.observe(this.amChartHost.nativeElement);
  }

  private renderAmChartIfVisible(): void {
    const vm = this.vm();
    const host = this.amChartHost?.nativeElement;
    if (!vm || !host || vm.amChart.empty || this.activeAmChartId === vm.amChart.id) {
      return;
    }

    this.activeAmChartId = vm.amChart.id;
    this.disposeAmChart();
    this.zone.runOutsideAngular(() => {
      void this.createAmChart(vm.amChart.kind, host);
    });
  }

  private async createAmChart(kind: AmChartKind, host: HTMLDivElement): Promise<void> {
    const data = this.dashboardData();
    if (!data) {
      return;
    }

    const am5: any = await import('@amcharts/amcharts5');
    const animated: any = await import('@amcharts/amcharts5/themes/Animated');
    const root = am5.Root.new(host);
    this.amRoot = root;
    root.setThemes([animated.default.new(root)]);

    if (kind === 'map') {
      await this.createMapChart(root, data);
      return;
    }
    if (kind === 'timeline' || kind === 'calendar') {
      await this.createXYChart(root, data, kind);
      return;
    }
    if (kind === 'sankey') {
      await this.createSankeyChart(root, data);
      return;
    }

    await this.createHierarchyChart(root, data, kind);
  }

  private async createHierarchyChart(root: any, data: DashboardData, kind: Exclude<AmChartKind, 'map' | 'timeline' | 'calendar' | 'sankey'>): Promise<void> {
    const hierarchy: any = await import('@amcharts/amcharts5/hierarchy');
    const chartClass = kind === 'treemap' ? hierarchy.Treemap : kind === 'sunburst' ? hierarchy.Sunburst : hierarchy.ForceDirected;
    const chart = root.container.children.push(chartClass.new(root, {
      singleBranchOnly: false,
      downDepth: 1,
      initialDepth: kind === 'sunburst' ? 2 : 1,
      valueField: 'value',
      categoryField: 'name',
      childDataField: 'children',
    }));

    chart.data.setAll([this.hierarchyDataFor(kind, data)]);
    chart.appear(700, 80);
  }

  private async createSankeyChart(root: any, data: DashboardData): Promise<void> {
    const flow: any = await import('@amcharts/amcharts5/flow');
    const chart = root.container.children.push(flow.Sankey.new(root, {
      sourceIdField: 'from',
      targetIdField: 'to',
      valueField: 'value',
      paddingRight: 40,
    }));
    chart.data.setAll(this.sankeyData(data.events));
    chart.appear(700, 80);
  }

  private async createXYChart(root: any, data: DashboardData, kind: 'timeline' | 'calendar'): Promise<void> {
    const am5: any = await import('@amcharts/amcharts5');
    const xy: any = await import('@amcharts/amcharts5/xy');
    const chart = root.container.children.push(xy.XYChart.new(root, { panX: false, panY: false, wheelX: 'none', wheelY: 'none' }));
    const yAxis = chart.yAxes.push(xy.CategoryAxis.new(root, {
      categoryField: 'category',
      renderer: xy.AxisRendererY.new(root, { inversed: true, minGridDistance: 20 }),
    }));
    const xAxis = chart.xAxes.push(xy.DateAxis.new(root, {
      baseInterval: { timeUnit: 'day', count: 1 },
      renderer: xy.AxisRendererX.new(root, { minGridDistance: 50 }),
    }));
    const series = chart.series.push(xy.ColumnSeries.new(root, {
      xAxis,
      yAxis,
      openValueXField: 'start',
      valueXField: 'end',
      categoryYField: 'category',
      sequencedInterpolation: true,
    }));
    series.columns.template.setAll({ height: am5.percent(70), cornerRadiusBL: 4, cornerRadiusBR: 4, cornerRadiusTL: 4, cornerRadiusTR: 4, tooltipText: '{label}' });
    const chartData = kind === 'timeline' ? this.timelineData(data.roomReservations) : this.calendarData(data);
    yAxis.data.setAll(Array.from(new Set(chartData.map((item) => item.category))).map((category) => ({ category })));
    series.data.setAll(chartData);
    chart.appear(700, 80);
  }

  private async createMapChart(root: any, data: DashboardData): Promise<void> {
    const am5: any = await import('@amcharts/amcharts5');
    const map: any = await import('@amcharts/amcharts5/map');
    const worldLow: any = await import('@amcharts/amcharts5-geodata/worldLow');
    const chart = root.container.children.push(map.MapChart.new(root, { projection: map.geoMercator() }));
    const polygonSeries = chart.series.push(map.MapPolygonSeries.new(root, { geoJSON: worldLow.default }));
    polygonSeries.mapPolygons.template.setAll({ fill: am5.color(0xE5E7EB), stroke: am5.color(0xffffff) });
    const pointSeries = chart.series.push(map.MapPointSeries.new(root, { latitudeField: 'lat', longitudeField: 'lon', valueField: 'value' }));
    pointSeries.bullets.push(() => am5.Bullet.new(root, {
      sprite: am5.Circle.new(root, { radius: 6, fill: am5.color(0xD8A528), tooltipText: '{name}: {value}' }),
    }));
    pointSeries.data.setAll(this.partnerCountryPoints(data.invitations));
    chart.appear(700, 80);
  }

  private disposeAmChart(): void {
    this.amRoot?.dispose();
    this.amRoot = undefined;
  }

  private baseChart(type: string, id: string, height = 320): ApexOptions {
    return {
      chart: { id, type, height, toolbar: { show: false }, fontFamily: 'Inter, ui-sans-serif, system-ui' },
      colors: ROLE_COLORS,
      dataLabels: { enabled: false },
      grid: { borderColor: '#E5E7EB', strokeDashArray: 4 },
      legend: { labels: { colors: '#6B7280' } },
      tooltip: { theme: 'light' },
      noData: { text: 'Aucune donnee disponible' },
    };
  }

  private barChart(id: string, title: string, description: string, categories: string[], series: unknown[]): DashboardChart {
    return {
      id,
      title,
      description,
      empty: this.isSeriesEmpty(series),
      options: {
        ...this.baseChart('bar', id),
        series,
        xaxis: { categories, labels: { style: { colors: '#6B7280' } } },
        yaxis: { labels: { style: { colors: '#6B7280' } } },
        plotOptions: { bar: { borderRadius: 5, columnWidth: '50%' } },
      },
    };
  }

  private horizontalBarChart(id: string, title: string, description: string, counts: Record<string, number>): DashboardChart {
    return {
      id,
      title,
      description,
      empty: Object.values(counts).every((value) => value === 0),
      options: {
        ...this.baseChart('bar', id),
        series: [{ name: 'Interventions', data: Object.values(counts) }],
        xaxis: { categories: Object.keys(counts) },
        plotOptions: { bar: { horizontal: true, borderRadius: 5 } },
      },
    };
  }

  private stackedBarChart(id: string, title: string, description: string, categories: string[], series: unknown[]): DashboardChart {
    return {
      id,
      title,
      description,
      empty: this.isSeriesEmpty(series),
      options: {
        ...this.baseChart('bar', id),
        series,
        xaxis: { categories },
        chart: { ...(this.baseChart('bar', id)['chart'] as object), stacked: true },
        plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
      },
    };
  }

  private donutChart(id: string, title: string, description: string, labels: string[], series: number[]): DashboardChart {
    return {
      id,
      title,
      description,
      empty: series.every((value) => value === 0),
      options: {
        ...this.baseChart('donut', id),
        series,
        labels,
        colors: STATUS_COLORS,
        plotOptions: { pie: { donut: { size: '68%', labels: { show: true, total: { show: true, label: 'Total' } } } } },
      },
    };
  }

  private lineChart(id: string, title: string, description: string, categories: string[], series: unknown[]): DashboardChart {
    return {
      id,
      title,
      description,
      empty: this.isSeriesEmpty(series),
      options: {
        ...this.baseChart('line', id),
        series,
        stroke: { width: 3, curve: 'smooth' },
        markers: { size: 3 },
        xaxis: { categories },
      },
    };
  }

  private areaChart(id: string, title: string, description: string, categories: string[], series: unknown[]): DashboardChart {
    return {
      id,
      title,
      description,
      empty: this.isSeriesEmpty(series),
      options: {
        ...this.baseChart('area', id),
        series,
        stroke: { width: 2, curve: 'smooth' },
        fill: { type: 'gradient', gradient: { opacityFrom: 0.32, opacityTo: 0.02 } },
        xaxis: { categories },
      },
    };
  }

  private radialChart(id: string, title: string, description: string, value: number): DashboardChart {
    return {
      id,
      title,
      description,
      empty: value === 0,
      options: {
        ...this.baseChart('radialBar', id),
        series: [Math.min(value, 100)],
        labels: ['Occupation'],
        plotOptions: { radialBar: { hollow: { size: '64%' }, dataLabels: { value: { formatter: (val: number) => `${Math.round(val)}%` } } } },
        colors: ['#0C488C'],
      },
    };
  }

  private comboChart(id: string, title: string, description: string, categories: string[], series: unknown[]): DashboardChart {
    return {
      id,
      title,
      description,
      empty: this.isSeriesEmpty(series),
      options: {
        ...this.baseChart('line', id),
        series,
        stroke: { width: [0, 3], curve: 'smooth' },
        plotOptions: { bar: { columnWidth: '48%', borderRadius: 4 } },
        xaxis: { categories },
      },
    };
  }

  private radarChart(id: string, title: string, description: string, categories: string[], data: number[]): DashboardChart {
    return {
      id,
      title,
      description,
      empty: data.every((value) => value === 0),
      options: {
        ...this.baseChart('radar', id),
        series: [{ name: 'Score', data }],
        xaxis: { categories },
        yaxis: { min: 0, max: 100 },
        colors: ['#0C488C'],
      },
    };
  }

  private heatmapChart(id: string, title: string, description: string, series: unknown[]): DashboardChart {
    return {
      id,
      title,
      description,
      empty: this.isSeriesEmpty(series),
      options: {
        ...this.baseChart('heatmap', id, 340),
        series,
        plotOptions: { heatmap: { shadeIntensity: 0.35, colorScale: { ranges: [{ from: 0, to: 0, color: '#E5E7EB' }, { from: 1, to: 4, color: '#D8A528' }, { from: 5, to: 99, color: '#0C488C' }] } } },
      },
    };
  }

  private isSeriesEmpty(series: unknown[]): boolean {
    return JSON.stringify(series).match(/"data":\[(.*?)\]/g)?.every((match) => !/\d/.test(match.replace(/[^\d]/g, ''))) ?? true;
  }

  private countPendingWorkflows(data: DashboardData): number {
    return data.events.filter((item) => item.status === EventStatus.SUBMITTED).length
      + data.roomReservations.filter((item) => item.status === 'PENDING').length
      + data.equipmentReservations.filter((item) => item.status === 'PENDING').length
      + data.documents.filter((item) => item.gedStatus === 'En attente qualite').length
      + data.itInterventions.filter((item) => !this.isClosedStatus(item.itWorkflowStatus)).length;
  }

  private countUsersByRole(stats: UserStatistics): number[] {
    return ROLE_PRIORITY.map((role) => {
      const apiLabel = ROLE_LABELS[role];
      return stats.usersByRole.find((item) => item.role === role || item.role === apiLabel)?.count ?? 0;
    });
  }

  private countEventWorkflowStatus(events: EnterpriseEvent[]): number[] {
    return [
      events.filter((item) => item.status === EventStatus.DRAFT).length,
      events.filter((item) => item.status === EventStatus.SUBMITTED).length,
      events.filter((item) => item.status === EventStatus.PUBLISHED || item.status === EventStatus.COMPLETED).length,
      events.filter((item) => item.status === EventStatus.CANCELLED).length,
    ];
  }

  private userActivityForLastDays(stats: UserStatistics, days: number): number[] {
    const byDate = new Map(stats.userActivityChart.map((item) => [item.date, item.count]));
    return this.lastDateKeys(days).map((key) => byDate.get(key) ?? 0);
  }

  private reservationStatusByWeek(data: DashboardData, weeks: number): unknown[] {
    const all = [...data.roomReservations, ...data.equipmentReservations];
    const statuses = ['PENDING', 'APPROVED', 'REJECTED'];
    return statuses.map((status) => ({
      name: status,
      data: this.weekStartDates(weeks).map((weekStart) => all.filter((item) => this.sameWeek(item.startDate, weekStart) && item.status === status).length),
    }));
  }

  private filterPersonalData(data: DashboardData): {
    rooms: RoomReservation[];
    equipment: EquipmentReservation[];
    events: EnterpriseEvent[];
    documents: GedDocument[];
    interventions: Intervention[];
    itInterventions: ItIntervention[];
    invitations: Invitation[];
  } {
    return {
      rooms: data.roomReservations.filter((item) => this.matchesCurrentUser(item.userId, '', item.userName)),
      equipment: data.equipmentReservations.filter((item) => this.matchesCurrentUser(item.userId, '', item.userName)),
      events: data.events.filter((item) => this.matchesCurrentUser(item.organiserId, '', item.organiserName) || item.participants.some((participant) => this.matchesCurrentUser(participant.userId, participant.userEmail, participant.userName))),
      documents: data.documents.filter((item) => this.matchesCurrentUser('', '', item.author)),
      interventions: data.interventions.filter((item) => this.matchesCurrentUser(item.requesterId, item.requesterEmail, item.requesterName)),
      itInterventions: data.itInterventions.filter((item) => this.matchesCurrentUser(item.requestedBy, '', item.requesterName)),
      invitations: data.invitations.filter((item) => this.matchesCurrentUser(item.recipientId, item.recipientEmail, item.recipientName)),
    };
  }

  private personalActivitySeries(mine: ReturnType<EnterpriseDashboardComponent['filterPersonalData']>, days: number): unknown[] {
    return [
      { name: 'Reservations', data: this.countDatesByDay([...mine.rooms, ...mine.equipment].map((item) => item.createdAt), days) },
      { name: 'Interventions', data: this.countDatesByDay([...mine.interventions, ...mine.itInterventions].map((item) => item.createdAt), days) },
      { name: 'GED', data: this.countDatesByDay(mine.documents.map((item) => item.uploadedAt), days) },
    ];
  }

  private statusCounts<T, U>(left: T[], leftKey: keyof T, right: U[], rightKey: keyof U): Record<string, number> {
    const counts: Record<string, number> = {};
    [...left.map((item) => String(item[leftKey])), ...right.map((item) => String(item[rightKey]))].forEach((status) => {
      counts[status] = (counts[status] ?? 0) + 1;
    });
    return Object.keys(counts).length ? counts : { AUCUNE: 0 };
  }

  private topActors(data: DashboardData): string[] {
    return this.actorCounts(data).slice(0, 8).map((item) => this.shorten(item.name));
  }

  private topActorCounts(data: DashboardData): number[] {
    return this.actorCounts(data).slice(0, 8).map((item) => item.count);
  }

  private actorCounts(data: DashboardData): Array<{ name: string; count: number }> {
    const counts = new Map<string, number>();
    data.events.forEach((item) => counts.set(item.organiserName, (counts.get(item.organiserName) ?? 0) + 1));
    data.interventions.forEach((item) => counts.set(item.requesterName, (counts.get(item.requesterName) ?? 0) + 1));
    data.roomReservations.forEach((item) => counts.set(item.userName, (counts.get(item.userName) ?? 0) + 1));
    return Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }

  private roomOccupancyRate(reservations: RoomReservation[], rooms: Room[]): number {
    if (rooms.length === 0) {
      return 0;
    }
    const weekHours = rooms.length * 5 * 8;
    const used = reservations.filter((item) => this.isCurrentWeek(item.startDate) && item.status === 'APPROVED').reduce((sum, item) => sum + this.hoursBetween(item.startDate, item.endDate), 0);
    return Math.min(100, Math.round((used / Math.max(weekHours, 1)) * 100));
  }

  private roomHeatmap(reservations: RoomReservation[]): unknown[] {
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const hours = Array.from({ length: 10 }, (_, index) => `${8 + index}h`);
    return days.map((day, dayIndex) => ({
      name: day,
      data: hours.map((hour, hourIndex) => ({
        x: hour,
        y: reservations.filter((item) => this.isCurrentWeek(item.startDate) && ((item.startDate.getDay() + 6) % 7) === dayIndex && item.startDate.getHours() <= 8 + hourIndex && item.endDate.getHours() > 8 + hourIndex).length,
      })),
    }));
  }

  private topRooms(reservations: RoomReservation[]): { labels: string[]; values: number[] } {
    const counts = new Map<string, number>();
    reservations.forEach((item) => counts.set(item.roomName, (counts.get(item.roomName) ?? 0) + 1));
    const rows = Array.from(counts, ([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5);
    return { labels: rows.map((item) => item.label), values: rows.map((item) => item.value) };
  }

  private updatedCountsByDay(items: Array<{ updatedAt: Date }>, days: number): number[] {
    return this.countDatesByDay(items.map((item) => item.updatedAt), days);
  }

  private rollingAverageDays(items: Array<{ createdAt: Date; updatedAt: Date }>, days: number): number[] {
    const keys = this.lastDateKeys(days);
    return keys.map((key) => {
      const dayItems = items.filter((item) => this.dateKey(item.updatedAt) === key);
      return this.averageDays(dayItems);
    });
  }

  private partnerDistribution(invitations: Invitation[]): { labels: string[]; values: number[] } {
    const counts = new Map<string, number>();
    invitations.filter((item) => item.isExternalPartner).forEach((item) => {
      const label = item.partnerOrganization?.trim() || 'Organisme externe';
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
    const rows = Array.from(counts, ([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8);
    return { labels: rows.map((item) => this.shorten(item.label)), values: rows.map((item) => item.value) };
  }

  private externalInternalSeries(events: EnterpriseEvent[]): unknown[] {
    const starts = this.monthStartDates(12);
    return [
      { name: 'Externes', type: 'column', data: starts.map((start) => events.filter((event) => this.sameMonth(event.startDate, start) && event.hasExternalPartners).length) },
      { name: 'Internes', type: 'line', data: starts.map((start) => events.filter((event) => this.sameMonth(event.startDate, start) && !event.hasExternalPartners).length) },
    ];
  }

  private moduleCoverage(data: DashboardData): number {
    const modules = [data.events, data.documents, data.interventions, data.roomReservations, data.itEquipments, data.invitations];
    return Math.round((modules.filter((items) => items.length > 0).length / modules.length) * 100);
  }

  private moduleMaturity(data: DashboardData): number[] {
    return [data.events.length, data.documents.length, data.interventions.length, data.roomReservations.length + data.equipmentReservations.length, data.itInterventions.length + data.itEquipments.length, data.invitations.length]
      .map((count) => Math.min(100, count * 10));
  }

  private documentStatusCounts(documents: GedDocument[]): number[] {
    return [
      documents.filter((item) => item.gedStatus === 'Brouillon').length,
      documents.filter((item) => item.gedStatus === 'En attente qualite').length,
      documents.filter((item) => item.gedStatus === 'Valide qualite').length,
      documents.filter((item) => item.gedStatus === 'Publie').length,
    ];
  }

  private countByFixed<T>(items: T[], key: keyof T, values: string[]): number[] {
    return values.map((value) => items.filter((item) => item[key] === value).length);
  }

  private itPriorityStatusSeries(items: ItIntervention[]): unknown[] {
    const statuses = ['SUBMITTED', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    return statuses.map((status) => ({
      name: status,
      data: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((priority) => items.filter((item) => item.priority === priority && this.normalizeItStatus(item.itWorkflowStatus) === status).length),
    }));
  }

  private itFleetCounts(items: ItEquipment[]): number[] {
    return [
      items.filter((item) => item.state === 'OPERATIONAL').length,
      items.filter((item) => item.assignmentStatus === 'NOT_ASSIGNED' && item.state === 'OPERATIONAL').length,
      items.filter((item) => item.state === 'IN_MAINTENANCE' || item.state === 'IN_REPAIR').length,
      items.filter((item) => item.state === 'OUT_OF_SERVICE').length,
      items.filter((item) => item.state === 'ARCHIVED').length,
    ];
  }

  private itSlaByWeek(items: ItIntervention[], weeks: number): number[] {
    return this.weekStartDates(weeks).map((week) => this.averageDays(items.filter((item) => this.sameWeek(item.updatedAt, week) && ['IT_RESOLVED', 'IT_CLOSED'].includes(item.itWorkflowStatus))));
  }

  private normalizeItStatus(status: string): string {
    if (status.includes('PENDING') || status.includes('APPROVAL')) {
      return 'PENDING';
    }
    if (status.includes('PROGRESS') || status.includes('CHARGE')) {
      return 'IN_PROGRESS';
    }
    if (status.includes('RESOLVED')) {
      return 'RESOLVED';
    }
    if (status.includes('CLOSED')) {
      return 'CLOSED';
    }
    return 'SUBMITTED';
  }

  private hierarchyDataFor(kind: AmChartKind, data: DashboardData): unknown {
    if (kind === 'treemap') {
      return {
        name: 'GED',
        children: this.groupDocumentsForTree(data.documents),
      };
    }
    if (kind === 'sunburst') {
      return {
        name: 'GED',
        children: this.folderNodesForChart(data.folderTree),
      };
    }
    if (kind === 'network') {
      return {
        name: 'Affectations',
        children: this.assignmentNodes(data),
      };
    }
    return {
      name: 'Evenements',
      children: this.eventRoomNodes(data),
    };
  }

  private groupDocumentsForTree(documents: GedDocument[]): unknown[] {
    const categories = new Map<string, Map<string, number>>();
    documents.forEach((doc) => {
      const category = doc.mainCategory || doc.category.name || 'General';
      const subCategory = doc.subCategory || 'Sans sous-categorie';
      if (!categories.has(category)) {
        categories.set(category, new Map());
      }
      const sub = categories.get(category)!;
      sub.set(subCategory, (sub.get(subCategory) ?? 0) + 1);
    });
    return Array.from(categories, ([name, children]) => ({
      name,
      children: Array.from(children, ([childName, value]) => ({ name: childName, value })),
    }));
  }

  private folderNodesForChart(nodes: GedFolderTreeNode[]): unknown[] {
    return nodes.map((node) => ({
      name: node.name,
      value: node.documentCount || 1,
      children: node.children?.length ? this.folderNodesForChart(node.children) : undefined,
    }));
  }

  private assignmentNodes(data: DashboardData): unknown[] {
    const assignments = data.itAssignments.length
      ? data.itAssignments.map((item) => ({ user: item.employeeName, equipment: item.equipmentName }))
      : data.itEquipments.filter((item) => item.currentEmployeeName).map((item) => ({ user: item.currentEmployeeName ?? 'Utilisateur', equipment: item.name }));
    const byUser = new Map<string, string[]>();
    assignments.forEach((item) => {
      byUser.set(item.user, [...(byUser.get(item.user) ?? []), item.equipment]);
    });
    return Array.from(byUser, ([name, equipments]) => ({
      name,
      children: equipments.map((equipment) => ({ name: equipment, value: 1 })),
    }));
  }

  private eventRoomNodes(data: DashboardData): unknown[] {
    const roomNames = new Set(data.roomReservations.map((item) => item.roomName));
    return data.events.filter((event) => event.status === EventStatus.PUBLISHED || event.status === EventStatus.COMPLETED).slice(0, 20).map((event) => ({
      name: event.title,
      children: Array.from(roomNames).slice(0, 2).map((room) => ({ name: room, value: 1 })),
    }));
  }

  private sankeyData(events: EnterpriseEvent[]): Array<{ from: string; to: string; value: number }> {
    const flows = new Map<string, number>();
    const add = (from: string, to: string): void => {
      flows.set(`${from}|${to}`, (flows.get(`${from}|${to}`) ?? 0) + 1);
    };
    events.forEach((event) => {
      add('Manager', event.workflowStep === 'VALIDATION_SECURITE' ? 'Securite' : event.workflowStep === 'VALIDATION_DSN' ? 'DSN' : event.workflowStep === 'VALIDATION_SALLE' ? 'Salle' : 'Decision');
      add(event.workflowStep === 'REFUSE' ? 'Decision' : 'Decision', event.status === EventStatus.CANCELLED ? 'Rejete' : event.status === EventStatus.PUBLISHED || event.status === EventStatus.COMPLETED ? 'Approuve' : 'En attente');
    });
    return Array.from(flows, ([key, value]) => {
      const [from, to] = key.split('|');
      return { from, to, value };
    });
  }

  private timelineData(reservations: RoomReservation[]): Array<{ category: string; start: number; end: number; label: string }> {
    const now = new Date();
    const limit = this.addDays(now, 14);
    return reservations
      .filter((item) => item.startDate >= now && item.startDate <= limit)
      .slice(0, 80)
      .map((item) => ({ category: item.roomName, start: item.startDate.getTime(), end: item.endDate.getTime(), label: `${item.roomName}: ${item.title}` }));
  }

  private calendarData(data: DashboardData): Array<{ category: string; start: number; end: number; label: string }> {
    const start = this.addDays(new Date(), -90);
    const mine = this.filterPersonalData(data);
    return [...mine.events.map((item) => ({ date: item.startDate, label: item.title })), ...mine.rooms.map((item) => ({ date: item.startDate, label: item.roomName })), ...mine.equipment.map((item) => ({ date: item.startDate, label: item.equipmentName }))]
      .filter((item) => item.date >= start)
      .map((item) => ({ category: 'Activites', start: item.date.getTime(), end: this.addDays(item.date, 1).getTime(), label: item.label }));
  }

  private partnerCountryPoints(invitations: Invitation[]): Array<{ name: string; value: number; lat: number; lon: number }> {
    const points: Record<string, { lat: number; lon: number; aliases: string[] }> = {
      Tunisie: { lat: 34, lon: 9, aliases: ['tunisie', 'tunisia'] },
      France: { lat: 46, lon: 2, aliases: ['france'] },
      Algerie: { lat: 28, lon: 2, aliases: ['algerie', 'algeria'] },
      Maroc: { lat: 32, lon: -6, aliases: ['maroc', 'morocco'] },
      Allemagne: { lat: 51, lon: 10, aliases: ['allemagne', 'germany'] },
      Italie: { lat: 42.5, lon: 12.5, aliases: ['italie', 'italy'] },
      Espagne: { lat: 40, lon: -4, aliases: ['espagne', 'spain'] },
      USA: { lat: 39, lon: -98, aliases: ['usa', 'etats-unis', 'united states'] },
    };
    const counts = new Map<string, number>();
    invitations.filter((item) => item.isExternalPartner).forEach((item) => {
      const org = (item.partnerOrganization ?? '').toLowerCase();
      const country = Object.entries(points).find(([, config]) => config.aliases.some((alias) => org.includes(alias)))?.[0] ?? 'Tunisie';
      counts.set(country, (counts.get(country) ?? 0) + 1);
    });
    return Array.from(counts, ([name, value]) => ({ name, value, lat: points[name].lat, lon: points[name].lon }));
  }

  private formatEventDateRange(startDate: Date, endDate: Date): string {
    const formatter = new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
  }

  private eventStatusLabel(status: EventStatus): string {
    if (status === EventStatus.SUBMITTED) {
      return 'En attente';
    }
    if (status === EventStatus.PUBLISHED) {
      return 'Publie';
    }
    if (status === EventStatus.COMPLETED) {
      return 'Termine';
    }
    if (status === EventStatus.CANCELLED) {
      return 'Annule';
    }
    return 'Brouillon';
  }

  private eventStatusClass(status: EventStatus): string {
    if (status === EventStatus.SUBMITTED) {
      return 'bg-warning-50 text-warning-700 dark:bg-warning-500/20 dark:text-warning-300';
    }
    if (status === EventStatus.PUBLISHED || status === EventStatus.COMPLETED) {
      return 'bg-success-50 text-success-700 dark:bg-success-500/20 dark:text-success-300';
    }
    if (status === EventStatus.CANCELLED) {
      return 'bg-error-50 text-error-700 dark:bg-error-500/20 dark:text-error-300';
    }
    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }

  private reservationStatusClass(status: string): string {
    if (status === 'PENDING') {
      return 'bg-warning-50 text-warning-700 dark:bg-warning-500/20 dark:text-warning-300';
    }
    if (['APPROVED', 'IN_USE', 'RETURNED', 'COMPLETED'].includes(status)) {
      return 'bg-success-50 text-success-700 dark:bg-success-500/20 dark:text-success-300';
    }
    if (['REJECTED', 'CANCELLED'].includes(status)) {
      return 'bg-error-50 text-error-700 dark:bg-error-500/20 dark:text-error-300';
    }
    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }

  private interventionToneClass(status: string): string {
    if (this.isClosedStatus(status)) {
      return 'bg-success-50 text-success-700 dark:bg-success-500/20 dark:text-success-300';
    }
    if (status.includes('PENDING') || status === InterventionStatus.OPEN || status === InterventionStatus.ASSIGNED) {
      return 'bg-warning-50 text-warning-700 dark:bg-warning-500/20 dark:text-warning-300';
    }
    return 'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300';
  }

  private buildMiniCalendarCells(referenceDate: Date, eventDates: Date[]): MiniCalendarCell[] {
    const firstDayOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    const lastDayOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
    const firstWeekday = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInMonth = lastDayOfMonth.getDate();
    const eventCounts = new Map<string, number>();
    const today = new Date();

    eventDates.forEach((date) => {
      if (date.getFullYear() !== referenceDate.getFullYear() || date.getMonth() !== referenceDate.getMonth()) {
        return;
      }
      eventCounts.set(this.dateKey(date), (eventCounts.get(this.dateKey(date)) ?? 0) + 1);
    });

    return Array.from({ length: 42 }, (_, index) => {
      const dayNumber = index - firstWeekday + 1;
      if (dayNumber < 1 || dayNumber > daysInMonth) {
        return { date: null, dayNumber: null, isCurrentMonth: false, isToday: false, eventCount: 0 };
      }
      const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), dayNumber);
      return {
        date,
        dayNumber,
        isCurrentMonth: true,
        isToday: this.isSameDay(date, today),
        eventCount: eventCounts.get(this.dateKey(date)) ?? 0,
      };
    });
  }

  private isSameDay(first: Date, second: Date): boolean {
    return first.getFullYear() === second.getFullYear()
      && first.getMonth() === second.getMonth()
      && first.getDate() === second.getDate();
  }

  private formatTimeAgo(date: Date): string {
    const diffMinutes = Math.floor(Math.max(Date.now() - date.getTime(), 0) / 60000);
    if (diffMinutes < 60) {
      return `${Math.max(diffMinutes, 1)} min`;
    }
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours} h`;
    }
    return `${Math.floor(diffHours / 24)} j`;
  }

  private matchesCurrentUser(targetUserId?: string, targetEmail?: string, targetName?: string): boolean {
    const user = this.authService.currentUser;
    if (!user) {
      return false;
    }

    const identities = this.currentUserIdentities(user);
    return this.matchesIdentityValue(targetUserId, identities, false)
      || this.matchesIdentityValue(targetEmail, identities, false)
      || this.matchesIdentityValue(targetName, identities, true);
  }

  private currentUserIdentities(user: {
    id: string;
    username?: string;
    email: string;
    firstName: string;
    lastName: string;
  }): string[] {
    const values = new Set<string>();
    const add = (value?: string): void => {
      const normalized = this.normalizeIdentity(value);
      if (normalized) {
        values.add(normalized);
      }
    };

    add(user.id);
    add(user.username);
    add(user.email);
    add(user.email?.split('@')[0]);
    add(user.username?.split('.')[0]);
    add(`${user.firstName} ${user.lastName}`);
    add(`${user.lastName} ${user.firstName}`);
    add(user.firstName);
    add(user.lastName);

    return Array.from(values);
  }

  private matchesIdentityValue(targetValue: string | undefined, identities: string[], allowContains: boolean): boolean {
    const normalizedTarget = this.normalizeIdentity(targetValue);
    if (!normalizedTarget) {
      return false;
    }

    if (identities.includes(normalizedTarget)) {
      return true;
    }

    if (!allowContains) {
      return false;
    }

    return identities.some((identity) =>
      identity.length >= 3
      && (normalizedTarget.includes(identity) || identity.includes(normalizedTarget))
    );
  }

  private normalizeIdentity(value?: string): string {
    return (value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getStatus(item: Intervention | ItIntervention): string {
    return 'status' in item ? item.status : item.itWorkflowStatus;
  }

  private isClosedStatus(status: string): boolean {
    return ['RESOLVED', 'CLOSED', 'IT_RESOLVED', 'IT_CLOSED', 'COMPLETED', 'CANCELLED'].includes(status);
  }

  private countDatesByDay(dates: Date[], days: number): number[] {
    return this.lastDateKeys(days).map((key) => dates.filter((date) => this.dateKey(date) === key).length);
  }

  private averageDays(items: Array<{ createdAt: Date; updatedAt?: Date }>): number {
    if (items.length === 0) {
      return 0;
    }
    const average = items.reduce((sum, item) => sum + this.daysBetween(item.createdAt, item.updatedAt ?? new Date()), 0) / items.length;
    return Math.round(average * 10) / 10;
  }

  private daysBetween(first: Date, second: Date): number {
    return Math.max(0, (second.getTime() - first.getTime()) / 86400000);
  }

  private hoursBetween(first: Date, second: Date): number {
    return Math.max(0, (second.getTime() - first.getTime()) / 3600000);
  }

  private isBetween(date: Date, start: Date, end: Date): boolean {
    return date >= start && date <= end;
  }

  private isCurrentWeek(date: Date): boolean {
    return this.sameWeek(date, this.weekStart(new Date()));
  }

  private isCurrentMonth(date: Date): boolean {
    return this.sameMonth(date, new Date());
  }

  private sameWeek(date: Date, weekStart: Date): boolean {
    const start = this.weekStart(weekStart);
    const end = this.addDays(start, 7);
    return date >= start && date < end;
  }

  private sameMonth(date: Date, month: Date): boolean {
    return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
  }

  private weekStart(date: Date): Date {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return start;
  }

  private weekStartDates(weeks: number): Date[] {
    const current = this.weekStart(new Date());
    return Array.from({ length: weeks }, (_, index) => this.addDays(current, (index - weeks + 1) * 7));
  }

  private monthStartDates(months: number): Date[] {
    const now = new Date();
    return Array.from({ length: months }, (_, index) => new Date(now.getFullYear(), now.getMonth() - months + 1 + index, 1));
  }

  private lastDateKeys(days: number): string[] {
    return Array.from({ length: days }, (_, index) => this.dateKey(this.addDays(new Date(), index - days + 1)));
  }

  private lastDaysLabels(days: number): string[] {
    return this.lastDateKeys(days).map((key) => key.slice(5));
  }

  private lastWeekLabels(weeks: number): string[] {
    return this.weekStartDates(weeks).map((date) => `S${this.isoWeek(date)}`);
  }

  private lastMonthLabels(months: number): string[] {
    return this.monthStartDates(months).map((date) => new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(date));
  }

  private addDays(date: Date, days: number): Date {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  private dateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private isoWeek(date: Date): number {
    const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    copy.setUTCDate(copy.getUTCDate() + 4 - (copy.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
    return Math.ceil((((copy.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  private shorten(value: string, length = 18): string {
    return value.length > length ? `${value.slice(0, length - 1)}...` : value;
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(value);
  }
}
