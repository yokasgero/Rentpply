type AppShellProps = {
  startupError: string | null;
};

function Logo() {
  return (
    <div className="logo">
      <b aria-hidden="true">
        <svg className="i" viewBox="0 0 24 24">
          <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
        </svg>
      </b>
      <span className="wm">Rentpply</span>
    </div>
  );
}

function RoleSwitcher() {
  return (
    <div className="seg" role="group" aria-label="View as">
      <button data-role="student" aria-pressed="true">Student</button>
      <button data-role="tenant" aria-pressed="false">Tenant</button>
      <button data-role="owner" aria-pressed="false">Owner</button>
      <button data-role="admin" aria-pressed="false">Admin</button>
    </div>
  );
}

export default function AppShell({ startupError }: AppShellProps) {
  return (
    <>
      <header className="top wrap">
        <a className="app-brand-link" href="/" aria-label="Rentpply landing page"><Logo /></a>
        <RoleSwitcher />
        <button className="ibtn" id="theme" aria-label="Switch theme">
          <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        </button>
      </header>
      {startupError && <p className="startup-error" role="alert">{startupError}</p>}
      <main className="wrap" id="main" />
      <div className="dock"><nav id="dock" aria-label="Sections" /></div>
      <div id="layer" />
      <div id="toast-host" aria-live="polite" />
    </>
  );
}
