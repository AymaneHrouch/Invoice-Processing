import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTheme, useAuth } from '@/contexts';
import { Mail, Lock, UserPlus, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function RegisterPage() {
  const { isDarkMode } = useTheme();
  const { register, loading, error } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const userData = {
      username,
      email,
      password,
      confirm_password: confirmPassword,
    };

    const success = await register(userData);
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
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <CardTitle
              className={`text-2xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              Create an account
            </CardTitle>
          </div>
          <p
            className={`${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            } text-sm`}
          >
            Sign up to start managing and processing invoices efficiently.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleRegister}>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="your username"
                  className="pl-9"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:opacity-90 transition"
              disabled={loading}
            >
              {loading ? 'Signing up...' : 'Register'}
            </Button>
          </form>

          <p
            className={`text-center mt-6 text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-blue-500 hover:underline font-medium"
            >
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
