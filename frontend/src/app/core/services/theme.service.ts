import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import { THEME_STORAGE_KEY } from '../constants/app.constants';

export type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storageAvailable =
    typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  private readonly mediaQuery =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;

  private readonly currentThemeSignal = signal<ThemeMode>(this.resolveInitialTheme());
  readonly currentTheme = this.currentThemeSignal.asReadonly();
  readonly isDark = computed(() => this.currentThemeSignal() === 'dark');

  constructor() {
    this.applyTheme(this.currentThemeSignal());

    this.mediaQuery?.addEventListener?.('change', (event) => {
      if (this.getStoredTheme()) {
        return;
      }

      this.setTheme(event.matches ? 'dark' : 'light', false);
    });
  }

  toggleTheme(): void {
    this.setTheme(this.isDark() ? 'light' : 'dark');
  }

  setTheme(theme: ThemeMode, persist = true): void {
    this.currentThemeSignal.set(theme);
    this.applyTheme(theme);

    if (!this.storageAvailable) {
      return;
    }

    if (persist) {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } else {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    }
  }

  private resolveInitialTheme(): ThemeMode {
    const storedTheme = this.getStoredTheme();
    if (storedTheme) {
      return storedTheme;
    }

    return this.mediaQuery?.matches ? 'dark' : 'light';
  }

  private getStoredTheme(): ThemeMode | null {
    if (!this.storageAvailable) {
      return null;
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }

    return null;
  }

  private applyTheme(theme: ThemeMode): void {
    const root = this.document.documentElement;
    root.dataset['theme'] = theme;
    root.style.colorScheme = theme;
  }
}
