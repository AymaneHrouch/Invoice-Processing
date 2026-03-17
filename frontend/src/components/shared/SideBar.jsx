import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { sidebarItems } from '@/constants';
import { useAuth, useTheme } from '@/contexts';
import { getContacts } from '@/api/contacts';

import {
  FileText,
  LogOut,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import Cookies from 'js-cookie';

const SIDEBAR_STATE_COOKIE = 'sidebar_collapsed';

const Sidebar = ({ profileComplete = true }) => {
  const { isDarkMode } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    achats: true,
    ventes: true,
  });
  const [contactsCount, setContactsCount] = useState(null);
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    getContacts()
      .then((data) => setContactsCount(data.length))
      .catch(() => setContactsCount(null));
  }, [location.pathname]);

  // Filter sidebar items based on user role
  const filteredSidebarItems = sidebarItems.filter((item) => {
    // Show admin-only items only to admin users
    if (item.adminOnly && user?.role !== 'ADMIN') {
      return false;
    }
    return true;
  });

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
      setExpandedSections((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const isPathActive = (path) => {
    if (!path) return false;
    const [pathname, search] = path.split('?');
    if (search) {
      return location.pathname === pathname && location.search === `?${search}`;
    }
    return location.pathname === pathname;
  };

  const isSectionActive = (item) => {
    if (!item.children) return false;
    return item.children.some((child) => isPathActive(child.path));
  };

  const renderSidebarItem = (item) => {
    const Icon = item.icon;
    const isActive = isPathActive(item.path);
    const sectionActive = isSectionActive(item);

    return (
      <div key={item.id} className="mb-1">
        <button
          onClick={() => handleItemClick(item)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
            isActive
              ? 'bg-blue-600 text-white shadow-lg'
              : sectionActive
                ? isDarkMode
                  ? 'bg-blue-900/30 text-blue-300 border-l-2 border-blue-500'
                  : 'bg-blue-50 text-blue-700 border-l-2 border-blue-500'
                : `${isDarkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`
          }`}
          title={isCollapsed ? item.label : ''}
        >
          <div className="relative flex-shrink-0">
            <Icon className="w-5 h-5" />
            {item.id === 'company' && !profileComplete && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white dark:border-gray-800" />
            )}
          </div>
          {!isCollapsed && (
            <>
              <span className="font-medium flex-1 text-left">{item.label}</span>
              {item.id === 'contacts' && contactsCount !== null && (
                <span
                  className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}
                >
                  {contactsCount}
                </span>
              )}
              {item.id === 'company' && !profileComplete && (
                <span className="text-xs font-semibold text-orange-500">
                  Configurer
                </span>
              )}
              {item.hasChildren && (
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    expandedSections[item.id] ? 'transform rotate-180' : ''
                  } ${sectionActive && !isActive ? 'text-blue-500' : ''}`}
                />
              )}
            </>
          )}
        </button>

        {item.children && !isCollapsed && expandedSections[item.id] && (
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
        {filteredSidebarItems.map(renderSidebarItem)}
      </nav>

      {/* Bouton Déconnexion */}
      <div
        className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
      >
        <button
          onClick={logout}
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
          title={isCollapsed ? 'Se déconnecter' : ''}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Se déconnecter</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
