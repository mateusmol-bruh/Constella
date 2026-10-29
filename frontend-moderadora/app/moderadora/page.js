'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole, Mail } from 'lucide-react';
import { loginModeradora } from '@/lib/api';
import { useSession } from '@/components/SessionProvider';
import {GradientButton,Notice} from '@/components/Panel';
import AstroLoader from '@/components/AstroLoader';
import { withVisibleLoading } from '@/lib/loading';

export default function ModeradoraLogin() {
  const router=useRouter();
  const {session,ready,save}=useSession();
  const [email,setEmail]=useState('');
  const [senha,setSenha]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  async function handleSubmit(e) {
    e.preventDefault();setError('');setLoading(true);
    try {
      const response=await withVisibleLoading(() => loginModeradora(email,senha));
      if (!response.token || !response.moderadora) throw new Error('Resposta de autenticação inválida.');
      save({token:response.token,moderadora:response.moderadora,demo:false});
      router.replace('/moderadora/painel');
    } catch (err) {setError(err.message);} finally {setLoading(false);}
  }
  async function demo() {
    setLoading(true);
    await withVisibleLoading(() => Promise.resolve());
    save({token:null,moderadora:{id:'demo',nome:'Moderadora de demonstração'},demo:true});
    router.replace('/moderadora/painel');
  }
  if (!ready || session) return <AstroLoader variant="fullscreen" label="Preparando acesso…" />;
  if (loading) return <AstroLoader variant="fullscreen" label="Entrando no Constella…" />;
  return <main className="screen login-screen"><section className="login-card" aria-labelledby="login-title">
    <h1 id="login-title">Bem vinda!</h1>
    <p className="login-subtitle">Faça login com suas credenciais</p>
    <form onSubmit={handleSubmit}>
      <label className="input-icon"><Mail size={22} strokeWidth={1.6}/><input aria-label="E-mail" type="email" autoComplete="username" placeholder="Nome de usuário ou email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label className="input-icon"><LockKeyhole size={22} strokeWidth={1.6}/><input aria-label="Senha" type="password" autoComplete="current-password" placeholder="Senha" required value={senha} onChange={e=>setSenha(e.target.value)}/></label>
      <Notice message={error}/>
      <GradientButton className="login-submit" type="submit" disabled={loading}>{loading?'Entrando…':'Entrar'}</GradientButton>
    </form>
    <button type="button" className="demo-trigger" onClick={demo}>Explorar demonstração sem login</button>
  </section></main>;
}
