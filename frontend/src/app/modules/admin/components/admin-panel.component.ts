import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  User,
  UserStatistics,
  Department,
  PermissionDefinition,
  UserPermissionMatrix,
  AdminRole,
  RolePermissionMatrix,
} from '../../../core/models';
import { Option, SelectComponent } from '../../../shared/components/form/select/select.component';
import { Subscription } from 'rxjs';

interface UserFormModel {
  id: string | null;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  department: string;
  phone: string;
  roles: string[];
  isActive: boolean;
}

interface DepartmentFormModel {
  id: string | null;
  name: string;
  code: string;
  description: string;
  managerName: string;
  isActive: boolean;
}

interface PermissionGroup {
  module: string;
  permissions: PermissionDefinition[];
}

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SelectComponent],
  template: `
    <div class="container mx-auto px-4 py-6">
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-800 mb-2">Administration</h1>
        <p class="text-gray-600">Gestion des utilisateurs, services, permissions et workflows de l'entreprise</p>
        <a
          *ngIf="hasAdminAccess()"
          routerLink="/admin/workflows"
          class="mt-3 inline-flex items-center rounded-lg border border-brand-300 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
          data-testid="go-to-workflows-admin"
        >
          Ouvrir Workflows
        </a>
        <div
          *ngIf="isReadOnlyAdminMode"
          class="mt-3 inline-flex items-center gap-2 rounded-full border border-warning-200 bg-warning-50 px-3 py-1.5 text-xs font-semibold text-warning-700"
        >
          <span>Mode lecture seule</span>
          <span
            class="inline-flex h-4 w-4 items-center justify-center rounded-full border border-warning-300 text-[10px] font-bold"
            [attr.title]="readOnlyAdminHint"
            aria-label="Information mode lecture seule"
          >
            i
          </span>
        </div>
      </div>

      <div *ngIf="!hasAdminAccess()" class="rounded-2xl border border-warning-300 bg-warning-50 p-6 text-warning-700">
        <h2 class="text-lg font-semibold mb-2">Acces restreint</h2>
        <p>
          Ce module est disponible uniquement pour les administrateurs.
          Passez au role <strong>Administrateur</strong> depuis le menu utilisateur pour gerer les utilisateurs et les services.
        </p>
      </div>

      <ng-container *ngIf="hasAdminAccess()">
        <div class="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <article class="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p class="text-2xl font-semibold text-gray-900">{{ usersTotalElements }}</p>
            <p class="mt-1 text-sm text-gray-500">Utilisateurs total</p>
          </article>
          <article class="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p class="text-2xl font-semibold text-gray-900">{{ userStats?.activeUsers || 0 }}</p>
            <p class="mt-1 text-sm text-gray-500">Comptes actifs</p>
          </article>
          <article class="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p class="text-2xl font-semibold text-gray-900">{{ departmentsTotalElements }}</p>
            <p class="mt-1 text-sm text-gray-500">Services configurés</p>
          </article>
          <article class="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p class="text-2xl font-semibold text-gray-900">{{ adminRoles.length }}</p>
            <p class="mt-1 text-sm text-gray-500">Rôles disponibles</p>
          </article>
        </div>

        <div class="flex gap-4 mb-6 border-b overflow-x-auto">
          <button
            *ngFor="let tab of tabs"
            (click)="activeTab = tab"
            [ngClass]="{
              'border-b-2 border-brand-500 font-bold text-brand-600': activeTab === tab
            }"
            class="px-4 py-2 text-gray-600 hover:text-gray-900 transition whitespace-nowrap"
          >
            {{ tab }}
          </button>
        </div>

        <div *ngIf="activeTab === 'Utilisateurs'" class="space-y-4">
          <div *ngIf="isReadOnlyAdminMode" class="rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700">
            <p class="font-semibold">Mode lecture seule actif</p>
            <p class="mt-1">{{ readOnlyAdminHint }}</p>
          </div>

          <button
            *ngIf="canCreateUsers()"
            (click)="startCreateUser()"
            class="px-6 py-3 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-semibold"
          >
            + Ajouter un utilisateur
          </button>

          <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div class="grid grid-cols-1 gap-3 md:grid-cols-4">
              <input
                type="text"
                [(ngModel)]="userSearchTerm"
                (input)="applyUserFilters()"
                placeholder="Rechercher nom, email, username..."
                class="px-4 py-2 border border-gray-300 rounded-lg"
              />
              <app-select
                [(ngModel)]="userStatusFilter"
                (ngModelChange)="applyUserFilters()"
                [options]="userStatusFilterOptions"
                placeholder="Statut"
              ></app-select>
              <app-select
                [(ngModel)]="userRoleFilter"
                (ngModelChange)="applyUserFilters()"
                [options]="userRoleFilterOptions"
                placeholder="Role"
              ></app-select>
              <button
                type="button"
                (click)="resetUserFilters()"
                class="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Reinitialiser
              </button>
            </div>
          </div>

          <div *ngIf="usersLoadError" class="rounded-xl border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700">
            {{ usersLoadError }}
          </div>

          <div *ngIf="showUserForm" class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-bold mb-4">{{ userForm.id ? 'Modifier utilisateur' : 'Creer un utilisateur' }}</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                [(ngModel)]="userForm.firstName"
                placeholder="Prenom"
                class="px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                [(ngModel)]="userForm.lastName"
                placeholder="Nom"
                class="px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="email"
                [(ngModel)]="userForm.email"
                placeholder="Email"
                class="px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                [(ngModel)]="userForm.username"
                placeholder="Nom d'utilisateur"
                class="px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                [(ngModel)]="userForm.department"
                placeholder="Service"
                class="px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                [(ngModel)]="userForm.phone"
                placeholder="Telephone"
                class="px-4 py-2 border border-gray-300 rounded-lg"
              />
              <div class="md:col-span-2">
                <label class="text-sm font-semibold text-gray-700 mb-2 block">Roles attribues</label>
                <select
                  [(ngModel)]="userForm.roles"
                  name="roles"
                  multiple
                  class="min-h-[120px] w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10"
                >
                  <option *ngFor="let role of roleOptionItems" [ngValue]="role.value">{{ role.label }}</option>
                </select>
                <p class="mt-1 text-xs text-gray-500">Utilisez Ctrl/Cmd + clic pour selectionner plusieurs roles.</p>
              </div>
            </div>

            <div *ngIf="formError" class="mt-4 rounded-lg border border-error-300 bg-error-50 px-4 py-2 text-sm text-error-600">
              {{ formError }}
            </div>

            <div class="mt-4 flex gap-2">
              <button
                *ngIf="(userForm.id && canUpdateUsers()) || (!userForm.id && canCreateUsers())"
                (click)="saveUser()"
                class="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition"
              >
                {{ userForm.id ? 'Mettre a jour' : "Creer l'utilisateur" }}
              </button>
              <button
                (click)="cancelUserEdit()"
                class="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >
                Annuler
              </button>
            </div>

            <p
              *ngIf="(userForm.id && !canUpdateUsers()) || (!userForm.id && !canCreateUsers())"
              class="mt-3 text-sm font-medium text-warning-600"
            >
              Vous n'avez pas la permission necessaire pour cette action.
            </p>
          </div>

          <div class="bg-white rounded-lg shadow-md max-h-[68vh] overflow-auto">
            <table class="w-full">
              <thead class="bg-gray-100 border-b">
                <tr>
                  <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nom</th>
                  <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">Service</th>
                  <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">Roles</th>
                  <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">Statut</th>
                  <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="usersLoading">
                  <td colspan="6" class="px-6 py-8 text-center text-gray-500">Chargement des utilisateurs...</td>
                </tr>
                <tr *ngFor="let user of users" class="border-b hover:bg-gray-50">
                  <td class="px-6 py-4">{{ user.firstName }} {{ user.lastName }}</td>
                  <td class="px-6 py-4 text-sm text-gray-600">{{ user.email }}</td>
                  <td class="px-6 py-4 text-sm text-gray-600">{{ user.department || '-' }}</td>
                  <td class="px-6 py-4 text-sm">
                    <div class="flex flex-wrap gap-1">
                      <span *ngFor="let role of user.roles" class="px-2 py-1 bg-brand-100 text-brand-800 rounded text-xs">
                        {{ role }}
                      </span>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <span
                      [ngClass]="{
                        'bg-green-100 text-green-800': user.isActive,
                        'bg-gray-100 text-gray-800': !user.isActive
                      }"
                      class="px-3 py-1 rounded-full text-xs font-semibold"
                    >
                      {{ user.isActive ? 'Actif' : 'Inactif' }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-sm">
                    <ng-container *ngIf="canUpdateUsers(); else readOnlyUserActions">
                      <button (click)="startEditUser(user)" class="text-brand-500 hover:text-brand-700 mr-3">Modifier</button>
                      <button (click)="toggleUserStatus(user)" class="text-indigo-500 hover:text-indigo-700 mr-3">
                        {{ user.isActive ? 'Desactiver' : 'Activer' }}
                      </button>
                      <button (click)="deleteUser(user.id)" class="text-red-500 hover:text-red-700">Supprimer</button>
                    </ng-container>
                    <ng-template #readOnlyUserActions>
                      <span class="inline-flex items-center gap-1 text-xs text-gray-400" [attr.title]="readOnlyAdminHint">
                        Lecture seule
                        <span class="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 text-[10px] font-bold">i</span>
                      </span>
                    </ng-template>
                  </td>
                </tr>
                <tr *ngIf="!usersLoading && users.length === 0">
                  <td colspan="6" class="px-6 py-8 text-center text-gray-500">Aucun utilisateur trouve.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            *ngIf="!usersLoading && usersTotalElements > 0"
            class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3"
          >
            <p class="text-sm text-gray-600">
              Affichage {{ getPaginationStart(usersPage, usersPageSize, usersTotalElements) }}-{{ getPaginationEnd(usersPage, usersPageSize, usersTotalElements) }} sur {{ usersTotalElements }} éléments
            </p>
            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="previousUsersPage()"
                [disabled]="usersPage === 0"
                class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Precedent
              </button>
              <button
                *ngFor="let page of getVisiblePages(usersPage, usersTotalPages)"
                type="button"
                (click)="goToUsersPage(page)"
                class="rounded-lg border px-3 py-2 text-sm font-semibold transition"
                [ngClass]="page === usersPage
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'"
              >
                {{ page + 1 }}
              </button>
              <button
                type="button"
                (click)="nextUsersPage()"
                [disabled]="usersPage + 1 >= usersTotalPages"
                class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>

        <div *ngIf="activeTab === 'Services'" class="space-y-4">
          <div *ngIf="isReadOnlyAdminMode" class="rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700">
            <p class="font-semibold">Mode lecture seule actif</p>
            <p class="mt-1">{{ readOnlyAdminHint }}</p>
          </div>

          <button
            (click)="startCreateDepartment()"
            [disabled]="!canUpdateUsers()"
            [attr.title]="!canUpdateUsers() ? readOnlyAdminHint : null"
            class="px-6 py-3 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            + Ajouter un service
          </button>

          <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
              <input
                type="text"
                [(ngModel)]="departmentSearchTerm"
                (input)="applyDepartmentFilters()"
                placeholder="Rechercher nom, code, manager..."
                class="px-4 py-2 border border-gray-300 rounded-lg"
              />
              <app-select
                [(ngModel)]="departmentActiveFilter"
                (ngModelChange)="applyDepartmentFilters()"
                [options]="departmentStatusFilterOptions"
                placeholder="Statut"
              ></app-select>
              <button
                type="button"
                (click)="resetDepartmentFilters()"
                class="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Reinitialiser
              </button>
            </div>
          </div>

          <div *ngIf="departmentsLoadError" class="rounded-xl border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700">
            {{ departmentsLoadError }}
          </div>

          <div *ngIf="showDepartmentForm" class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-bold mb-4">{{ departmentForm.id ? 'Modifier service' : 'Creer un service' }}</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                [(ngModel)]="departmentForm.name"
                placeholder="Nom du service"
                class="px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                [(ngModel)]="departmentForm.code"
                placeholder="Code (ex: DSN)"
                class="px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                [(ngModel)]="departmentForm.managerName"
                placeholder="Nom du responsable"
                class="px-4 py-2 border border-gray-300 rounded-lg"
              />
              <app-select
                [(ngModel)]="departmentForm.isActive"
                [options]="activeStatusOptions"
                placeholder="Statut"
              ></app-select>
              <textarea
                [(ngModel)]="departmentForm.description"
                rows="3"
                placeholder="Description"
                class="md:col-span-2 px-4 py-2 border border-gray-300 rounded-lg"
              ></textarea>
            </div>

            <div *ngIf="departmentFormError" class="mt-4 rounded-lg border border-error-300 bg-error-50 px-4 py-2 text-sm text-error-600">
              {{ departmentFormError }}
            </div>

            <div class="mt-4 flex gap-2">
              <button
                (click)="saveDepartment()"
                [disabled]="!canUpdateUsers()"
                [attr.title]="!canUpdateUsers() ? readOnlyAdminHint : null"
                class="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {{ departmentForm.id ? 'Mettre a jour le service' : 'Creer le service' }}
              </button>
              <button
                (click)="cancelDepartmentEdit()"
                class="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >
                Annuler
              </button>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-md max-h-[68vh] overflow-auto">
            <table class="w-full">
              <thead class="bg-gray-100 border-b">
                <tr>
                  <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nom</th>
                  <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">Code</th>
                  <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">Responsable</th>
                  <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">Statut</th>
                  <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="departmentsLoading">
                  <td colspan="5" class="px-6 py-8 text-center text-gray-500">Chargement des services...</td>
                </tr>
                <tr *ngFor="let department of departments" class="border-b hover:bg-gray-50">
                  <td class="px-6 py-4">
                    <div class="font-medium text-gray-900">{{ department.name }}</div>
                    <div class="text-xs text-gray-500">{{ department.description || '-' }}</div>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-600">{{ department.code }}</td>
                  <td class="px-6 py-4 text-sm text-gray-600">{{ department.managerName || '-' }}</td>
                  <td class="px-6 py-4">
                    <span
                      [ngClass]="department.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'"
                      class="px-3 py-1 rounded-full text-xs font-semibold"
                    >
                      {{ department.isActive ? 'Actif' : 'Inactif' }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-sm">
                    <ng-container *ngIf="canUpdateUsers(); else readOnlyDepartmentActions">
                      <button (click)="startEditDepartment(department)" class="text-brand-500 hover:text-brand-700 mr-3">Modifier</button>
                      <button (click)="deleteDepartment(department.id)" class="text-red-500 hover:text-red-700">Supprimer</button>
                    </ng-container>
                    <ng-template #readOnlyDepartmentActions>
                      <span class="inline-flex items-center gap-1 text-xs text-gray-400" [attr.title]="readOnlyAdminHint">
                        Lecture seule
                        <span class="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 text-[10px] font-bold">i</span>
                      </span>
                    </ng-template>
                  </td>
                </tr>
                <tr *ngIf="!departmentsLoading && departments.length === 0">
                  <td colspan="5" class="px-6 py-8 text-center text-gray-500">Aucun service configure.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            *ngIf="!departmentsLoading && departmentsTotalElements > 0"
            class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3"
          >
            <p class="text-sm text-gray-600">
              Affichage {{ getPaginationStart(departmentsPage, departmentsPageSize, departmentsTotalElements) }}-{{ getPaginationEnd(departmentsPage, departmentsPageSize, departmentsTotalElements) }} sur {{ departmentsTotalElements }} éléments
            </p>
            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="previousDepartmentsPage()"
                [disabled]="departmentsPage === 0"
                class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Precedent
              </button>
              <button
                *ngFor="let page of getVisiblePages(departmentsPage, departmentsTotalPages)"
                type="button"
                (click)="goToDepartmentsPage(page)"
                class="rounded-lg border px-3 py-2 text-sm font-semibold transition"
                [ngClass]="page === departmentsPage
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'"
              >
                {{ page + 1 }}
              </button>
              <button
                type="button"
                (click)="nextDepartmentsPage()"
                [disabled]="departmentsPage + 1 >= departmentsTotalPages"
                class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>

        <div *ngIf="activeTab === 'Permissions'" class="space-y-4">
          <div class="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 class="text-xl font-bold text-gray-900">Gestion des permissions</h2>
            <p class="mt-1 text-sm text-gray-600">
              Gerez les permissions par role ou par utilisateur avec effet immediat.
            </p>

            <div class="mt-4 inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
              <button
                type="button"
                (click)="permissionEditMode = 'ROLE'"
                class="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                [ngClass]="permissionEditMode === 'ROLE' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'"
              >
                Par role
              </button>
              <button
                type="button"
                (click)="permissionEditMode = 'USER'"
                class="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                [ngClass]="permissionEditMode === 'USER' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'"
              >
                Par utilisateur
              </button>
            </div>
          </div>

          <div *ngIf="isReadOnlyAdminMode" class="rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700">
            <p class="font-semibold">Edition desactivee</p>
            <p class="mt-1">{{ readOnlyAdminHint }}</p>
          </div>

          <ng-container *ngIf="permissionEditMode === 'USER'; else rolePermissionModeTemplate">
            <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <section class="rounded-2xl border border-gray-200 bg-white p-4 xl:col-span-1">
                <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Utilisateurs</h3>

                <div class="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                  <button
                    *ngFor="let user of users"
                    type="button"
                    (click)="selectPermissionsUser(user.id)"
                    class="w-full rounded-xl border px-3 py-3 text-left transition"
                    [ngClass]="selectedPermissionsUserId === user.id
                      ? 'border-brand-400 bg-brand-50'
                      : 'border-gray-200 bg-white hover:border-brand-300 hover:bg-gray-50'"
                  >
                    <p class="text-[11px] font-semibold uppercase tracking-wide text-brand-600">
                      {{ getUserPrimaryRoleLabel(user) }}
                    </p>
                    <p class="text-sm font-semibold text-gray-900">{{ user.firstName }} {{ user.lastName }}</p>
                    <p class="text-xs text-gray-500">{{ user.email }}</p>
                  </button>
                </div>
              </section>

              <section class="rounded-2xl border border-gray-200 bg-white p-4 xl:col-span-2">
                <div *ngIf="!selectedPermissionsUserId" class="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
                  Selectionnez un utilisateur pour modifier ses permissions.
                </div>

                <ng-container *ngIf="selectedPermissionsUserId">
                  <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p class="text-sm text-gray-500">Utilisateur selectionne</p>
                      <p class="text-base font-semibold text-gray-900">{{ selectedPermissionsUserLabel }}</p>
                      <p class="text-xs text-gray-500">
                        Mode: {{ selectedUserPermissions?.customized ? 'Personnalise' : 'Par defaut (roles)' }}
                      </p>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                      <span
                        *ngIf="hasPermissionChanges"
                        class="rounded-full bg-warning-100 px-2 py-1 text-[11px] font-semibold text-warning-700"
                      >
                        Modifications non sauvegardees
                      </span>

                      <button
                        type="button"
                        (click)="saveSelectedUserPermissions()"
                        [disabled]="isSavingPermissions || !hasPermissionChanges || !canUpdateUsers()"
                        [attr.title]="!canUpdateUsers() ? readOnlyAdminHint : null"
                        class="rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Sauvegarder
                      </button>

                      <button
                        type="button"
                        (click)="resetSelectedUserPermissions()"
                        [disabled]="isSavingPermissions || !canUpdateUsers()"
                        [attr.title]="!canUpdateUsers() ? readOnlyAdminHint : null"
                        class="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Reinitialiser par roles
                      </button>
                    </div>
                  </div>

                  <div *ngIf="permissionsFeedback"
                    class="mb-4 rounded-lg border px-3 py-2 text-sm"
                    [ngClass]="permissionsFeedbackTone === 'success'
                      ? 'border-success-200 bg-success-50 text-success-700'
                      : 'border-error-200 bg-error-50 text-error-700'"
                  >
                    {{ permissionsFeedback }}
                  </div>

                  <div class="space-y-4" *ngIf="filteredPermissionRows.length > 0; else noUserPermissionsTemplate">
                    <div class="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 md:grid-cols-3">
                      <input
                        type="text"
                        [value]="permissionSearchTerm"
                        (input)="permissionSearchTerm = $any($event.target).value"
                        placeholder="Rechercher une permission..."
                        class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-400 focus:outline-hidden"
                      />

                      <select
                        [value]="permissionModuleFilter"
                        (change)="permissionModuleFilter = $any($event.target).value"
                        class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-400 focus:outline-hidden"
                      >
                        <option value="ALL">Tous les modules</option>
                        <option *ngFor="let module of permissionModuleOptions" [value]="module">
                          {{ module }}
                        </option>
                      </select>

                      <div class="flex items-center justify-end rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
                        {{ filteredPermissionRows.length }} permission(s)
                      </div>
                    </div>

                    <div class="overflow-hidden rounded-xl border border-gray-200">
                      <div class="overflow-x-auto">
                        <table class="min-w-full">
                          <thead class="border-b border-gray-200 bg-gray-50">
                            <tr>
                              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Module</th>
                              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Permission</th>
                              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Code</th>
                              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Source</th>
                              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Activer</th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-gray-100 bg-white">
                            <tr *ngFor="let permission of filteredPermissionRows" class="hover:bg-gray-50">
                              <td class="px-4 py-3 text-sm font-semibold text-gray-700">{{ permission.module }}</td>
                              <td class="px-4 py-3">
                                <p class="text-sm font-semibold text-gray-900">{{ permission.label }}</p>
                                <p class="text-xs text-gray-500">{{ permission.description }}</p>
                              </td>
                              <td class="px-4 py-3 text-[11px] font-mono text-gray-500">{{ permission.code }}</td>
                              <td class="px-4 py-3">
                                <div class="flex flex-wrap gap-1">
                                  <span
                                    *ngIf="isPermissionRoleDerived(permission.code)"
                                    class="rounded-full bg-indigo-100 px-2 py-1 text-[11px] font-semibold text-indigo-700"
                                  >
                                    Role
                                  </span>
                                  <span
                                    *ngIf="isPermissionAssigned(permission.code)"
                                    class="rounded-full bg-brand-100 px-2 py-1 text-[11px] font-semibold text-brand-700"
                                  >
                                    Personnalise
                                  </span>
                                  <span
                                    *ngIf="!isPermissionRoleDerived(permission.code) && !isPermissionAssigned(permission.code)"
                                    class="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-500"
                                  >
                                    Inactif
                                  </span>
                                </div>
                              </td>
                              <td class="px-4 py-3 text-right">
                                <label class="inline-flex cursor-pointer items-center justify-end">
                                  <input
                                    type="checkbox"
                                    class="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                    [checked]="isPermissionChecked(permission.code)"
                                    [disabled]="isSavingPermissions || !canUpdateUsers()"
                                    [attr.title]="!canUpdateUsers() ? readOnlyAdminHint : null"
                                    (change)="togglePermission(permission.code, $event)"
                                  />
                                </label>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <ng-template #noUserPermissionsTemplate>
                    <div class="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
                      Aucune permission disponible.
                    </div>
                  </ng-template>
                </ng-container>
              </section>
            </div>
          </ng-container>

          <ng-template #rolePermissionModeTemplate>
            <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <section class="rounded-2xl border border-gray-200 bg-white p-4 xl:col-span-1">
                <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Roles</h3>

                <div class="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                  <button
                    *ngFor="let role of adminRoles"
                    type="button"
                    (click)="selectPermissionsRole(role.id)"
                    class="w-full rounded-xl border px-3 py-3 text-left transition"
                    [ngClass]="selectedPermissionsRoleId === role.id
                      ? 'border-brand-400 bg-brand-50'
                      : 'border-gray-200 bg-white hover:border-brand-300 hover:bg-gray-50'"
                  >
                    <p class="text-sm font-semibold uppercase tracking-wide text-gray-900">{{ getRoleLabel(role.name) }}</p>
                    <p class="text-xs text-gray-500">{{ role.description || role.name }}</p>
                  </button>
                </div>
              </section>

              <section class="rounded-2xl border border-gray-200 bg-white p-4 xl:col-span-2">
                <div *ngIf="!selectedPermissionsRoleId" class="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
                  Selectionnez un role pour modifier ses permissions.
                </div>

                <ng-container *ngIf="selectedPermissionsRoleId">
                  <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p class="text-sm text-gray-500">Role selectionne</p>
                      <p class="text-base font-semibold text-gray-900">{{ selectedPermissionsRoleLabel }}</p>
                      <p class="text-xs text-gray-500">
                        {{ selectedRolePermissions?.usersInRole || 0 }} utilisateur(s) | {{ selectedRolePermissions?.usersUsingRoleDefaults || 0 }} sur valeurs role
                      </p>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                      <label class="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700">
                        <input
                          type="checkbox"
                          class="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                          [(ngModel)]="applyRolePermissionsToUsers"
                          [disabled]="isSavingPermissions || !canUpdateUsers()"
                        />
                        Appliquer a tous les utilisateurs du role
                      </label>

                      <span
                        *ngIf="hasRolePermissionChanges"
                        class="rounded-full bg-warning-100 px-2 py-1 text-[11px] font-semibold text-warning-700"
                      >
                        Modifications non sauvegardees
                      </span>

                      <button
                        type="button"
                        (click)="saveSelectedRolePermissions()"
                        [disabled]="isSavingPermissions || !hasRolePermissionChanges || !canUpdateUsers()"
                        [attr.title]="!canUpdateUsers() ? readOnlyAdminHint : null"
                        class="rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Sauvegarder
                      </button>
                    </div>
                  </div>

                  <div *ngIf="rolePermissionsFeedback"
                    class="mb-4 rounded-lg border px-3 py-2 text-sm"
                    [ngClass]="rolePermissionsFeedbackTone === 'success'
                      ? 'border-success-200 bg-success-50 text-success-700'
                      : 'border-error-200 bg-error-50 text-error-700'"
                  >
                    {{ rolePermissionsFeedback }}
                  </div>

                  <div class="space-y-4" *ngIf="filteredPermissionRows.length > 0; else noRolePermissionsTemplate">
                    <div class="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 md:grid-cols-3">
                      <input
                        type="text"
                        [value]="permissionSearchTerm"
                        (input)="permissionSearchTerm = $any($event.target).value"
                        placeholder="Rechercher une permission..."
                        class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-400 focus:outline-hidden"
                      />

                      <select
                        [value]="permissionModuleFilter"
                        (change)="permissionModuleFilter = $any($event.target).value"
                        class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-400 focus:outline-hidden"
                      >
                        <option value="ALL">Tous les modules</option>
                        <option *ngFor="let module of permissionModuleOptions" [value]="module">
                          {{ module }}
                        </option>
                      </select>

                      <div class="flex items-center justify-end rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
                        {{ filteredPermissionRows.length }} permission(s)
                      </div>
                    </div>

                    <div class="overflow-hidden rounded-xl border border-gray-200">
                      <div class="overflow-x-auto">
                        <table class="min-w-full">
                          <thead class="border-b border-gray-200 bg-gray-50">
                            <tr>
                              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Module</th>
                              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Permission</th>
                              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Code</th>
                              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Activer</th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-gray-100 bg-white">
                            <tr *ngFor="let permission of filteredPermissionRows" class="hover:bg-gray-50">
                              <td class="px-4 py-3 text-sm font-semibold text-gray-700">{{ permission.module }}</td>
                              <td class="px-4 py-3">
                                <p class="text-sm font-semibold text-gray-900">{{ permission.label }}</p>
                                <p class="text-xs text-gray-500">{{ permission.description }}</p>
                              </td>
                              <td class="px-4 py-3 text-[11px] font-mono text-gray-500">{{ permission.code }}</td>
                              <td class="px-4 py-3 text-right">
                                <label class="inline-flex cursor-pointer items-center justify-end">
                                  <input
                                    type="checkbox"
                                    class="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                    [checked]="isRolePermissionChecked(permission.code)"
                                    [disabled]="isSavingPermissions || !canUpdateUsers()"
                                    [attr.title]="!canUpdateUsers() ? readOnlyAdminHint : null"
                                    (change)="toggleRolePermission(permission.code, $event)"
                                  />
                                </label>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <ng-template #noRolePermissionsTemplate>
                    <div class="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
                      Aucune permission disponible.
                    </div>
                  </ng-template>
                </ng-container>
              </section>
            </div>
          </ng-template>
        </div>

        <div *ngIf="activeTab === 'Workflows'" class="space-y-4">
          <section class="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 class="text-xl font-bold text-gray-900">Workflows</h2>
            <p class="mt-1 text-sm text-gray-600">
              Pilotez les circuits de validation et vérifiez les étapes responsables par module.
            </p>

            <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <article class="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p class="text-2xl font-semibold text-gray-900">{{ usersTotalElements }}</p>
                <p class="mt-1 text-sm text-gray-500">Utilisateurs impactés</p>
              </article>
              <article class="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p class="text-2xl font-semibold text-gray-900">{{ adminRoles.length }}</p>
                <p class="mt-1 text-sm text-gray-500">Rôles de validation</p>
              </article>
              <article class="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p class="text-2xl font-semibold text-gray-900">{{ departmentsTotalElements }}</p>
                <p class="mt-1 text-sm text-gray-500">Services concernés</p>
              </article>
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <a
                routerLink="/admin/workflows"
                class="inline-flex items-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Ouvrir le panneau Workflows
              </a>
            </div>
          </section>
        </div>
      </ng-container>
    </div>
  `,
  styles: []
})
export class AdminPanelComponent implements OnInit, OnDestroy {
  tabs = ['Utilisateurs', 'Services', 'Permissions', 'Workflows'];
  activeTab = 'Utilisateurs';
  readonly readOnlyAdminHint = 'Permission UPDATE_USER manquante : modifications des utilisateurs, services et permissions desactivees.';
  permissionEditMode: 'ROLE' | 'USER' = 'ROLE';

