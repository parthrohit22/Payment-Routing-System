import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SessionStorageService {
  private readonly isAvailable =
    typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

  get<T>(key: string): T | null {
    if (!this.isAvailable) {
      return null;
    }

    const rawValue = window.sessionStorage.getItem(key);
    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue) as T;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    if (!this.isAvailable) {
      return;
    }

    window.sessionStorage.setItem(key, JSON.stringify(value));
  }

  remove(key: string): void {
    if (!this.isAvailable) {
      return;
    }

    window.sessionStorage.removeItem(key);
  }
}
