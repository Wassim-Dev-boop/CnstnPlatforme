import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dropdown-item-two',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (dividerBefore) {
      <div class="my-1 border-t border-gray-200 dark:border-gray-700"></div>
    }
    <a
      [routerLink]="to"
      [ngClass]="combinedClasses"
      (click)="handleClick($event)"
    >
      <ng-content></ng-content>
    </a>
  `,
})
export class DropdownItemTwoComponent {
  @Input() to!: string; // Required route path
  @Input() baseClassName = 'flex w-full items-center rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors duration-150';
  @Input() className = '';
  @Input() highlighted = false;
  @Input() dividerBefore = false;
  @Output() itemClick = new EventEmitter<void>();
  @Output() click = new EventEmitter<void>();

  get combinedClasses(): string {
    const toneClasses = this.highlighted
      ? 'bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white'
      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white';

    return `${this.baseClassName} ${toneClasses} ${this.className}`.trim();
  }

  handleClick(event: Event) {
    this.click.emit();
    this.itemClick.emit();
  }
}