  users: User[] = [];
  adminRoles: AdminRole[] = [];
  departments: Department[] = [];
  userStats: UserStatistics | null = null;
  permissionCatalog: PermissionDefinition[] = [];
  permissionGroups: PermissionGroup[] = [];
  selectedPermissionsUserId: string | null = null;
  selectedUserPermissions: UserPermissionMatrix | null = null;
  selectedEffectivePermissionCodes = new Set<string>();
  selectedSavedPermissionCodes = new Set<string>();
  selectedPermissionsRoleId: string | null = null;
  selectedRolePermissions: RolePermissionMatrix | null = null;
  selectedRolePermissionCodes = new Set<string>();
  selectedSavedRolePermissionCodes = new Set<string>();
  rolePermissionsFeedback = '';
  rolePermissionsFeedbackTone: 'success' | 'error' = 'success';
  applyRolePermissionsToUsers = true;
  isSavingPermissions = false;
  permissionsFeedback = '';
  permissionsFeedbackTone: 'success' | 'error' = 'success';
  permissionSearchTerm = '';
  permissionModuleFilter = 'ALL';

  showUserForm = false;
  formError = '';

  showDepartmentForm = false;
  departmentFormError = '';
  userSearchTerm = '';
  userRoleFilter = '';
  userStatusFilter: '' | 'true' | 'false' = '';
  usersPage = 0;
  usersPageSize = 10;
  usersTotalElements = 0;
  usersTotalPages = 0;
  usersLoading = false;
  usersLoadError = '';

