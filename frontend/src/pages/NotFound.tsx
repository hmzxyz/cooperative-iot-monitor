import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-6 py-12 text-center">
      <div className="max-w-xl rounded-3xl border border-slate-800 bg-slate-900/95 p-10 shadow-xl shadow-slate-900/20">
        <h1 className="text-6xl font-bold text-white">404</h1>
        <p className="mt-4 text-slate-400">Page not found.</p>
        <Link className="mt-6 inline-flex rounded-2xl bg-cyan-500 px-5 py-3 text-white transition hover:bg-cyan-400" to="/">
          Return home
        </Link>
      </div>
    </div>
  );
}
