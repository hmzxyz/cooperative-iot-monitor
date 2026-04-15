import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';

import { register } from '../services/api';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const navigate = useNavigate();

  const mutation = useMutation(register, {
    onSuccess: () => {
      navigate('/login');
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900/95 p-8 shadow-xl shadow-slate-900/20">
        <h1 className="text-3xl font-semibold mb-6 text-white">Register</h1>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate({ email, password, full_name: fullName });
          }}
          className="space-y-4"
        >
          <label className="block">
            <span className="text-slate-300">Full name</span>
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
              required
            />
          </label>
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
            className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-base font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            {mutation.isLoading ? 'Creating account...' : 'Register'}
          </button>
          {mutation.isError && (
            <div className="rounded-2xl bg-rose-500/20 p-3 text-sm text-rose-200">
              Registration failed. Try a different email.
            </div>
          )}
        </form>
        <p className="mt-5 text-sm text-slate-400">
          Already registered?{' '}
          <Link className="text-cyan-300 hover:text-cyan-200" to="/login">
            Sign in.
          </Link>
        </p>
      </div>
    </div>
  );
}