  departmentSearchTerm = '';
  departmentActiveFilter: '' | 'true' | 'false' = '';
  departmentsPage = 0;
  departmentsPageSize = 10;
  departmentsTotalElements = 0;
  departmentsTotalPages = 0;
  departmentsLoading = false;
  departmentsLoadError = '';
  statsLoading = false;
  statsLoadError = '';
  private usersPageStateSubscription?: Subscription;
  private departmentsPageStateSubscription?: Subscription;

  readonly roleOptions: string[] = [
    'ADMIN',
    'EMPLOYEE',
    'MANAGER',
    'ROOM_MANAGER',
    'IT_MANAGER',
    'SECURITY_MANAGER',
    'DSN_DIRECTOR',
    'QUALITY_MANAGER'
  ];

  readonly activeStatusOptions: Option[] = [
    { value: true, label: 'Actif' },
    { value: false, label: 'Inactif' },
  ];
  readonly userStatusFilterOptions: Option[] = [
    { value: '', label: 'Tous les statuts' },
    { value: 'true', label: 'Actif' },
    { value: 'false', label: 'Inactif' },
  ];
  readonly departmentStatusFilterOptions: Option[] = [
    { value: '', label: 'Tous les statuts' },
    { value: 'true', label: 'Actif' },
    { value: 'false', label: 'Inactif' },
  ];

