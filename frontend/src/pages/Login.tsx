import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';

import { login } from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { setToken } = useAuth();
  const navigate = useNavigate();

  const mutation = useMutation(login, {
    onSuccess: (data) => {
      setToken(data.access_token);
      navigate('/');
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900/95 p-8 shadow-xl shadow-slate-900/20">
        <h1 className="text-3xl font-semibold mb-6 text-white">Login</h1>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate({ email, password });
          }}
          className="space-y-4"
        >
          <label className="block">
            <span className="text-slate-300">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
              required
            />
          </label>
          <label className="block">
            <span className="text-slate-300">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
              required
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-2xl bg-cyan-500 px-4 py-3 text-base font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            {mutation.isLoading ? 'Signing in...' : 'Sign in'}
          </button>
          {mutation.isError && (
            <div className="rounded-2xl bg-rose-500/20 p-3 text-sm text-rose-200">
              Authentication failed. Check your credentials.
            </div>
          )}
        </form>
        <p className="mt-5 text-sm text-slate-400">
          New user?{' '}
          <Link className="text-cyan-300 hover:text-cyan-200" to="/register">
            Create an account.
          </Link>
        </p>
      </div>
    </div>
  );
}
