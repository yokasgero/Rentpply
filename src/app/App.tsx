import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';

export default function App() {
  const [startupError, setStartupError] = useState<string | null>(null);

  useEffect(() => {
    // Keeps the existing full prototype workflows running while the screen-by-screen
    // component migration is staged. Its rendered content mounts inside AppShell.
    import('../features/prototype/runtime.js').catch((error: unknown) => {
      console.error('Rentpply failed to start.', error);
      setStartupError('Rentpply could not start. Refresh the page and try again.');
    });
  }, []);

  return <AppShell startupError={startupError} />;
}
