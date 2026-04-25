import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import { THEME_STORAGE_KEY } from '../constants/app.constants';

export type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storage = this.resolveStorage();
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

    if (!this.storage) {
      return;
    }

    if (persist) {
      this.storage.setItem(THEME_STORAGE_KEY, theme);
    } else {
      this.storage.removeItem(THEME_STORAGE_KEY);
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
    if (!this.storage) {
      return null;
    }

    const storedTheme = this.storage.getItem(THEME_STORAGE_KEY);
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

  private resolveStorage(): Storage | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const storage = window.localStorage;
    if (
      typeof storage?.getItem !== 'function' ||
      typeof storage?.setItem !== 'function' ||
      typeof storage?.removeItem !== 'function'
    ) {
      return null;
    }

    return storage;
  }
}
