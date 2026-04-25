import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import { moduleCatalog } from "../moduleCatalog";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink className="brand" to="/" aria-label="返回 AI for Science 首页">
          <span className="brand-mark" aria-hidden="true" />
          <span>AI for Science</span>
        </NavLink>
        <nav className="site-nav" aria-label="主要导航">
          <NavLink to="/" end>
            首页
          </NavLink>
          {moduleCatalog.map((module) => (
            <NavLink key={module.href} to={module.href}>
              {module.navLabel}
            </NavLink>
          ))}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
