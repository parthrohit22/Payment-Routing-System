import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { THEME_STORAGE_KEY } from '../constants/app.constants';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  const originalMatchMedia = window.matchMedia;

  const installMatchMedia = (matches: boolean) => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches,
        media: '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
    });
  };

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia
    });
  });

  it('initializes from system preference when no override is stored', () => {
    installMatchMedia(true);

    TestBed.configureTestingModule({
      providers: [ThemeService]
    });

    const service = TestBed.inject(ThemeService);

    expect(service.currentTheme()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('persists a manual override', () => {
    installMatchMedia(false);

    TestBed.configureTestingModule({
      providers: [ThemeService]
    });

    const service = TestBed.inject(ThemeService);
    service.setTheme('dark');

    expect(service.currentTheme()).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('prefers the stored theme over system preference', () => {
    installMatchMedia(true);
    localStorage.setItem(THEME_STORAGE_KEY, 'light');

    TestBed.configureTestingModule({
      providers: [ThemeService]
    });

    const service = TestBed.inject(ThemeService);

    expect(service.currentTheme()).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
  });
});
