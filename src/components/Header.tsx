export default function Header() {
  return (
    <header className="header">
      <div className="header__brand">
        <h1 className="header__title">AI Assistant</h1>
        <span className="header__subtitle">
          A new interaction layer for digital banking
        </span>
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