import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LayoutDashboard,
  Users,
  FileText,
  PieChart,
  Settings as SettingsIcon,
  Plus,
  Search,
  Bell,
  Menu,
  LogOut,
  Building2
} from 'lucide-react';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './Login';
import DashboardHome from './DashboardHome';
import TalentRoster from './TalentRoster';
import Quotes from './Quotes';
import Analytics from './Analytics';
import Clients from './Clients';
import Settings from './Settings';
import Button from './Button';
import QuoteBuilder from './QuoteBuilder';

// --- APP LAYOUT ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      active
        ? 'bg-brand-50 text-brand-700'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`}
  >
    <Icon className={`w-5 h-5 ${active ? 'text-brand-600' : 'text-gray-400'}`} />
    <span>{label}</span>
  </button>
);

const AppContent = () => {
  const { user, profile, signOut } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [previousView, setPreviousView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigateToQuoteBuilder = () => {
    setPreviousView(currentView);
    setCurrentView('quote-builder');
  };

  const navigateBack = () => {
    setCurrentView(previousView);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardHome />;
      case 'talents': return <TalentRoster />;
      case 'quotes': return <Quotes onCreateQuote={navigateToQuoteBuilder} />;
      case 'clients': return <Clients />;
      case 'metrics': return <Analytics />;
      case 'settings': return <Settings />;
      case 'quote-builder': return (
        <QuoteBuilder
          onBack={navigateBack}
          onSuccess={() => {
            setCurrentView('quotes');
          }}
        />
      );
      default: return <DashboardHome />;
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900 font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
          <div className="fixed inset-0 bg-gray-800/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 shadow-xl lg:shadow-none`}>
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center mr-3 shadow-sm">
             <span className="text-white font-bold text-lg">IF</span>
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight">Influence Flow</span>
        </div>

        <div className="p-4 space-y-1">
          <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Platform</div>
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={currentView === 'dashboard'} onClick={() => { setCurrentView('dashboard'); setSidebarOpen(false); }} />
          <SidebarItem icon={Users} label="Talent Roster" active={currentView === 'talents'} onClick={() => { setCurrentView('talents'); setSidebarOpen(false); }} />
          <SidebarItem icon={Building2} label="Clients" active={currentView === 'clients'} onClick={() => { setCurrentView('clients'); setSidebarOpen(false); }} />
          <SidebarItem icon={FileText} label="Quotes & Proposals" active={currentView === 'quotes'} onClick={() => { setCurrentView('quotes'); setSidebarOpen(false); }} />
          <SidebarItem icon={PieChart} label="Analytics" active={currentView === 'metrics'} onClick={() => { setCurrentView('metrics'); setSidebarOpen(false); }} />
        </div>

        <div className="p-4 space-y-1 mt-auto border-t border-gray-100 absolute bottom-0 w-full bg-white">
          <SidebarItem icon={SettingsIcon} label="Settings" active={currentView === 'settings'} onClick={() => { setCurrentView('settings'); setSidebarOpen(false); }} />
          <div className="px-3 py-3 mt-2 flex items-center space-x-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-medium text-brand-700">
              {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{profile?.full_name || user?.email}</p>
              <p className="text-[10px] text-gray-500 truncate">{profile?.role || 'Manager'}</p>
            </div>
            <button onClick={() => signOut()} className="hover:text-red-500 transition-colors">
              <LogOut className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-y-auto h-screen flex flex-col">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center">
            <button className="lg:hidden p-2 text-gray-400 hover:text-gray-900 rounded-md" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden md:flex relative ml-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Global search (cmd+k)"
                className="pl-10 pr-4 py-1.5 text-sm bg-gray-100 border-none rounded-md focus:ring-2 focus:ring-brand-500 focus:bg-white w-64 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-400 hover:text-brand-600 transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <Button size="sm" icon={Plus} className="shadow-lg shadow-brand-500/20" onClick={navigateToQuoteBuilder}>New Quote</Button>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

const App = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <AppContent /> : <Login />;
};

const RootApp = () => (
  <AuthProvider>
    <App />
  </AuthProvider>
);

const root = createRoot(document.getElementById('root')!);
root.render(<RootApp />);

export default RootApp;