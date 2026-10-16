/**
 * AppConfigContext — Context global untuk AppConfig.
 * Di-provide di App.tsx, dikonsumsi oleh semua halaman via useContext.
 */

import { createContext } from 'react';
import { AppConfig } from '../types';

export const AppConfigContext = createContext<AppConfig | null>(null);
