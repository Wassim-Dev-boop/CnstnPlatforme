import { Routes } from '@angular/router';
import { ProfileComponent } from './pages/profile/profile.component';
import { NotFoundComponent } from './pages/other-page/not-found/not-found.component';
import { AppLayoutComponent } from './shared/layout/app-layout/app-layout.component';
import { SignInComponent } from './pages/auth-pages/sign-in/sign-in.component';
import { SignUpComponent } from './pages/auth-pages/sign-up/sign-up.component';
import { ForgotPasswordComponent } from './pages/auth-pages/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/auth-pages/reset-password/reset-password.component';
import { PublicHomeComponent } from './pages/public-home/public-home.component';
import { GlobalSearchComponent } from './pages/search/global-search.component';

// Modules metier
import { EnterpriseDashboardComponent } from './pages/dashboard/enterprise-dashboard/enterprise-dashboard.component';
import { GedListComponent } from './modules/ged/components/ged-list.component';
import { GedWorkspaceComponent } from './modules/ged/components/ged-workspace.component';
import { EventsListComponent } from './modules/events/components/events-list.component';
import { EventAlbumComponent } from './modules/events/components/event-album.component';
import { EventMeetingComponent } from './modules/events/components/event-meeting.component';
import { InvitationsComponent } from './modules/events/components/invitations.component';
import { RoomReservationsComponent } from './modules/reservations/components/room-reservations.component';
import { EquipmentReservationsComponent } from './modules/reservations/components/equipment-reservations.component';
import { MyReservationsComponent } from './modules/reservations/components/my-reservations.component';
import { NotificationsComponent } from './modules/notifications/components/notifications.component';
import { InterventionsComponent } from './modules/interventions/components/interventions.component';
import { ItEquipmentComponent } from './modules/it/components/it-equipment.component';
import { ItInterventionsComponent } from './modules/it/components/it-interventions.component';
import { AdminPanelComponent } from './modules/admin/components/admin-panel.component';
import { AdminWorkflowsComponent } from './modules/admin/components/admin-workflows.component';
import { authGuard, roleGuard } from './core/guards/auth.guard';
import { AppRole } from './core/models';

const allBusinessRoles: AppRole[] = [
  'ADMIN',
  'EMPLOYEE',
  'MANAGER',
  'ROOM_MANAGER',
  'IT_MANAGER',
  'SECURITY_MANAGER',
  'DSN_DIRECTOR',
  'QUALITY_MANAGER'
];

