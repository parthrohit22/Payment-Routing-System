import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { THEME_STORAGE_KEY } from '../constants/app.constants';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  const originalMatchMedia = window.matchMedia;
  const originalLocalStorage = window.localStorage;
  const storage = new Map<string, string>();

  const installMatchMedia = (matches: boolean) => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches,
        media: '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  };

  const installLocalStorage = () => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      writable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
        clear: () => {
          storage.clear();
        },
      },
    });
  };

  beforeEach(() => {
    storage.clear();
    installLocalStorage();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    storage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      writable: true,
      value: originalLocalStorage,
    });
  });

  it('initializes from system preference when no override is stored', () => {
    installMatchMedia(true);

    TestBed.configureTestingModule({
      providers: [ThemeService],
    });

    const service = TestBed.inject(ThemeService);

    expect(service.currentTheme()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('persists a manual override', () => {
    installMatchMedia(false);

    TestBed.configureTestingModule({
      providers: [ThemeService],
    });

    const service = TestBed.inject(ThemeService);
    service.setTheme('dark');

    expect(service.currentTheme()).toBe('dark');
    expect(storage.get(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('prefers the stored theme over system preference', () => {
    installMatchMedia(true);
    storage.set(THEME_STORAGE_KEY, 'light');

    TestBed.configureTestingModule({
      providers: [ThemeService],
    });

    const service = TestBed.inject(ThemeService);

    expect(service.currentTheme()).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
  });
});
