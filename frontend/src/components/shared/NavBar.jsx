import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Moon,
  Sun,
  Bell,
  ChevronDown,
  KeyRound,
  LogOut,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth, useTheme } from '@/contexts';
import { changePassword } from '@/api/auth';
import { toast } from 'sonner';

const NavBar = () => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const menuRef = useRef(null);

  const { isDarkMode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isFirmAdmin = user?.role === 'FIRM_ADMIN';

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openPwModal = () => {
    setUserMenuOpen(false);
    setPwModalOpen(true);
  };

  const closePwModal = () => {
    setPwModalOpen(false);
    setPwForm({ current: '', next: '', confirm: '' });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }
    setPwSaving(true);
    try {
      await changePassword(pwForm.current, pwForm.next);
      toast.success('Mot de passe mis à jour.');
      closePwModal();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors du changement.');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <>
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

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                } cursor-pointer`}
              >
                <Avatar className="w-8 h-8">
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
                  className={`absolute right-0 mt-2 w-52 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl shadow-xl py-2 z-50`}
                >
                  {isFirmAdmin && (
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/users');
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left cursor-pointer ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}
                    >
                      <Users className="w-4 h-4" />
                      <span className="text-sm">Utilisateurs</span>
                    </button>
                  )}
                  <button
                    onClick={openPwModal}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left cursor-pointer ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    <KeyRound className="w-4 h-4" />
                    <span className="text-sm">Changer le mot de passe</span>
                  </button>
                  <Separator className="my-2" />
                  <button
                    onClick={logout}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left ${isDarkMode ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-50 text-red-600'} cursor-pointer`}
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Se déconnecter</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Change password modal */}
      <Dialog open={pwModalOpen} onOpenChange={(o) => !o && closePwModal()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Changer le mot de passe</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-3 pt-2">
            <Input
              type="password"
              placeholder="Mot de passe actuel"
              value={pwForm.current}
              onChange={(e) =>
                setPwForm((p) => ({ ...p, current: e.target.value }))
              }
              required
            />
            <Input
              type="password"
              placeholder="Nouveau mot de passe"
              value={pwForm.next}
              onChange={(e) =>
                setPwForm((p) => ({ ...p, next: e.target.value }))
              }
              required
            />
            <Input
              type="password"
              placeholder="Confirmer le nouveau mot de passe"
              value={pwForm.confirm}
              onChange={(e) =>
                setPwForm((p) => ({ ...p, confirm: e.target.value }))
              }
              required
            />
            <DialogFooter className="pt-1">
              <Button type="button" variant="outline" onClick={closePwModal}>
                Annuler
              </Button>
              <Button type="submit" disabled={pwSaving}>
                {pwSaving ? 'Enregistrement…' : 'Confirmer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NavBar;
