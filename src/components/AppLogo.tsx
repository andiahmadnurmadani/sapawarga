/**
 * AppLogo — Komponen logo terpusat.
 * Menggunakan logoUrl dari AppConfigContext jika tersedia,
 * fallback ke URL default jika belum diset.
 */

import { useContext } from 'react';
import { AppConfigContext } from '../lib/AppConfigContext';
import { getCdnUrl } from '../lib/cdnUtils';

const DEFAULT_LOGO = 'https://i.ibb.co.com/d0VbR5zQ/logo-sapa-warga-removebg-preview.png';

interface AppLogoProps {
  className?: string;
  alt?: string;
}

export default function AppLogo({ className = 'w-full h-full object-contain', alt = 'Hallo Warga Logo' }: AppLogoProps) {
  const config = useContext(AppConfigContext);
  const src = config?.logoUrl ? getCdnUrl(config.logoUrl) : DEFAULT_LOGO;
  return <img src={src} alt={alt} className={className} />;
}
