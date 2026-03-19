import React from 'react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTheme, useAuth } from '@/contexts';
import { Mail, Lock, LogIn } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const { isDarkMode } = useTheme();
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    const success = await login(email, password);
    if (!success && error) {
      toast.error(error);
    }
  };

  return (
    <main
      className={`min-h-screen flex items-center justify-center p-6 ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}
    >
      <Card
        className={`w-full max-w-md shadow-xl border-0 rounded-2xl transition-all duration-300 ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <LogIn className="w-6 h-6 text-white" />
            </div>
            <CardTitle
              className={`text-2xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              Bon retour
            </CardTitle>
          </div>
          <p
            className={`${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            } text-sm`}
          >
            Connectez-vous pour gérer vos factures facilement.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="votre e-mail"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 transition"
              disabled={loading}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
