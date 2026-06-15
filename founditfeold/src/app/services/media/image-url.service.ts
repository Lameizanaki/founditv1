import { Injectable } from '@angular/core';
import { env } from '../../../environments/env';

@Injectable({ providedIn: 'root' })
export class ImageUrlService {
  resolve(value?: string | null): string {
    const image = value?.trim() ?? '';
    if (!image) return '';
    if (image.startsWith('data:') || image.startsWith('http://') || image.startsWith('https://')) {
      return image;
    }
    if (image.startsWith('/')) {
      return `${env.apiUrl}${image}`;
    }
    if (this.looksLikeBase64Image(image)) {
      return `data:image/jpeg;base64,${image.replace(/\s/g, '')}`;
    }
    return image;
  }

  fromDataOrUrl(data?: string | null, contentType?: string | null, url?: string | null): string {
    const resolvedUrl = this.resolve(url);
    if (resolvedUrl) return resolvedUrl;

    const imageData = data?.trim() ?? '';
    if (!imageData) return '';
    if (imageData.startsWith('/') || imageData.startsWith('http') || imageData.startsWith('data:')) {
      return this.resolve(imageData);
    }
    return `data:${contentType || 'image/jpeg'};base64,${imageData}`;
  }

  private looksLikeBase64Image(value: string): boolean {
    const compact = value.replace(/\s/g, '');
    if (compact.length < 128) return false;

    const hasImageSignature =
      compact.startsWith('/9j/') ||
      compact.startsWith('iVBOR') ||
      compact.startsWith('R0lGOD') ||
      compact.startsWith('UklGR');

    return hasImageSignature && /^[A-Za-z0-9+/]+={0,2}$/.test(compact);
  }
}