  get roleOptionItems(): Option[] {
    return this.roleOptions.map((role) => ({
      value: role,
      label: this.getRoleLabel(role),
    }));
  }

  get userRoleFilterOptions(): Option[] {
    return [
      { value: '', label: 'Tous les roles' },
      ...this.roleOptionItems,
    ];
  }

  userForm: UserFormModel = this.getEmptyUserForm();
  departmentForm: DepartmentFormModel = this.getEmptyDepartmentForm();

  constructor(private adminService: AdminService, private authService: AuthService) {}

  ngOnInit(): void {
    this.usersPageStateSubscription = this.adminService.usersPageState$.subscribe((pageState) => {
      this.usersPage = pageState.page;
      this.usersPageSize = pageState.size;
      this.usersTotalElements = pageState.totalElements;
      const safeSize = pageState.size > 0 ? pageState.size : this.usersPageSize || 1;
      const computedPages = pageState.totalElements > 0 ? Math.ceil(pageState.totalElements / safeSize) : 0;
      this.usersTotalPages = Math.max(pageState.totalPages, computedPages);
    });
    this.departmentsPageStateSubscription = this.adminService.departmentsPageState$.subscribe((pageState) => {
      this.departmentsPage = pageState.page;
      this.departmentsPageSize = pageState.size;
      this.departmentsTotalElements = pageState.totalElements;
      const safeSize = pageState.size > 0 ? pageState.size : this.departmentsPageSize || 1;
      const computedPages = pageState.totalElements > 0 ? Math.ceil(pageState.totalElements / safeSize) : 0;
      this.departmentsTotalPages = Math.max(pageState.totalPages, computedPages);
    });

    this.loadUsers();
    this.loadAdminRoles();
    this.loadDepartments();
    this.loadStatistics();
    this.loadPermissionCatalog();
  }

