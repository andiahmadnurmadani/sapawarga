/**
 * Image Utilities — Kompresi, validasi, dan konversi gambar
 * Mendukung setting max upload size dari AppConfig
 */

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const validateImageSize = (file: File, maxSizeMB: number = 5): boolean => {
  return file.size / (1024 * 1024) <= maxSizeMB;
};

/**
 * Kompres gambar ke max dimensi dan kualitas tertentu.
 * Mengembalikan base64 string yang sudah dikompres.
 * @param file        File gambar asli
 * @param maxSizeMB   Batas ukuran akhir (MB) — default 5
 * @param maxWidth    Lebar maks px — default 1200
 * @param quality     Kualitas JPEG 0-1 — default 0.8
 */
export const compressImage = (
  file: File,
  maxSizeMB = 5,
  maxWidth = 1200,
  quality = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Ukuran awal sudah OK, tidak perlu compress
    if (file.size / (1024 * 1024) <= maxSizeMB * 0.5) {
      fileToBase64(file).then(resolve).catch(reject);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Scale down jika lebih lebar dari maxWidth
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);

        // Coba compress bertahap jika masih terlalu besar
        let q = quality;
        let result = canvas.toDataURL('image/jpeg', q);
        while (result.length / 1024 / 1024 > maxSizeMB && q > 0.2) {
          q -= 0.1;
          result = canvas.toDataURL('image/jpeg', q);
        }

        resolve(result);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

import { uploadToCdn } from './cdnUtils';

/**
 * Helper utama — upload langsung ke CDN (Kroombox).
 * Validasi ukuran awal sebelum upload (berdasarkan maxSizeMB dari AppConfig).
 */
export const processFileUpload = async (
  file: File,
  maxSizeMB = 10
): Promise<string> => {
  // Cek tipe file (izinkan gambar dan pdf)
  if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
    throw new Error('File harus berupa gambar (JPG, PNG, WebP) atau PDF');
  }

  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > maxSizeMB) {
    throw new Error(`Ukuran file terlalu besar (${fileSizeMB.toFixed(1)}MB). Maksimal ${maxSizeMB}MB`);
  }

  // Upload ke CDN
  const cdnUrl = await uploadToCdn(file);
  return cdnUrl;
};

// Alias for backward compatibility while we refactor
export const processImageUpload = processFileUpload;
