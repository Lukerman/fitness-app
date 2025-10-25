
import React, { useState, useMemo } from 'react';
import Dashboard from './components/features/Dashboard';
import AiCoach from './components/features/AiCoach';
import Logger from './components/features/Logger';
import Tools from './components/features/Tools';
import Discover from './components/features/Discover';
import { Home, Bot, PlusSquare, Wrench, Sparkles, type LucideProps } from 'lucide-react';

type NavItem = 'Dashboard' | 'Logger' | 'AI Coach' | 'Tools' | 'Discover';

const App: React.FC = () => {
  const [activeNav, setActiveNav] = useState<NavItem>('Dashboard');

  const navItems: { name: NavItem; icon: React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>> }[] = useMemo(() => [
    { name: 'Dashboard', icon: Home },
    { name: 'Logger', icon: PlusSquare },
    { name: 'AI Coach', icon: Bot },
    { name: 'Tools', icon: Wrench },
    { name: 'Discover', icon: Sparkles },
  ], []);

  const renderContent = () => {
    switch (activeNav) {
      case 'Dashboard':
        return <Dashboard />;
      case 'Logger':
        return <Logger />;
      case 'AI Coach':
        return <AiCoach />;
      case 'Tools':
        return <Tools />;
      case 'Discover':
        return <Discover />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <main className="flex-grow container mx-auto p-4 pb-24">
        {renderContent()}
      </main>
      <footer className="fixed bottom-0 left-0 right-0 bg-surface border-t border-gray-700">
        <nav className="container mx-auto flex justify-around items-center h-16">
          {navItems.map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => setActiveNav(name)}
              className={`flex flex-col items-center justify-center w-full transition-colors duration-200 ${
                activeNav === name ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Icon className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">{name}</span>
            </button>
          ))}
        </nav>
      </footer>
    </div>
  );
};

export default App;