const reservationBusinessRoles: AppRole[] = [
  'ADMIN',
  'EMPLOYEE',
  'MANAGER',
  'ROOM_MANAGER',
  'IT_MANAGER',
  'SECURITY_MANAGER',
  'DSN_DIRECTOR',
  'QUALITY_MANAGER'
];

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'accueil',
    pathMatch: 'full'
  },
  {
    path: 'accueil',
    component: PublicHomeComponent,
    title: 'Accueil | CNSTN'
  },
  // Pages d'authentification
  {
    path: 'login',
    component: SignInComponent,
    title: 'Connexion | CNSTN'
  },
  {
    path: 'signin',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'inscription',
    component: SignUpComponent,
    title: 'Inscription | CNSTN'
  },
  {
    path: 'signup',
    redirectTo: 'inscription',
    pathMatch: 'full'
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent,
    title: 'Mot de passe oublie | CNSTN'
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent,
    title: 'Reinitialisation du mot de passe | CNSTN'
  },
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        component: EnterpriseDashboardComponent,
        canActivate: [roleGuard],
        data: { roles: allBusinessRoles },
        title: 'Tableau de bord | CNSTN',
      },
      {
        path: 'profile',
        component: ProfileComponent,
        canActivate: [roleGuard],
        data: { roles: allBusinessRoles },
        title: 'Mon profil | CNSTN'
      },
      {
        path: 'search',
        component: GlobalSearchComponent,
        canActivate: [roleGuard],
        data: { roles: allBusinessRoles },
        title: 'Recherche globale | CNSTN',
      },

      // Modules metier
      // Gestion documentaire (GED) - nouveau workspace (layout 3 colonnes)
      {
        path: 'documents',
        component: GedWorkspaceComponent,
        canActivate: [roleGuard],
        data: { roles: allBusinessRoles, permissions: ['VIEW_GED_MODULE'] },
        title: 'Gestion documentaire | CNSTN',
      },
      {
        path: 'documents/classic',
        component: GedListComponent,
        canActivate: [roleGuard],
        data: { roles: allBusinessRoles, permissions: ['VIEW_GED_MODULE'] },
        title: 'Gestion documentaire (classique) | CNSTN',
      },

      // Gestion des evenements
      {
        path: 'events',
        component: EventsListComponent,
        canActivate: [roleGuard],
        data: { roles: allBusinessRoles, permissions: ['VIEW_EVENTS_MODULE'] },
        title: 'Gestion des evenements | CNSTN',
      },
      {
        path: 'events/:id/album',
        component: EventAlbumComponent,
        canActivate: [roleGuard],
        data: { roles: allBusinessRoles, permissions: ['VIEW_EVENTS_MODULE'] },
        title: 'Album photos evenement | CNSTN',
      },
      {
        path: 'events/:id/meeting',
        component: EventMeetingComponent,
        canActivate: [roleGuard],
        data: { roles: allBusinessRoles, permissions: ['VIEW_EVENTS_MODULE'], hideNavbar: true },
        title: 'Salle virtuelle evenement | CNSTN',
      },
      {
        path: 'invitations',
        component: InvitationsComponent,
        canActivate: [roleGuard],
        data: {
          roles: ['ADMIN', 'EMPLOYEE', 'MANAGER', 'DSN_DIRECTOR', 'QUALITY_MANAGER', 'SECURITY_MANAGER'] as AppRole[],
          permissions: ['VIEW_EVENTS_MODULE'],
        },
        title: 'Invitations | CNSTN',
      },

      // Reservations
      {
        path: 'reservations',
        redirectTo: 'reservations/salles',
        pathMatch: 'full',
      },
      {
        path: 'reservations/mes-reservations',
        component: MyReservationsComponent,
        canActivate: [roleGuard],
        data: { roles: reservationBusinessRoles },
        title: 'Mes reservations | CNSTN',
      },
      {
        path: 'reservations/salles',
        component: RoomReservationsComponent,
        canActivate: [roleGuard],
        data: { roles: reservationBusinessRoles },
        title: 'Reservations des salles | CNSTN',
      },
      {
        path: 'reservations/equipements',
        component: EquipmentReservationsComponent,
        canActivate: [roleGuard],
        data: { roles: reservationBusinessRoles },
        title: 'Reservations des equipements | CNSTN',
      },

      // Interventions techniques
      {
        path: 'it/equipements',
        component: ItEquipmentComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'IT_MANAGER'] as AppRole[] },
        title: 'Parc équipements IT | CNSTN',
      },
      {
        path: 'it/interventions',
        component: ItInterventionsComponent,
        canActivate: [roleGuard],
        data: {
          roles: ['ADMIN', 'EMPLOYEE', 'MANAGER', 'DSN_DIRECTOR', 'IT_MANAGER'] as AppRole[],
          permissions: ['VIEW_INTERVENTIONS_MODULE'],
        },
        title: 'Interventions IT | CNSTN',
      },
      {
        path: 'interventions',
        component: InterventionsComponent,
        canActivate: [roleGuard],
        data: {
          roles: ['ADMIN', 'ROOM_MANAGER', 'EMPLOYEE', 'MANAGER'] as AppRole[],
          permissions: ['VIEW_INTERVENTIONS_MODULE'],
        },
        title: 'Interventions logistiques | CNSTN',
      },

      // Notifications
      {
        path: 'notifications',
        component: NotificationsComponent,
        canActivate: [roleGuard],
        data: { roles: allBusinessRoles },
        title: 'Notifications | CNSTN',
      },

      // Administration
      {
        path: 'admin/workflows',
        component: AdminWorkflowsComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] as AppRole[], permissions: ['VIEW_USERS_MODULE'] },
        title: 'Administration des workflows | CNSTN',
      },
      {
        path: 'admin',
        component: AdminPanelComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] as AppRole[], permissions: ['VIEW_USERS_MODULE'] },
        title: 'Administration | CNSTN',
      },
    ]
  },
  // Page d'erreur
  {
    path: '**',
    component: NotFoundComponent,
    title: 'Page introuvable | CNSTN'
  },
];
