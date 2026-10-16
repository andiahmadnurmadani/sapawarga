import { useEffect } from 'react';
import { getCdnUrl } from './cdnUtils';

/**
 * Hook untuk mengganti favicon halaman secara dinamis berdasarkan logoUrl RT.
 * - Menerima fileId CDN, URL, atau base64 — semuanya akan di-resolve via getCdnUrl.
 * - Default fallback: favicon SVG bawaan (huruf H di kotak indigo).
 * - Sekaligus update document.title dengan nama RT kalau diberikan.
 */
const DEFAULT_FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%23312e81'/%3E%3Ctext x='50' y='68' font-size='60' text-anchor='middle' fill='white' font-family='Arial' font-weight='bold'%3EH%3C/text%3E%3C/svg%3E";

function setFavicon(href: string) {
  // Hapus semua link rel icon yang ada
  document
    .querySelectorAll("link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']")
    .forEach((el) => el.parentNode?.removeChild(el));

  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = href;
  document.head.appendChild(link);

  // Apple touch icon (untuk iOS bookmark / homescreen)
  const apple = document.createElement('link');
  apple.rel = 'apple-touch-icon';
  apple.href = href;
  document.head.appendChild(apple);
}

export function useDynamicFavicon(logoUrl?: string | null, title?: string | null) {
  useEffect(() => {
    const resolved = logoUrl ? getCdnUrl(logoUrl) || logoUrl : '';
    setFavicon(resolved && resolved.length > 0 ? resolved : DEFAULT_FAVICON);
  }, [logoUrl]);

  useEffect(() => {
    if (title && title.trim()) {
      document.title = title;
    }
  }, [title]);
}
