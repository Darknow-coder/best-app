import { NavLink, Outlet, Link } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { Logo } from '@/ui/Mascot';
import { IconBook, IconFlask, IconPlus, IconSettings, IconToday } from '@/ui/Icons';
import { UpdatePrompt } from './UpdatePrompt';

export function Layout() {
  const { t } = useI18n();
  const links = [
    { to: '/', label: t('nav.today'), icon: <IconToday />, end: true },
    { to: '/experiments', label: t('nav.experiments'), icon: <IconFlask /> },
    { to: '/notebook', label: t('nav.notebook'), icon: <IconBook /> },
    { to: '/settings', label: t('nav.settings'), icon: <IconSettings /> },
  ];
  return (
    <div className="shell">
      <aside className="sidenav" aria-label="Navigation">
        <Link to="/" className="brand">
          <Logo />
          <span>{t('app.name')}</span>
        </Link>
        {links.slice(0, 3).map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            {l.icon}
            {l.label}
          </NavLink>
        ))}
        <Link to="/library" className="btn btn-primary side-new">
          <IconPlus /> {t('nav.new')}
        </Link>
        {links.slice(3).map((l) => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            {l.icon}
            {l.label}
          </NavLink>
        ))}
        <NavLink to="/method" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
          <IconBook style={{ opacity: 0.7 }} />
          {t('nav.method')}
        </NavLink>
        <p className="side-foot">{t('app.tagline')}</p>
      </aside>

      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">
            <Logo />
            <span>{t('app.name')}</span>
          </Link>
        </div>
      </header>

      <main className="shell-main">
        <UpdatePrompt />
        <Outlet />
      </main>

      <nav className="tabbar" aria-label="Navigation">
        <div className="tabbar-inner">
          {links.slice(0, 2).map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
              {l.icon}
              <span>{l.label}</span>
            </NavLink>
          ))}
          <Link to="/library" className="tab-new" aria-label={t('nav.new')}>
            <span className="fab">
              <IconPlus />
            </span>
          </Link>
          {links.slice(2).map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
              {l.icon}
              <span>{l.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
