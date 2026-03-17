import { useState } from 'react';
import {
  FileText,
  Menu,
  LogOut,
  Moon,
  Sun,
  Bell,
  Settings,
  ChevronDown,
  User,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth, useTheme } from '@/contexts';

const NavBar = () => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <nav
      className={`w-full ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b backdrop-blur-sm bg-opacity-90 z-50`}
    >
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img
            alt="logo"
            src={isDarkMode ? '/invoice-icon-dark.svg' : '/invoice-icon.svg'}
            className="w-8 h-8 mx-1"
          />
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleTheme(!isDarkMode)}
            className="rounded-full w-9 h-9 p-0 cursor-pointer"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="rounded-full w-9 h-9 p-0 cursor-pointer"
          >
            <Bell className="w-4 h-4" />
          </Button>

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              } cursor-pointer`}
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src="/api/placeholder/32/32" />
                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                  {user.full_name[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden sm:block">
                <div
                  className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                >
                  {user.full_name}
                </div>
                <div
                  className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  {user.role}
                </div>
              </div>
              <ChevronDown className="w-4 h-4" />
            </button>

            {userMenuOpen && (
              <div
                className={`absolute right-0 mt-2 w-48 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl shadow-xl py-2 z-50`}
              >
                <button
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm">Profil</span>
                </button>
                <button
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-sm">Paramètres</span>
                </button>
                <Separator className="my-2" />
                <button
                  className={`w-full ${isDarkMode ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-50 text-red-600'} cursor-pointer`}
                  onClick={logout}
                >
                  <span className="text-sm">Se déconnecter</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
