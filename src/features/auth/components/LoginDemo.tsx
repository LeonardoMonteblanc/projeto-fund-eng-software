/**
 * LoginDemo - Tela de seleção de perfil para demo.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogin, useLabId } from '@/features/auth/store';
import { getDB, getAll } from '@/shared/db';
import { PERFIS, PERFIL_ROTULO, PERFIL_DESCRICAO } from '@/shared/constants';
import { Button, Select, Card, spaceRem } from '@/shared/ui/components';
import { Key, ChevronRight } from 'lucide-react';

const PERFIS_ORDEM = ['ADMIN', 'GESTOR_GERAL', 'GESTOR_LAB', 'TECNICO'] as const;

const PERFIL_LABELS: Record<string, string> = { ADMIN: 'Administrador', GESTOR_GERAL: 'Gestor Geral', GESTOR_LAB: 'Gestor de Laboratório', TECNICO: 'Técnico' };
const PERFIL_DESCRICOES: Record<string, string> = { ADMIN: 'Gerencia usuários, laboratórios, fornecedores, catálogo e parâmetros; consulta dados operacionais em modo leitura.', GESTOR_GERAL: 'Visão consolidada de todos os laboratórios, eventos, relatórios gerenciais, custos e log de auditoria.', GESTOR_LAB: 'Gerencia equipamentos, eventos e solicitações do seu laboratório; emite relatórios do laboratório.', TECNICO: 'Registra calibrações, verificações e manutenções; consulta equipamentos e históricos do seu laboratório.' };
const PERFIL_ICONS: Record<string, React.ReactNode> = {
  ADMIN: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="0" strokeWidth="2"/><path d="M12 22V12"/><path d="M8 16h8"/></svg>,
  GESTOR_GERAL: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 13.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V19"/><path d="M21 3H5a2 2 0 0 0-2 2v14"/><path d="M21 3v18"/><path d="M12 17v4"/><path d="M7 17v4"/></svg>,
  GESTOR_LAB: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  TECNICO: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
};

export function LoginDemo() {
  const navigate = useNavigate();
  const login = useLogin();
  const [perfil, setPerfil] = useState<'ADMIN' | 'GESTOR_GERAL' | 'GESTOR_LAB' | 'TECNICO'>('GESTOR_LAB');
  const [laboratorioId, setLaboratorioId] = useState<string>('');
  const [laboratorios, setLaboratorios] = useState<Array<{ id: string; sigla: string; nome: string }>>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => { async function load() { try { const db = await getDB(); const labs = await db.getAll('labs'); setLaboratorios(labs.filter((l: any) => l.ativo).map((l: any) => ({ id: l.id, sigla: l.sigla, nome: l.nome }))); } catch (e) { console.error(e); } } load(); }, []);

  const exigeLab = perfil === 'GESTOR_LAB' || perfil === 'TECNICO';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setErro(null); setCarregando(true);
    try { if (exigeLab && !laboratorioId) { setErro('Selecione um laboratório.'); setCarregando(false); return; } await login(perfil, exigeLab ? laboratorioId : undefined); navigate('/', { replace: true }); } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao entrar.'); setCarregando(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: spaceRem(4), backgroundColor: 'var(--color-bg)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ width: '100%', maxWidth: '480px', backgroundColor: 'var(--color-bgElevated)', border: '2px solid var(--color-border)', padding: '32px' }}>
        <div style={{ textAlign: 'center', paddingBottom: '24px', borderBottom: '2px solid var(--color-border)', marginBottom: '24px' }}>
          <div style={{ width: '64px', height: '64px', margin: '0 auto 16px', backgroundColor: 'var(--color-accentBg)', border: '2px solid var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Key size={32} style={{ color: 'var(--color-accent)' }} /></div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-fg)', margin: '0 0 8px 0' }}>LabUcs Demo</h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-sm)', color: 'var(--color-fgMuted)', margin: 0 }}>Selecione o perfil de acesso</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-fg)', marginBottom: '8px' }}>Perfil de Acesso</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {PERFIS_ORDEM.map((p) => {
                const isSelected = perfil === p;
                const Icon = PERFIL_ICONS[p];
                return (
                  <button key={p} type="button" onClick={() => setPerfil(p)} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                    backgroundColor: isSelected ? 'var(--color-accentBg)' : 'var(--color-bgElevated)',
                    border: `2px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}>
                    <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? 'var(--color-accent)' : 'var(--color-bg)', border: `2px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`, flexShrink: 0 }}>{Icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-fg)' }}>{PERFIL_LABELS[p]}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--color-fgMuted)', marginTop: '2px' }}>{PERFIL_DESCRICOES[p]}</div>
                    </div>
                    {isSelected && <ChevronRight size={20} style={{ color: 'var(--color-accent)' }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {exigeLab && (
            <div>
              <select value={laboratorioId} onChange={(e) => setLaboratorioId(e.target.value)} style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-base)', color: 'var(--color-fg)', backgroundColor: 'var(--color-bgElevated)', border: '2px solid var(--color-border)', padding: '8px 12px' }}>
                <option value="">Selecione o laboratório</option>
                {laboratorios.map((l) => <option key={l.id} value={l.id}>{l.sigla} — {l.nome}</option>)}
              </select>
            </div>
          )}

          {erro && <div style={{ padding: '12px', backgroundColor: 'var(--color-dangerBg)', border: '2px solid var(--color-danger)', color: 'var(--color-danger)', fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-sm)' }}>{erro}</div>}

          <Button type="submit" variant="primary" size="lg" fullWidth loading={carregando} leftIcon={<Key size={18} />}>Entrar como {PERFIL_LABELS[perfil]}</Button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '2px solid var(--color-border)', textAlign: 'center' }}><p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--color-fgMuted)', margin: 0 }}>Modo demonstração — sem autenticação real</p></div>
      </div>
    </div>
  );
}