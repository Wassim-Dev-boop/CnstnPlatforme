import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription, catchError, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';
import {
  GlobalSearchGroup,
  GlobalSearchResponse,
  GlobalSearchResult,
  GlobalSearchService,
} from '../../core/services/global-search.service';

@Component({
  selector: 'app-global-search',
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <section class="space-y-6">
      <div class="flex flex-col gap-4 border-b border-gray-200 pb-5 dark:border-gray-800 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-sm font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">Recherche globale</p>
          <h1 class="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">Resultats</h1>
          @if (currentQuery) {
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {{ response?.totalResults || 0 }} resultat(s) pour "{{ currentQuery }}"
          </p>
          }
        </div>

        <form class="flex w-full max-w-2xl gap-2" (submit)="submitSearch($event)">
          <input
            type="search"
            name="search"
            [(ngModel)]="searchTerm"
            class="h-11 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            placeholder="Rechercher dans les documents, evenements, salles..."
          />
          <button
            type="submit"
            class="h-11 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Rechercher
          </button>
        </form>
      </div>

      @if (!currentQuery) {
      <div class="border-y border-gray-200 py-12 text-center dark:border-gray-800">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Lancez une recherche</h2>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Les resultats accessibles seront regroupes par module.
        </p>
      </div>
      } @else if (isLoading) {
      <div class="space-y-4">
        @for (item of loadingRows; track item) {
        <div class="h-28 animate-pulse rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"></div>
        }
      </div>
      } @else if (errorMessage) {
      <div class="rounded-lg border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
        {{ errorMessage }}
      </div>
      } @else if (response && response.groups.length > 0) {
      <div class="space-y-8">
        @for (group of response.groups; track trackGroup($index, group)) {
        <section class="space-y-3 border-t border-gray-200 pt-5 dark:border-gray-800">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{{ group.label }}</h2>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                @if (group.error) {
                Module indisponible pour cette recherche.
                } @else {
                {{ group.total }} resultat(s)
                }
              </p>
            </div>

            @if (!group.error) {
            <a
              [routerLink]="group.route"
              [queryParams]="group.queryParams"
              class="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Ouvrir le module
            </a>
            }
          </div>

          @if (!group.error) {
          <div class="grid gap-3 lg:grid-cols-2">
            @for (result of group.results; track trackResult($index, result)) {
            <a
              [routerLink]="result.route"
              [queryParams]="result.queryParams || null"
              class="block rounded-lg border border-gray-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-500/60"
            >
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-md bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                  {{ result.typeLabel }}
                </span>
                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ result.moduleLabel }}</span>
                @if (result.date) {
                <span class="text-xs text-gray-400">- {{ formatDate(result.date) }}</span>
                }
              </div>

              <h3 class="mt-3 line-clamp-1 text-base font-semibold text-gray-900 dark:text-white">{{ result.title }}</h3>
              @if (result.description) {
              <p class="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">{{ result.description }}</p>
              }
              @if (result.meta.length > 0) {
              <div class="mt-3 flex flex-wrap gap-2">
                @for (meta of result.meta; track meta) {
                <span class="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">{{ meta }}</span>
                }
              </div>
              }
            </a>
            }
          </div>
          }
        </section>
        }
      </div>
      } @else {
      <div class="border-y border-gray-200 py-12 text-center dark:border-gray-800">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Aucun resultat</h2>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Essayez avec un autre mot-cle ou une reference plus precise.
        </p>
      </div>
      }
    </section>
  `,
})
export class GlobalSearchComponent implements OnInit, OnDestroy {
  searchTerm = '';
  currentQuery = '';
  response: GlobalSearchResponse | null = null;
  isLoading = false;
  errorMessage = '';
  readonly loadingRows = [1, 2, 3];

  private readonly subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private globalSearchService: GlobalSearchService,
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.route.queryParamMap.pipe(
        map((params) => (params.get('q') || params.get('search') || '').trim()),
        distinctUntilChanged(),
        tap((query) => {
          this.searchTerm = query;
          this.currentQuery = query;
          this.errorMessage = '';
          this.response = null;
          this.isLoading = query.length > 0;
        }),
        switchMap((query) => {
          if (!query) {
            return of(this.emptyResponse(''));
          }

          return this.globalSearchService.search(query).pipe(
            catchError(() => {
              this.errorMessage = 'Recherche impossible pour le moment.';
              return of(this.emptyResponse(query));
            }),
          );
        }),
      ).subscribe((response) => {
        this.response = response;
        this.isLoading = false;
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  submitSearch(event: Event): void {
    event.preventDefault();
    const query = this.searchTerm.trim();

    if (!query) {
      void this.router.navigate(['/search']);
      return;
    }

    void this.router.navigate(['/search'], { queryParams: { q: query } });
  }

  trackGroup(_index: number, group: GlobalSearchGroup): string {
    return group.id;
  }

  trackResult(_index: number, result: GlobalSearchResult): string {
    return `${result.moduleLabel}-${result.id}`;
  }

  formatDate(value: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(value);
  }

  private emptyResponse(query: string): GlobalSearchResponse {
    return {
      query,
      groups: [],
      totalResults: 0,
      generatedAt: new Date(),
    };
  }
}
