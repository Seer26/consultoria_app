import { appSections, type AppSection } from '../navigation';

interface SidebarProps {
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
}

export function Sidebar({ activeSection, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <span className="eyebrow">Consultoria SaaS</span>
        <h1>Painel de gestao</h1>
        <p>Base inicial para diagnostico, acompanhamento e planos de acao.</p>
      </div>

      <nav className="sidebar-nav" aria-label="Navegacao principal">
        {appSections.map((item) => (
          <button
            key={item.key}
            type="button"
            className={activeSection === item.key ? 'sidebar-link active' : 'sidebar-link'}
            onClick={() => onNavigate(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
