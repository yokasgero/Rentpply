import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import LandingPage from '../components/LandingPage';

type AppRole = 'student' | 'tenant' | 'owner' | 'admin';

function isAppPath() {
  return window.location.pathname.startsWith('/app');
}

export default function App() {
  const [inApp, setInApp] = useState(isAppPath);
  const [startupError, setStartupError] = useState<string | null>(null);

  useEffect(() => {
    const syncRoute = () => setInApp(isAppPath());
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  useEffect(() => {
    if (!inApp) return;

    import('../features/prototype/runtime.js').then((runtime) => {
      runtime.render(true);
    }).catch((error: unknown) => {
      console.error('Rentpply failed to start.', error);
      setStartupError('Rentpply could not start. Refresh the page and try again.');
    });
  }, [inApp]);

  function openApp(role: AppRole) {
    window.localStorage.setItem('rp_role', role);
    window.history.pushState({}, '', '/app');
    setStartupError(null);
    setInApp(true);
  }

  return (
    <>
      <div hidden={inApp}><LandingPage onOpenApp={openApp} /></div>
      <div hidden={!inApp}><AppShell startupError={startupError} /></div>
    </>
  );
}
