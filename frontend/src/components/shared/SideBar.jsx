import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { sidebarItems } from '@/constants';
import { useTheme } from '@/contexts';

import {
  FileText,
  LogOut,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import Cookies from 'js-cookie';

const SIDEBAR_STATE_COOKIE = 'sidebar_collapsed';

const Sidebar = () => {
  const { isDarkMode } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [invoicesExpanded, setInvoicesExpanded] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const sidebarState = Cookies.get(SIDEBAR_STATE_COOKIE);
    setIsCollapsed(sidebarState === 'collapsed');
  }, []);

  const handleTabChange = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    Cookies.set(SIDEBAR_STATE_COOKIE, newState ? 'collapsed' : 'expanded', {
      expires: 7,
    });
  };

  const handleItemClick = (item) => {
    if (item.hasChildren) {
      setInvoicesExpanded(!invoicesExpanded);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const isPathActive = (path) => {
    return location.pathname === path;
  };

  const renderSidebarItem = (item) => {
    const Icon = item.icon;
    const isActive = isPathActive(item.path);

    return (
      <div key={item.id} className="mb-1">
        <button
          onClick={() => handleItemClick(item)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
            isActive
              ? 'bg-blue-600 text-white shadow-lg'
              : `${isDarkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`
          }`}
          title={isCollapsed ? item.label : ''}
        >
          <Icon className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && (
            <>
              <span className="font-medium flex-1 text-left">{item.label}</span>
              {item.hasChildren && (
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    invoicesExpanded ? 'transform rotate-180' : ''
                  }`}
                />
              )}
            </>
          )}
        </button>

        {item.children && !isCollapsed && invoicesExpanded && (
          <div className="ml-4 mt-2 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
            {item.children.map((child) => {
              const ChildIcon = child.icon;
              const isChildActive = isPathActive(child.path);

              return (
                <button
                  key={child.id}
                  onClick={() => navigate(child.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                    isChildActive
                      ? 'bg-blue-100 text-blue-700 border-l-2 border-blue-500'
                      : `${isDarkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`
                  }`}
                  title={isCollapsed ? child.label : ''}
                >
                  <ChildIcon className="w-4 h-4 flex-shrink-0" />
                  <span>{child.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`
      ${isCollapsed ? 'w-18 items-center' : 'w-64'} 
      h-full 
      ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} 
      border-r 
      flex 
      flex-col 
      shadow-lg
    `}
    >
      {/* Header avec bouton collapse */}
      <div
        className={`
        p-4 
        border-b 
        ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} 
        flex 
        items-center 
        justify-between
      `}
      >
        {!isCollapsed && (
          <div
            className="flex items-center gap-3 cursor-pointer h-16 overflow-hidden"
            onClick={() => navigate('/dashboard')}
          >
            <img
              alt="Logo"
              src={isDarkMode ? '/invoice-logo-dark.png' : '/invoice-logo.png'}
              className="w-full object-cover object-center"
            />
            {/* <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span
              className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              InvoiceFlow
            </span> */}
          </div>
        )}

        <button
          onClick={handleTabChange}
          className={`
            p-2 
            rounded-lg 
            transition-all 
            duration-200 
            ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}
          `}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-6 h-6" />
          ) : (
            <PanelLeftClose className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {sidebarItems.map(renderSidebarItem)}
      </nav>

      {/* Bouton Déconnexion */}
      <div
        className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
      >
        <button
          onClick={() => {
            /* Handle logout */
          }}
          className={`
            w-full 
            flex 
            items-center 
            gap-3 
            px-3 
            py-2.5 
            rounded-lg 
            transition-all 
            duration-200 
            ${
              isDarkMode
                ? 'text-red-400 hover:bg-red-900/20 hover:text-red-300'
                : 'text-red-600 hover:bg-red-50 hover:text-red-700'
            }
          `}
          title={isCollapsed ? 'Log out' : ''}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Log out</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
