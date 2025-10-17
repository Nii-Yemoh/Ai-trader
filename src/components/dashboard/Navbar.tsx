import { useAuth } from '../../contexts/AuthContext';
import { Bot, LogOut } from 'lucide-react';

export default function Navbar({ currentPage, onNavigate }: { currentPage: string; onNavigate: (page: string) => void }) {
  const { signOut } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'wallets', label: 'Wallets' },
    { id: 'api', label: 'API' },
    { id: 'strategies', label: 'Strategies' },
    { id: 'history', label: 'History' },
  ];

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-2 rounded-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <span className="ml-3 text-xl font-bold text-gray-900">AI TradePro</span>
          </div>
          <div className="flex items-center space-x-1">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => onNavigate(item.id)} className={`px-4 py-2 rounded-lg font-medium ${currentPage === item.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>{item.label}</button>
            ))}
            <button onClick={signOut} className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg ml-4"><LogOut className="w-4 h-4" /><span>Sign Out</span></button>
          </div>
        </div>
      </div>
    </nav>
  );
}
