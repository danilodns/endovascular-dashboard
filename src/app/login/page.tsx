'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import styles from './login.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error('Erro de autenticação ou credenciais inválidas.');
      } else {
        toast.success('Login realizado com sucesso!');
        router.push('/');
        router.refresh();
      }
    } catch {
      toast.error('Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Digite seu email para receber o link de recuperação.');
      return;
    }
    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
      });
      if (error) throw error;
      toast.success('Enviamos um link de recuperação para seu email.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível enviar o link de recuperação.');
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={`card ${styles.loginCard}`}>
        <div className={styles.header}>
          <h2>Endovascular Hub</h2>
          <p>Faça login para gerenciar o sistema</p>
        </div>
        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="password">Senha</label>
            <div className={styles.passwordField}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className={styles.toggleBtn}
                onClick={() => setShowPassword(s => !s)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button
              type="button"
              className={styles.forgotLink}
              onClick={handleForgotPassword}
              disabled={sendingReset}
              style={{ alignSelf: 'flex-start', marginTop: '-0.25rem' }}
            >
              {sendingReset ? 'Enviando...' : 'Esqueceu a senha?'}
            </button>
          </div>
          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
