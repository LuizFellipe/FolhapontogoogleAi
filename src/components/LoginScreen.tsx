import { useState, FormEvent } from 'react';
import { motion } from 'motion/react';
import { Lock, User } from 'lucide-react';

interface Props {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validUser = import.meta.env.VITE_APP_USERNAME;
    const validPass = import.meta.env.VITE_APP_PASSWORD;

    if (username === validUser && password === validPass) {
      onLogin();
    } else {
      setError('Usuário ou senha inválidos.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#111827' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
        className="w-full max-w-sm rounded-xl shadow-2xl p-8"
      >
        {/* System identifier */}
        <div className="mb-6 text-center">
          <p className="text-xs tracking-widest mb-1" style={{ color: '#059669', fontFamily: 'monospace' }}>
            SEE-DF · SISTEMA OFICIAL
          </p>
          <h1 className="text-lg font-bold tracking-wide" style={{ color: '#f9fafb', fontFamily: 'monospace' }}>
            GESTOR FOLHA PONTO
          </h1>
          <div className="mt-3 mx-auto w-12 h-0.5" style={{ backgroundColor: '#059669' }} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#9ca3af' }}>
              USUÁRIO
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6b7280' }} />
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                autoComplete="username"
                autoFocus
                className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                style={{
                  backgroundColor: '#111827',
                  border: '1px solid #374151',
                  color: '#f9fafb',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#059669')}
                onBlur={e => (e.currentTarget.style.borderColor = '#374151')}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#9ca3af' }}>
              SENHA
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6b7280' }} />
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                autoComplete="current-password"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                style={{
                  backgroundColor: '#111827',
                  border: '1px solid #374151',
                  color: '#f9fafb',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#059669')}
                onBlur={e => (e.currentTarget.style.borderColor = '#374151')}
              />
            </div>
          </div>

          {/* Error */}
          <motion.p
            animate={shake ? { x: [-6, 6, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.3 }}
            className="text-xs h-4"
            style={{ color: '#f87171' }}
          >
            {error}
          </motion.p>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-opacity hover:opacity-90 active:opacity-75"
            style={{ backgroundColor: '#059669', color: '#f9fafb' }}
          >
            ENTRAR
          </button>
        </form>
      </motion.div>
    </div>
  );
}
