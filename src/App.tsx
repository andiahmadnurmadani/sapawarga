/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { User, AppConfig } from './types';
import { storage } from './utils';
import { authService } from './lib/authService';
import { configService } from './lib/configService';
import { AppConfigContext } from './lib/AppConfigContext';
import { API_URL, checkApiHealth } from './lib/api';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import WargaDashboard from './pages/WargaDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AppLogo from './components/AppLogo';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';
import { ThemeProvider } from './lib/ThemeContext';
import { useDynamicFavicon } from './lib/useDynamicFavicon';
import ApiOfflineScreen from './components/ApiOfflineScreen';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'LANDING' | 'LOGIN' | 'REGISTER' | 'DASHBOARD' | 'FORGOT_PASSWORD'>('LANDING');
  const [isLoading, setIsLoading] = useState(true);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [apiOffline, setApiOffline] = useState(false);

  // Update favicon & title sesuai logo & nama RT yang sudah di-set admin
  useDynamicFavicon(
    appConfig?.logoUrl || null,
    appConfig?.villageName ? `Hallo Warga · ${appConfig.villageName}` : null
  );

  // Init: cek health backend, lalu load config + restore session
  const init = useCallback(async () => {
    setIsLoading(true);
    setApiOffline(false);

    // 1) Cek konektivitas backend
    const healthy = await checkApiHealth();
    if (!healthy) {
      setApiOffline(true);
      setIsLoading(false);
      return;
    }

    // 2) Load config (non-blocking)
    configService.getConfig().then(cfg => { if (cfg) setAppConfig(cfg); }).catch(() => {});

    // 3) Restore session dari token
    const token = authService.getToken();
    if (token) {
      try {
        const savedUser = await authService.getMe();
        if (savedUser) {
          setUser(savedUser);
          setView('DASHBOARD');
        } else {
          authService.logout();
          setView('LOGIN');
        }
      } catch {
        authService.logout();
        setView('LOGIN');
      }
    }

    setIsLoading(false);
  }, []);

  useEffect(() => { init(); }, [init]);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    setView('DASHBOARD');
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setView('LANDING');
  };

  if (isLoading) {
    return (
      <ThemeProvider>
        <AppConfigContext.Provider value={appConfig}>
          <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-950 font-sans">
            <div className="flex flex-col items-center gap-8">
              <div className="flex items-center gap-3 animate-pulse">
                <div className="relative w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/30 overflow-hidden">
                  <AppLogo className="w-full h-full object-contain p-1" />
                </div>
                <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Hallo <span className="text-indigo-900 font-black">Warga</span></span>
              </div>
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-900 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-3 h-3 rounded-full bg-indigo-900 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-3 h-3 rounded-full bg-indigo-900 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        </AppConfigContext.Provider>
      </ThemeProvider>
    );
  }

  if (apiOffline) {
    return (
      <ThemeProvider>
        <ApiOfflineScreen apiUrl={API_URL} onRetry={init} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <AppConfigContext.Provider value={appConfig}>
        <ToastProvider>
          <ConfirmProvider>
            <div className="min-h-screen bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-white selection:bg-indigo-100 selection:text-indigo-900 transition-colors duration-300">
              {view === 'LANDING' && (
                <LandingPage
                  onLogin={() => setView('LOGIN')}
                  onRegister={() => setView('REGISTER')}
                />
              )}
              {view === 'LOGIN' && (
                <LoginPage
                  onBack={() => setView('LANDING')}
                  onSuccess={handleLogin}
                  onGoToRegister={() => setView('REGISTER')}
                  onForgotPassword={() => setView('FORGOT_PASSWORD')}
                />
              )}
              {view === 'REGISTER' && (
                <RegisterPage
                  onBack={() => setView('LANDING')}
                  onSuccess={handleLogin}
                  onGoToLogin={() => setView('LOGIN')}
                />
              )}
              {view === 'FORGOT_PASSWORD' && (
                <ForgotPasswordPage
                  onBack={() => setView('LOGIN')}
                  onGoToLogin={() => setView('LOGIN')}
                />
              )}
              {view === 'DASHBOARD' && user && (
                user.role === 'ADMIN' ? (
                  <AdminDashboard
                    user={user}
                    onLogout={handleLogout}
                    onUpdateUser={(updatedUser) => { setUser(updatedUser); }}
                    onConfigChange={setAppConfig}
                  />
                ) : (
                  <WargaDashboard
                    user={user}
                    onLogout={handleLogout}
                    onUpdateUser={(updatedUser) => { setUser(updatedUser); }}
                  />
                )
              )}
            </div>
          </ConfirmProvider>
        </ToastProvider>
      </AppConfigContext.Provider>
    </ThemeProvider>
  );
}