  ngOnDestroy(): void {
    this.usersPageStateSubscription?.unsubscribe();
    this.departmentsPageStateSubscription?.unsubscribe();
  }

  hasAdminAccess(): boolean {
    return this.authService.hasRole('ADMIN');
  }

  get isReadOnlyAdminMode(): boolean {
    return this.hasAdminAccess() && !this.canUpdateUsers();
  }

  canCreateUsers(): boolean {
    return this.authService.hasPermission('CREATE_USER');
  }

  canUpdateUsers(): boolean {
    return this.authService.hasPermission('UPDATE_USER');
  }

  getUserPrimaryRoleLabel(user: User): string {
    const primaryRole = user.roles?.[0] ?? 'EMPLOYEE';
    return this.getRoleLabel(primaryRole);
  }

  getRoleLabel(roleCode: string): string {
    const labels: Record<string, string> = {
      ADMIN: 'Administrateur',
      EMPLOYEE: 'Employe',
      EMPLOYE: 'Employe',
      MANAGER: 'Chef hierarchique',
      CHEF_HIERARCHIQUE: 'Chef hierarchique',
      ROOM_MANAGER: 'Responsable salle',
      RESPONSABLE_SALLE: 'Responsable salle',
      IT_MANAGER: 'Responsable IT',
      RESPONSABLE_IT: 'Responsable IT',
      SECURITY_MANAGER: 'Responsable securite',
      RESPONSABLE_SECURITE: 'Responsable securite',
      DSN_DIRECTOR: 'Directeur DSN',
      DIRECTEUR_DSN: 'Directeur DSN',
      QUALITY_MANAGER: 'Responsable qualite',
      RESPONSABLE_QUALITE: 'Responsable qualite',
    };

    return labels[roleCode] ?? roleCode;
  }

