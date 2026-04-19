import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, ArrowRight, Eye, EyeOff } from 'lucide-react';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, user, login, signup, getApiErrorMessage } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(user?.role === 'ADMIN' ? '/dashboard' : '/upload');
    }
  }, [isAuthenticated, navigate, user?.role]);

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      let authedUser;
      if (mode === 'signup') {
        authedUser = await signup(form);
      } else {
        authedUser = await login({ email: form.email, password: form.password });
      }
      // Role-aware redirect: admins start at dashboard, users start at upload
      navigate(authedUser?.role === 'ADMIN' ? '/dashboard' : '/upload');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to authenticate right now.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-16 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/4 -right-40 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute bottom-0 -left-40 w-[400px] h-[400px] rounded-full bg-tertiary/8 blur-[80px]" />
      </div>

      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-12">
          <div className="w-14 h-14 rounded-full bg-primary-gradient flex items-center justify-center shadow-[0_0_40px_-8px] shadow-primary-dim/60 mb-4">
            <Brain size={24} className="text-on-primary" />
          </div>
          <h1 className="font-headline font-bold text-2xl text-on-surface tracking-tight">
            Welcome to Feedback<span className="text-transparent bg-clip-text bg-primary-gradient">AI</span>
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        <div className="flex p-1 rounded-full bg-surface-container mb-8">
          {['login', 'signup'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-full text-sm font-semibold font-label transition-all duration-300 ${
                mode === m
                  ? 'bg-primary-gradient text-on-primary shadow-[0_0_16px_-4px] shadow-primary-dim/40'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {m === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          {mode === 'signup' && (
            <Input id="name" label="Full Name" type="text" placeholder="Jane Doe" required value={form.name} onChange={handleChange('name')} />
          )}
          <Input id="email" label="Email Address" type="email" placeholder="you@company.com" required value={form.email} onChange={handleChange('email')} />
          <div className="relative">
            <Input
              id="password"
              label="Password"
              type={showPass ? 'text' : 'password'}
              placeholder="........"
              required
              className="pr-10"
              value={form.password}
              onChange={handleChange('password')}
            />
            <button
              type="button"
              onClick={() => setShowPass(v => !v)}
              className="absolute right-0 bottom-2 text-on-surface-variant hover:text-primary transition-colors duration-200"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {mode === 'login' && (
            <div className="flex justify-end -mt-4">
              <Link to="#" className="text-xs text-primary hover:underline">Forgot password?</Link>
            </div>
          )}

          {error && <p className="text-sm text-error -mt-4">{error}</p>}

          <Button type="submit" variant="primary" className="w-full justify-center gap-2 py-3.5" disabled={submitting}>
            {submitting ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            <ArrowRight size={16} />
          </Button>
        </form>

        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-outline-variant/20" />
          <span className="text-xs text-on-surface-variant font-label">or continue with</span>
          <div className="flex-1 h-px bg-outline-variant/20" />
        </div>

        <Button
          variant="secondary"
          className="w-full justify-center gap-3 py-3.5"
          onClick={() => setError('Google sign-in is not connected yet. Use email and password for now.')}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
