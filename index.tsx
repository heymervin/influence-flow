import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LayoutDashboard,
  Users,
  FileText,
  PieChart,
  Settings,
  Plus,
  Search,
  Bell,
  Menu,
  Instagram,
  Filter,
  ArrowUpRight,
  ChevronRight,
  MoreVertical,
  LogOut
} from 'lucide-react';

// --- MOCK DATA ---
const MOCK_TALENTS = [
  {
    id: '1',
    name: 'Sarah Jenkins',
    category: 'Lifestyle',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
    instagram: '@sarahj_life',
    followers: '1.2M',
    engagement: '4.5%',
    rates: { post: 2500, story: 800 }
  },
  {
    id: '2',
    name: 'Marcus Chen',
    category: 'Tech & Gaming',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    instagram: '@marcus_tech',
    followers: '850K',
    engagement: '6.2%',
    rates: { post: 3500, story: 1200 }
  },
  {
    id: '3',
    name: 'Elara Vane',
    category: 'Beauty',
    status: 'on-hold',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    instagram: '@elara.beauty',
    followers: '2.1M',
    engagement: '3.8%',
    rates: { post: 5000, story: 2000 }
  },
  {
    id: '4',
    name: 'Fit with Jax',
    category: 'Fitness',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200',
    instagram: '@jax_fitness',
    followers: '500K',
    engagement: '8.1%',
    rates: { post: 1800, story: 600 }
  },
  {
    id: '5',
    name: 'Olivia Stone',
    category: 'Food & Travel',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200',
    instagram: '@olivia_eats',
    followers: '1.8M',
    engagement: '5.2%',
    rates: { post: 2800, story: 900 }
  },
  {
    id: '6',
    name: 'David Kim',
    category: 'Fashion',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
    instagram: '@davidk_style',
    followers: '320K',
    engagement: '9.5%',
    rates: { post: 1500, story: 500 }
  }
];

const MOCK_QUOTES = [
  { id: '101', client: 'Nike NZ', campaign: 'Summer Run', status: 'sent', date: '2025-01-15', total: 12500 },
  { id: '102', client: 'Samsung', campaign: 'Galaxy S25 Launch', status: 'draft', date: '2025-01-18', total: 45000 },
  { id: '103', client: 'HelloFresh', campaign: 'Q1 Activation', status: 'accepted', date: '2025-01-10', total: 8200 },
];

// --- UI COMPONENTS ---

const Badge = ({ children, variant = 'default' }: { children?: React.ReactNode, variant?: 'default' | 'success' | 'warning' | 'neutral' }) => {
  const styles = {
    default: 'bg-blue-100 text-blue-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    neutral: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>
  );
};

const Button = ({ children, variant = 'primary', size = 'md', className = '', icon: Icon, ...props }: any) => {
  const baseStyle = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500",
    secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500",
    ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
    destructive: "bg-red-600 text-white hover:bg-red-700",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {Icon && <Icon className="w-4 h-4 mr-2" />}
      {children}
    </button>
  );
};

// --- PAGES ---