  get hasPermissionChanges(): boolean {
    if (this.selectedEffectivePermissionCodes.size !== this.selectedSavedPermissionCodes.size) {
      return true;
    }

    return Array.from(this.selectedEffectivePermissionCodes)
      .some((code) => !this.selectedSavedPermissionCodes.has(code));
  }

  get hasRolePermissionChanges(): boolean {
    if (this.selectedRolePermissionCodes.size !== this.selectedSavedRolePermissionCodes.size) {
      return true;
    }

    return Array.from(this.selectedRolePermissionCodes)
      .some((code) => !this.selectedSavedRolePermissionCodes.has(code));
  }

  loadUsers(): void {
    this.usersLoading = true;
    this.usersLoadError = '';
    this.adminService.getUsers({
      page: this.usersPage,
      size: this.usersPageSize,
      search: this.userSearchTerm.trim() || undefined,
      enabled: this.userStatusFilter === '' ? undefined : this.userStatusFilter === 'true',
      role: this.userRoleFilter || undefined,
      sort: 'createdAt,desc',
    }).subscribe({
      next: (users) => {
        this.users = users;
        this.usersLoading = false;
      },
      error: (error) => {
        this.users = [];
        this.usersLoading = false;
        this.usersLoadError = error instanceof Error ? error.message : 'Chargement des utilisateurs impossible.';
      }
    });
  }

  loadAdminRoles(): void {
    this.adminService.getAdminRoles().subscribe({
      next: (roles) => {
        this.adminRoles = roles;
        if (!this.selectedPermissionsRoleId && roles.length > 0) {
          this.selectPermissionsRole(roles[0].id);
        }
      },
      error: (error) => {
        this.rolePermissionsFeedbackTone = 'error';
        this.rolePermissionsFeedback = error instanceof Error ? error.message : 'Chargement des roles impossible.';
      }
    });
  }

  loadDepartments(): void {
    this.departmentsLoading = true;
    this.departmentsLoadError = '';
    this.adminService.getDepartments({
      page: this.departmentsPage,
      size: this.departmentsPageSize,
      search: this.departmentSearchTerm.trim() || undefined,
      active: this.departmentActiveFilter === '' ? undefined : this.departmentActiveFilter === 'true',
      sort: 'name,asc',
    }).subscribe({
      next: (departments) => {
        this.departments = departments;
        this.departmentsLoading = false;
      },
      error: (error) => {
        this.departments = [];
        this.departmentsLoading = false;
        this.departmentsLoadError = error instanceof Error ? error.message : 'Chargement des services impossible.';
      }
    });
  }

  applyUserFilters(): void {
    this.usersPage = 0;
    this.loadUsers();
  }

  resetUserFilters(): void {
    this.userSearchTerm = '';
    this.userRoleFilter = '';
    this.userStatusFilter = '';
    this.usersPage = 0;
    this.loadUsers();
  }

  nextUsersPage(): void {
    if (this.usersPage + 1 >= this.usersTotalPages) {
      return;
    }
    this.usersPage += 1;
    this.loadUsers();
  }

  previousUsersPage(): void {
    if (this.usersPage <= 0) {
      return;
    }
    this.usersPage -= 1;
    this.loadUsers();
  }

  goToUsersPage(page: number): void {
    if (page < 0 || page >= this.usersTotalPages || page === this.usersPage) {
      return;
    }
    this.usersPage = page;
    this.loadUsers();
  }

  applyDepartmentFilters(): void {
    this.departmentsPage = 0;
    this.loadDepartments();
  }

  resetDepartmentFilters(): void {
    this.departmentSearchTerm = '';
    this.departmentActiveFilter = '';
    this.departmentsPage = 0;
    this.loadDepartments();
  }

  nextDepartmentsPage(): void {
    if (this.departmentsPage + 1 >= this.departmentsTotalPages) {
      return;
    }
    this.departmentsPage += 1;
    this.loadDepartments();
  }

  previousDepartmentsPage(): void {
    if (this.departmentsPage <= 0) {
      return;
    }
    this.departmentsPage -= 1;
    this.loadDepartments();
  }

  goToDepartmentsPage(page: number): void {
    if (page < 0 || page >= this.departmentsTotalPages || page === this.departmentsPage) {
      return;
    }
    this.departmentsPage = page;
    this.loadDepartments();
  }

  getVisiblePages(currentPage: number, totalPages: number): number[] {
    if (totalPages <= 0) {
      return [];
    }

    const maxButtons = 5;
    const half = Math.floor(maxButtons / 2);
    let start = Math.max(0, currentPage - half);
    let end = Math.min(totalPages - 1, start + maxButtons - 1);

    if ((end - start + 1) < maxButtons) {
      start = Math.max(0, end - maxButtons + 1);
    }

    const pages: number[] = [];
    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }

