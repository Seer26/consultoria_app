import type { PropsWithChildren } from 'react';

import type { AppSection } from '../navigation';
import { Sidebar } from './Sidebar';

interface AppLayoutProps extends PropsWithChildren {
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
}

export function AppLayout({ activeSection, onNavigate, children }: AppLayoutProps) {
  return (
    <div className="saas-shell">
      <Sidebar activeSection={activeSection} onNavigate={onNavigate} />
      <main className="workspace">{children}</main>
    </div>
  );
}
