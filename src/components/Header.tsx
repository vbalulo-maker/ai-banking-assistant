interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function Header({ sidebarOpen, onToggleSidebar }: HeaderProps) {
  return (
    <header className="header">
      <div className="header__left">
        <button
          type="button"
          className="header__sidebar-toggle"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          ☰
        </button>
        <div className="header__brand">
          <h1 className="header__title">ИИ-ассистент</h1>
          <span className="header__subtitle">
            Daily Banking
          </span>
        </div>
      </div>

      <div className="header__right">
        <span className="header__label">Concept prototype</span>
        <div className="header__customer">
          <span className="header__dot" />
          <span>Customer</span>
        </div>
      </div>
    </header>
  );
}