const DashboardHome = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Quotes', value: '12', change: '+2', trend: 'up' },
          { label: 'Pending Revenue', value: '$84.5k', change: '+15%', trend: 'up' },
          { label: 'Talent Roster', value: '48', change: '+3', trend: 'up' },
          { label: 'Win Rate', value: '68%', change: '+2.4%', trend: 'up' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</h3>
              </div>
              <div className={`flex items-center text-xs font-medium ${stat.trend === 'up' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'} px-2 py-1 rounded-full`}>
                {stat.change}
                <ArrowUpRight className="w-3 h-3 ml-1" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Quotes</h3>
            <Button variant="ghost" size="sm">View All</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3">Quote #</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_QUOTES.map((quote) => (
                  <tr key={quote.id} className="border-b hover:bg-gray-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-900">#{quote.id}</td>
                    <td className="px-4 py-3">{quote.client}</td>
                    <td className="px-4 py-3">{quote.campaign}</td>
                    <td className="px-4 py-3">${quote.total.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Badge variant={quote.status === 'accepted' ? 'success' : quote.status === 'sent' ? 'warning' : 'neutral'}>
                        {quote.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{quote.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
          </div>
          <div className="space-y-4">
             {MOCK_TALENTS.slice(0, 4).map((talent, i) => (
               <div key={talent.id} className="flex items-center space-x-3 pb-3 border-b last:border-0 last:pb-0">
                  <div className="relative">
                    <img src={talent.avatar} alt={talent.name} className="w-10 h-10 rounded-full object-cover" />
                    <div className="absolute -bottom-1 -right-1 bg-brand-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full border border-white">
                      {i + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{talent.name}</p>
                    <p className="text-xs text-gray-500 truncate">{talent.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{talent.engagement}</p>
                    <p className="text-xs text-gray-500">Eng.</p>
                  </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const TalentRoster = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Talent Roster</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your influencers and content creators</p>
        </div>
        <Button icon={Plus}>Add New Talent</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search talents by name or category..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
           <Button variant="secondary" icon={Filter} size="md" className="flex-1 sm:flex-none">Filters</Button>
           <div className="hidden sm:block h-full w-px bg-gray-200 mx-2"></div>
           <select className="flex-1 sm:flex-none px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-brand-500">
             <option>Sort by: Name</option>
             <option>Sort by: Followers</option>
             <option>Sort by: Engagement</option>
           </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {MOCK_TALENTS.map((talent) => (
          <div key={talent.id} className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer">
            <div className="relative h-48 bg-gray-100 overflow-hidden">
              <img src={talent.avatar} alt={talent.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute top-3 right-3">
                 <Badge variant={talent.status === 'active' ? 'success' : 'warning'}>{talent.status}</Badge>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                 <p className="text-white text-sm font-medium">View detailed analytics</p>
              </div>
            </div>
            <div className="p-5">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-brand-600 transition-colors">{talent.name}</h3>
                <p className="text-sm text-gray-500">{talent.category}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 py-3 border-y border-gray-100">
                 <div>
                   <p className="text-xs text-gray-500 mb-1">Followers</p>
                   <p className="text-sm font-semibold text-gray-900 flex items-center">
                     <Instagram className="w-3 h-3 mr-1 text-pink-600" />
                     {talent.followers}
                   </p>
                 </div>
                 <div>
                   <p className="text-xs text-gray-500 mb-1">Engagement</p>
                   <p className="text-sm font-semibold text-gray-900">{talent.engagement}</p>
                 </div>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium">Post: <span className="text-gray-900 font-semibold">${talent.rates.post}</span></span>
                <span className="text-brand-600 font-medium text-xs flex items-center group-hover:translate-x-1 transition-transform">
                  View Profile <ChevronRight className="w-3 h-3 ml-1" />
                </span>
              </div>
            </div>
          </div>
        ))}
        
        {/* Add New Placeholer Card */}
        <button className="flex flex-col items-center justify-center h-full min-h-[300px] border-2 border-dashed border-gray-300 rounded-xl hover:border-brand-500 hover:bg-brand-50 transition-all group">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3 group-hover:bg-brand-100 transition-colors">
                <Plus className="w-6 h-6 text-gray-400 group-hover:text-brand-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">Add New Talent</p>
            <p className="text-xs text-gray-500 mt-1">Or import from CSV</p>
        </button>
      </div>
    </div>
  );
};

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

const App = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardHome />;
      case 'talents': return <TalentRoster />;
      case 'quotes': return <div className="p-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">Quote Builder Module Loading...</div>;
      case 'metrics': return <div className="p-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">Metrics & Analytics Module Loading...</div>;
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
             <span className="text-white font-bold text-lg">U</span>
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight">Undertow</span>
        </div>

        <div className="p-4 space-y-1">
          <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Platform</div>
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={currentView === 'dashboard'} onClick={() => { setCurrentView('dashboard'); setSidebarOpen(false); }} />
          <SidebarItem icon={Users} label="Talent Roster" active={currentView === 'talents'} onClick={() => { setCurrentView('talents'); setSidebarOpen(false); }} />
          <SidebarItem icon={FileText} label="Quotes & Proposals" active={currentView === 'quotes'} onClick={() => { setCurrentView('quotes'); setSidebarOpen(false); }} />
          <SidebarItem icon={PieChart} label="Analytics" active={currentView === 'metrics'} onClick={() => { setCurrentView('metrics'); setSidebarOpen(false); }} />
        </div>

        <div className="p-4 space-y-1 mt-auto border-t border-gray-100 absolute bottom-0 w-full bg-white">
          <SidebarItem icon={Settings} label="Settings" active={currentView === 'settings'} onClick={() => { setCurrentView('settings'); setSidebarOpen(false); }} />
          <div className="px-3 py-3 mt-2 flex items-center space-x-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-medium text-brand-700">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">Jane Doe</p>
              <p className="text-[10px] text-gray-500 truncate">Manager</p>
            </div>
            <LogOut className="w-4 h-4 text-gray-400 hover:text-red-500" />
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
            <Button size="sm" icon={Plus} className="shadow-lg shadow-brand-500/20">New Quote</Button>
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

const root = createRoot(document.getElementById('root')!);
root.render(<App />);

export default App;