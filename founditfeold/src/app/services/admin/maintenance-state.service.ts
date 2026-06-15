import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MaintenanceStateService {
  private readonly messageSubject = new BehaviorSubject<string | null>(null);
  readonly message$ = this.messageSubject.asObservable();

  get currentMessage(): string | null {
    return this.messageSubject.value || sessionStorage.getItem('maintenanceMessage');
  }

  show(message: string): void {
    sessionStorage.setItem('maintenanceMessage', message);
    this.messageSubject.next(message);
  }

  clear(): void {
    sessionStorage.removeItem('maintenanceMessage');
    this.messageSubject.next(null);
  }
}