    return pages;
  }

  getPaginationStart(page: number, size: number, total: number): number {
    if (total <= 0) {
      return 0;
    }
    return page * size + 1;
  }

  getPaginationEnd(page: number, size: number, total: number): number {
    if (total <= 0) {
      return 0;
    }
    return Math.min((page + 1) * size, total);
  }

  loadStatistics(): void {
    this.statsLoading = true;
    this.statsLoadError = '';
    this.adminService.getUserStatistics().subscribe({
      next: (stats) => {
        this.userStats = stats;
        this.statsLoading = false;
      },
      error: (error) => {
        this.userStats = null;
        this.statsLoading = false;
        this.statsLoadError = error instanceof Error ? error.message : 'Chargement des statistiques impossible.';
      },
    });
  }

  get selectedPermissionsUserLabel(): string {
    if (!this.selectedPermissionsUserId) {
      return '';
    }

    const user = this.users.find((item) => item.id === this.selectedPermissionsUserId);
    if (!user) {
      return '';
    }

    return `${user.firstName} ${user.lastName}`.trim() || user.email;
  }

  get selectedPermissionsRoleLabel(): string {
    if (!this.selectedPermissionsRoleId) {
      return '';
    }

    const role = this.adminRoles.find((item) => item.id === this.selectedPermissionsRoleId);
    if (!role) {
      return '';
    }

    return this.getRoleLabel(role.name);
  }

  get permissionModuleOptions(): string[] {
    return this.permissionGroups
      .map((group) => group.module)
      .filter((module, index, array) => module && array.indexOf(module) === index)
      .sort((moduleA, moduleB) => moduleA.localeCompare(moduleB, 'fr', { sensitivity: 'base' }));
  }

  get filteredPermissionRows(): PermissionDefinition[] {
    const normalizedSearch = this.permissionSearchTerm.trim().toLowerCase();

    return this.permissionCatalog
      .filter((permission) => {
        if (this.permissionModuleFilter !== 'ALL' && permission.module !== this.permissionModuleFilter) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        const searchable = `${permission.module} ${permission.label} ${permission.code} ${permission.description}`.toLowerCase();
        return searchable.includes(normalizedSearch);
      })
      .sort((permissionA, permissionB) => {
        const moduleComparison = permissionA.module.localeCompare(permissionB.module, 'fr', { sensitivity: 'base' });
        if (moduleComparison !== 0) {
          return moduleComparison;
        }

        return permissionA.label.localeCompare(permissionB.label, 'fr', { sensitivity: 'base' });
      });
  }

  loadPermissionCatalog(): void {
    this.adminService.getPermissionCatalog().subscribe({
      next: (permissions) => {
        this.permissionCatalog = permissions;
        this.permissionGroups = this.groupPermissionsByModule(permissions);
      },
      error: (error) => {
        this.permissionsFeedbackTone = 'error';
        this.permissionsFeedback = error instanceof Error ? error.message : 'Chargement des permissions impossible.';
      }
    });
  }

  selectPermissionsUser(userId: string): void {
    this.selectedPermissionsUserId = userId;
    this.permissionsFeedback = '';
    this.selectedUserPermissions = null;
    this.selectedEffectivePermissionCodes = new Set<string>();
    this.selectedSavedPermissionCodes = new Set<string>();

    this.adminService.getUserPermissionMatrix(userId).subscribe({
      next: (matrix) => {
        this.selectedUserPermissions = matrix;
        this.selectedEffectivePermissionCodes = new Set(matrix.effectivePermissions);
        this.selectedSavedPermissionCodes = new Set(matrix.effectivePermissions);
      },
      error: (error) => {
        this.permissionsFeedbackTone = 'error';
        this.permissionsFeedback = error instanceof Error ? error.message : 'Chargement des permissions utilisateur impossible.';
      }
    });
  }

  isPermissionChecked(permissionCode: string): boolean {
    return this.selectedEffectivePermissionCodes.has(permissionCode);
  }

  isPermissionRoleDerived(permissionCode: string): boolean {
    return this.selectedUserPermissions?.roleDerivedPermissions.includes(permissionCode) ?? false;
  }

  isPermissionAssigned(permissionCode: string): boolean {
    return this.selectedUserPermissions?.assignedPermissions.includes(permissionCode) ?? false;
  }

  togglePermission(permissionCode: string, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const shouldEnable = !!input?.checked;

    if (!this.selectedPermissionsUserId || !this.canUpdateUsers()) {
      return;
    }

    if (shouldEnable) {
      this.selectedEffectivePermissionCodes.add(permissionCode);
    } else {
      this.selectedEffectivePermissionCodes.delete(permissionCode);
    }
  }

  saveSelectedUserPermissions(): void {
    if (!this.selectedPermissionsUserId || !this.canUpdateUsers() || !this.hasPermissionChanges) {
      return;
    }

    this.isSavingPermissions = true;
    this.permissionsFeedback = '';

    const payload = Array.from(this.selectedEffectivePermissionCodes);
    this.adminService.updateUserPermissions(this.selectedPermissionsUserId, payload).subscribe({
      next: (matrix) => {
        this.isSavingPermissions = false;
        this.selectedUserPermissions = matrix;
        this.selectedEffectivePermissionCodes = new Set(matrix.effectivePermissions);
        this.selectedSavedPermissionCodes = new Set(matrix.effectivePermissions);
        this.permissionsFeedbackTone = 'success';
        this.permissionsFeedback = 'Permissions utilisateur mises a jour.';
        this.refreshCurrentSessionPermissionsIfNeeded(matrix.userId);
      },
      error: (error) => {
        this.isSavingPermissions = false;
        this.permissionsFeedbackTone = 'error';
        this.permissionsFeedback = error instanceof Error ? error.message : 'Mise a jour des permissions impossible.';
      }
    });
  }

  resetSelectedUserPermissions(): void {
    if (!this.selectedPermissionsUserId || !this.canUpdateUsers()) {
      return;
    }

    this.isSavingPermissions = true;
    this.permissionsFeedback = '';

    this.adminService.resetUserPermissions(this.selectedPermissionsUserId).subscribe({
      next: (matrix) => {
        this.isSavingPermissions = false;
        this.selectedUserPermissions = matrix;
        this.selectedEffectivePermissionCodes = new Set(matrix.effectivePermissions);
        this.selectedSavedPermissionCodes = new Set(matrix.effectivePermissions);
        this.permissionsFeedbackTone = 'success';
        this.permissionsFeedback = 'Permissions reinitialisees selon les roles.';
        this.refreshCurrentSessionPermissionsIfNeeded(matrix.userId);
      },
      error: (error) => {
        this.isSavingPermissions = false;
        this.permissionsFeedbackTone = 'error';
        this.permissionsFeedback = error instanceof Error ? error.message : 'Reinitialisation des permissions impossible.';
      }
    });
  }

  selectPermissionsRole(roleId: string): void {
    this.selectedPermissionsRoleId = roleId;
    this.rolePermissionsFeedback = '';
    this.selectedRolePermissions = null;
    this.selectedRolePermissionCodes = new Set<string>();
    this.selectedSavedRolePermissionCodes = new Set<string>();

    this.adminService.getRolePermissionMatrix(roleId).subscribe({
      next: (matrix) => {
        this.selectedRolePermissions = matrix;
        this.selectedRolePermissionCodes = new Set(matrix.assignedPermissions);
        this.selectedSavedRolePermissionCodes = new Set(matrix.assignedPermissions);
      },
      error: (error) => {
        this.rolePermissionsFeedbackTone = 'error';
        this.rolePermissionsFeedback = error instanceof Error ? error.message : 'Chargement des permissions role impossible.';
      }
    });
  }

  isRolePermissionChecked(permissionCode: string): boolean {
    return this.selectedRolePermissionCodes.has(permissionCode);
  }

  toggleRolePermission(permissionCode: string, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const shouldEnable = !!input?.checked;

    if (!this.selectedPermissionsRoleId || !this.canUpdateUsers()) {
      return;
    }

    if (shouldEnable) {
      this.selectedRolePermissionCodes.add(permissionCode);
    } else {
      this.selectedRolePermissionCodes.delete(permissionCode);
    }
  }

  saveSelectedRolePermissions(): void {
    if (!this.selectedPermissionsRoleId || !this.canUpdateUsers() || !this.hasRolePermissionChanges) {
      return;
    }

    this.isSavingPermissions = true;
    this.rolePermissionsFeedback = '';

    const payload = Array.from(this.selectedRolePermissionCodes);
    this.adminService.updateRolePermissionMatrix(
      this.selectedPermissionsRoleId,
      payload,
      this.applyRolePermissionsToUsers,
    ).subscribe({
      next: (matrix) => {
        this.isSavingPermissions = false;
        this.selectedRolePermissions = matrix;
        this.selectedRolePermissionCodes = new Set(matrix.assignedPermissions);
        this.selectedSavedRolePermissionCodes = new Set(matrix.assignedPermissions);
        this.rolePermissionsFeedbackTone = 'success';
        this.rolePermissionsFeedback = this.applyRolePermissionsToUsers
          ? 'Permissions du role mises a jour et appliquees aux utilisateurs.'
          : 'Permissions du role mises a jour.';
        if (this.applyRolePermissionsToUsers) {
          this.loadUsers();
        }
        this.authService.reloadPermissions();
      },
      error: (error) => {
        this.isSavingPermissions = false;
        this.rolePermissionsFeedbackTone = 'error';
        this.rolePermissionsFeedback = error instanceof Error ? error.message : 'Mise a jour des permissions role impossible.';
      }
    });
  }

  startCreateUser(): void {
    if (!this.canCreateUsers()) {
      this.formError = 'Permission CREATE_USER manquante.';
      return;
    }

    this.formError = '';
    this.userForm = this.getEmptyUserForm();
    this.showUserForm = true;
  }

  startEditUser(user: User): void {
    if (!this.canUpdateUsers()) {
      this.formError = 'Permission UPDATE_USER manquante.';
      return;
    }

    this.formError = '';
    this.userForm = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: user.username,
      department: user.department || '',
      phone: user.phone || '',
      roles: [...user.roles],
      isActive: user.isActive
    };
    this.showUserForm = true;
  }

  cancelUserEdit(): void {
    this.showUserForm = false;
    this.userForm = this.getEmptyUserForm();
    this.formError = '';
  }

  saveUser(): void {
    if (this.userForm.id && !this.canUpdateUsers()) {
      this.formError = 'Permission UPDATE_USER manquante.';
      return;
    }

    if (!this.userForm.id && !this.canCreateUsers()) {
      this.formError = 'Permission CREATE_USER manquante.';
      return;
    }

    if (!this.userForm.firstName.trim() || !this.userForm.email.trim() || this.userForm.roles.length === 0) {
      this.formError = 'Le prenom, l email et au moins un role sont obligatoires.';
      return;
    }

    this.formError = '';

    if (this.userForm.id) {
      const userId = this.userForm.id;
      this.adminService.updateUser(userId, {
        firstName: this.userForm.firstName.trim(),
        lastName: this.userForm.lastName.trim(),
        email: this.userForm.email.trim(),
        username: this.userForm.username.trim() || this.userForm.email.split('@')[0],
        department: this.userForm.department.trim(),
        phone: this.userForm.phone.trim(),
        roles: [...this.userForm.roles],
        isActive: this.userForm.isActive
      }).subscribe({
        next: () => {
          this.loadUsers();
          this.cancelUserEdit();
        },
        error: (error) => {
          this.formError = error instanceof Error ? error.message : 'Mise a jour utilisateur impossible.';
        },
      });
      return;
    }

    this.adminService.createUser({
      firstName: this.userForm.firstName.trim(),
      lastName: this.userForm.lastName.trim(),
      email: this.userForm.email.trim(),
      username: this.userForm.username.trim() || this.userForm.email.split('@')[0],
      department: this.userForm.department.trim(),
      phone: this.userForm.phone.trim(),
      roles: [...this.userForm.roles],
      isActive: this.userForm.isActive
    }).subscribe({
      next: () => {
        this.loadUsers();
        this.loadStatistics();
        this.cancelUserEdit();
      },
      error: (error) => {
        this.formError = error instanceof Error ? error.message : 'Creation utilisateur impossible.';
      },
    });
  }

  toggleUserStatus(user: User): void {
    if (!this.canUpdateUsers()) {
      this.formError = 'Permission UPDATE_USER manquante.';
      return;
    }

    this.adminService.updateUser(user.id, { isActive: !user.isActive }).subscribe({
      next: () => {
        this.loadUsers();
        this.loadStatistics();
      },
      error: (error) => {
        this.formError = error instanceof Error ? error.message : 'Mise a jour du statut utilisateur impossible.';
      },
    });
  }

  deleteUser(id: string): void {
    if (!this.canUpdateUsers()) {
      this.formError = 'Permission UPDATE_USER manquante.';
      return;
    }

    if (!confirm('Supprimer cet utilisateur ?')) {
      return;
    }

    this.adminService.deleteUser(id).subscribe({
      next: () => {
        this.loadUsers();
        this.loadStatistics();
      },
      error: (error) => {
        this.formError = error instanceof Error ? error.message : 'Suppression utilisateur impossible.';
      },
    });
  }

  startCreateDepartment(): void {
    if (!this.canUpdateUsers()) {
      this.departmentFormError = this.readOnlyAdminHint;
      return;
    }

    this.departmentFormError = '';
    this.departmentForm = this.getEmptyDepartmentForm();
    this.showDepartmentForm = true;
  }

  startEditDepartment(department: Department): void {
    if (!this.canUpdateUsers()) {
      this.departmentFormError = this.readOnlyAdminHint;
      return;
    }

    this.departmentFormError = '';
    this.departmentForm = {
      id: department.id,
      name: department.name,
      code: department.code,
      description: department.description || '',
      managerName: department.managerName || '',
      isActive: department.isActive
    };
    this.showDepartmentForm = true;
  }

  cancelDepartmentEdit(): void {
    this.showDepartmentForm = false;
    this.departmentForm = this.getEmptyDepartmentForm();
    this.departmentFormError = '';
  }

  saveDepartment(): void {
    if (!this.canUpdateUsers()) {
      this.departmentFormError = this.readOnlyAdminHint;
      return;
    }

    if (!this.departmentForm.name.trim() || !this.departmentForm.code.trim()) {
      this.departmentFormError = 'Le nom du service et le code sont obligatoires.';
      return;
    }

    this.departmentFormError = '';

    if (this.departmentForm.id) {
      this.adminService.updateDepartment(this.departmentForm.id, {
        name: this.departmentForm.name.trim(),
        code: this.departmentForm.code.trim().toUpperCase(),
        description: this.departmentForm.description.trim(),
        managerName: this.departmentForm.managerName.trim(),
        isActive: this.departmentForm.isActive
      }).subscribe({
        next: () => {
          this.loadDepartments();
          this.cancelDepartmentEdit();
        },
        error: (error) => {
          this.departmentFormError = error instanceof Error ? error.message : 'Mise a jour service impossible.';
        },
      });
      return;
    }

    this.adminService.createDepartment({
      name: this.departmentForm.name.trim(),
      code: this.departmentForm.code.trim().toUpperCase(),
      description: this.departmentForm.description.trim(),
      managerName: this.departmentForm.managerName.trim(),
      isActive: this.departmentForm.isActive
    }).subscribe({
      next: () => {
        this.loadDepartments();
        this.cancelDepartmentEdit();
      },
      error: (error) => {
        this.departmentFormError = error instanceof Error ? error.message : 'Creation service impossible.';
      },
    });
  }

  deleteDepartment(id: string): void {
    if (!this.canUpdateUsers()) {
      this.departmentFormError = this.readOnlyAdminHint;
      return;
    }

    if (!confirm('Supprimer ce service ?')) {
      return;
    }

    this.adminService.deleteDepartment(id).subscribe({
      next: () => {
        this.loadDepartments();
      },
      error: (error) => {
        this.departmentFormError = error instanceof Error ? error.message : 'Suppression service impossible.';
      },
    });
  }

  private groupPermissionsByModule(permissions: PermissionDefinition[]): PermissionGroup[] {
    const grouped = new Map<string, PermissionDefinition[]>();

    permissions.forEach((permission) => {
      const key = permission.module || 'GENERAL';
      const existing = grouped.get(key) ?? [];
      existing.push(permission);
      grouped.set(key, existing);
    });

    return Array.from(grouped.entries())
      .sort(([moduleA], [moduleB]) => moduleA.localeCompare(moduleB, 'fr', { sensitivity: 'base' }))
      .map(([module, modulePermissions]) => ({
        module,
        permissions: [...modulePermissions].sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' })),
      }));
  }

  private getEmptyUserForm(): UserFormModel {
    return {
      id: null,
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      department: '',
      phone: '',
      roles: ['EMPLOYEE'],
      isActive: true
    };
  }

  private getEmptyDepartmentForm(): DepartmentFormModel {
    return {
      id: null,
      name: '',
      code: '',
      description: '',
      managerName: '',
      isActive: true
    };
  }

  private refreshCurrentSessionPermissionsIfNeeded(updatedUserId: string): void {
    if (this.authService.currentUser?.id !== updatedUserId) {
      return;
    }

    this.authService.reloadPermissions();
  }
}
