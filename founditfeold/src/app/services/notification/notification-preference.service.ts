import { Injectable } from '@angular/core';

export type NotificationScope = 'client' | 'freelancer';
export type NotificationPreferenceKey =
  | 'messages'
  | 'orderUpdates'
  | 'newJobOffers'
  | 'reviewsAndRatings';

export interface NotificationPreference {
  key: NotificationPreferenceKey;
  title: string;
  description: string;
  enabled: boolean;
}

const FREELANCER_DEFAULTS: NotificationPreference[] = [
  {
    key: 'messages',
    title: 'Messages',
    description: 'Get notified when you receive new messages',
    enabled: true,
  },
  {
    key: 'orderUpdates',
    title: 'Order Updates',
    description: 'Receive notifications about order status changes',
    enabled: true,
  },
  {
    key: 'newJobOffers',
    title: 'New Job Offers',
    description: 'Get alerted when clients send you job offers',
    enabled: true,
  },
  {
    key: 'reviewsAndRatings',
    title: 'Reviews & Ratings',
    description: 'Notification when you receive a new review',
    enabled: true,
  },
];

@Injectable({
  providedIn: 'root',
})
export class NotificationPreferenceService {
  getPreferences(scope: NotificationScope): NotificationPreference[] {
    const stored = this.readStoredPreferences(scope);

    return this.getDefaults(scope).map((item) => ({
      ...item,
      enabled: stored[item.key] ?? item.enabled,
    }));
  }

  isEnabled(scope: NotificationScope, key: NotificationPreferenceKey): boolean {
    return this.getPreferences(scope).find((item) => item.key === key)?.enabled ?? true;
  }

  setPreference(scope: NotificationScope, key: NotificationPreferenceKey, enabled: boolean): void {
    const stored = this.readStoredPreferences(scope);
    stored[key] = enabled;
    localStorage.setItem(this.storageKey(scope), JSON.stringify(stored));
  }

  setPreferences(scope: NotificationScope, preferences: NotificationPreference[]): void {
    const stored = preferences.reduce(
      (result, item) => ({
        ...result,
        [item.key]: item.enabled,
      }),
      {} as Partial<Record<NotificationPreferenceKey, boolean>>,
    );

    localStorage.setItem(this.storageKey(scope), JSON.stringify(stored));
  }

  private getDefaults(scope: NotificationScope): NotificationPreference[] {
    return scope === 'freelancer' ? FREELANCER_DEFAULTS : FREELANCER_DEFAULTS;
  }

  private readStoredPreferences(
    scope: NotificationScope,
  ): Partial<Record<NotificationPreferenceKey, boolean>> {
    try {
      const parsed = JSON.parse(localStorage.getItem(this.storageKey(scope)) ?? '{}') as unknown;
      return parsed && typeof parsed === 'object'
        ? (parsed as Partial<Record<NotificationPreferenceKey, boolean>>)
        : {};
    } catch {
      return {};
    }
  }

  private storageKey(scope: NotificationScope): string {
    return `foundit:${scope}:notification:preferences`;
  }
}
