
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DropdownComponent } from '../../ui/dropdown/dropdown.component';

export interface Option {
  value: any;
  label: string;
  disabled?: boolean;
  dividerBefore?: boolean;
}

@Component({
  selector: 'app-select',
  imports: [CommonModule, DropdownComponent],
  templateUrl: './select.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    },
  ],
})
export class SelectComponent implements ControlValueAccessor {
  @Input() options: Option[] = [];
  @Input() placeholder = 'Selectionner une option';
  @Input() className = '';
  @Input() dropdownClassName = '';
  @Input() defaultValue: any = '';
  @Input() multiple = false;
  @Input() closeOnSelect = true;

  @Output() valueChange = new EventEmitter<any>();

  isOpen = false;

  private inputValue: any = '';
  private internalValue: any = '';
  private isDisabled = false;
  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  @Input()
  set value(newValue: any) {
    this.inputValue = newValue;
    this.writeValue(newValue);
  }

  get value(): any {
    return this.internalValue;
  }

  get hasSelection(): boolean {
    if (this.multiple) {
      return this.selectedMultiValues.length > 0;
    }

    return this.internalValue !== null && this.internalValue !== undefined && this.internalValue !== '';
  }

  get displayLabel(): string {
    if (this.multiple) {
      const selectedOptions = this.options.filter((option) => this.isSelected(option));
      if (selectedOptions.length === 0) {
        return this.placeholder;
      }

      if (selectedOptions.length <= 2) {
        return selectedOptions.map((option) => option.label).join(', ');
      }

      return `${selectedOptions.length} selectionnes`;
    }

    const selectedOption = this.options.find((option) => this.isSelected(option));
    return selectedOption?.label ?? this.placeholder;
  }

  ngOnChanges(): void {
    if (!this.hasSelection && this.defaultValue !== '' && this.defaultValue !== undefined && this.defaultValue !== null) {
      this.writeValue(this.defaultValue);
    }
  }

  writeValue(value: any): void {
    if (this.multiple) {
      this.internalValue = this.normalizeMultiValue(value);
      return;
    }

    this.internalValue = value;
  }

  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  toggleDropdown(): void {
    if (this.isDisabled) {
      return;
    }

    this.isOpen = !this.isOpen;
    if (!this.isOpen) {
      this.onTouched();
    }
  }

  closeDropdown(): void {
    this.isOpen = false;
    this.onTouched();
  }

  selectOption(option: Option): void {
    if (this.isDisabled || option.disabled) {
      return;
    }

    if (this.multiple) {
      const nextValues = [...this.selectedMultiValues];
      const existingIndex = nextValues.findIndex((item) => this.areEqual(item, option.value));

      if (existingIndex >= 0) {
        nextValues.splice(existingIndex, 1);
      } else {
        nextValues.push(option.value);
      }

      this.commitValue(nextValues);
      return;
    }

    this.commitValue(option.value);
    if (this.closeOnSelect) {
      this.closeDropdown();
    }
  }

  isSelected(option: Option): boolean {
    if (this.multiple) {
      return this.selectedMultiValues.some((item) => this.areEqual(item, option.value));
    }

    return this.areEqual(this.internalValue, option.value);
  }

  trackByOption(index: number, option: Option): string {
    return `${index}-${String(option.value)}`;
  }

  get isComponentDisabled(): boolean {
    return this.isDisabled;
  }

  get selectedMultiValues(): any[] {
    return Array.isArray(this.internalValue) ? this.internalValue : [];
  }

  private commitValue(value: any): void {
    this.writeValue(value);
    this.valueChange.emit(this.internalValue);
    this.onChange(this.internalValue);
    this.onTouched();
  }

  private normalizeMultiValue(value: any): any[] {
    if (Array.isArray(value)) {
      return value;
    }

    if (value === null || value === undefined || value === '') {
      return [];
    }

    return [value];
  }

  private areEqual(left: any, right: any): boolean {
    return left === right;
  }
}
