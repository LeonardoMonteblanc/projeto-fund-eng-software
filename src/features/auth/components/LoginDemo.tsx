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
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '34px 16px', backgroundColor: 'var(--color-accent)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ width: 'min(1080px, 100%)', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '38px', alignItems: 'center' }}>
        <div style={{ color: '#FFFFFF', minWidth: 0 }}>
          <div style={{ fontSize: '13px', letterSpacing: '0.22em', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-rosa)' }}>LabUcs</div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(28px, 3.3vw, 42px)', margin: '14px 0', color: '#FFFFFF', maxWidth: '560px', textTransform: 'none', fontWeight: 300, lineHeight: 1.2 }}>Gestão de Equipamentos Laboratoriais</h1>
          <p style={{ color: '#E3E9F0', maxWidth: '540px', fontSize: '15px' }}>Cadastro de equipamentos, calibrações, verificações, manutenções, solicitações, fornecedores, relatórios e indicadores dos laboratórios da UCS.</p>
          <ul style={{ margin: '22px 0', padding: 0, listStyle: 'none', display: 'grid', gap: '8px', color: '#FFFFFF', fontSize: '13px' }}>
            <li style={{ display: 'flex', gap: '8px' }}><span style={{ color: 'var(--color-rosa)', fontWeight: 700 }}>▸</span> Sinalização de vencimentos e não conformidades (RF17)</li>
            <li style={{ display: 'flex', gap: '8px' }}><span style={{ color: 'var(--color-rosa)', fontWeight: 700 }}>▸</span> Regra de decisão |erro| + U ≤ CA (aceitação simples)</li>
            <li style={{ display: 'flex', gap: '8px' }}><span style={{ color: 'var(--color-rosa)', fontWeight: 700 }}>▸</span> Auditoria completa e indicadores de custos por laboratório</li>
          </ul>
          <p style={{ fontSize: '11px', borderLeft: '4px solid var(--color-rosa)', paddingLeft: '10px', color: '#E3E9F0' }}>Modo demonstração — sem autenticação real (POC acadêmica).</p>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '2px solid var(--color-border)', padding: '28px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ borderBottom: '2px solid var(--color-border)', marginBottom: '16px', paddingBottom: '12px' }}>
            <h2 style={{ margin: '0 0 4px', color: 'var(--color-accent)', textTransform: 'uppercase', fontSize: '17px' }}>Entrar na demonstração</h2>
            <p style={{ margin: 0, color: 'var(--color-fg-muted)', fontSize: '12.5px' }}>Selecione o perfil de acesso</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {PERFIS_ORDEM.map((p) => {
                  const isSelected = perfil === p;
                  const Icon = PERFIL_ICONS[p];
                  return (
                    <button key={p} type="button" onClick={() => setPerfil(p)} style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '10px',
                      backgroundColor: isSelected ? '#EAF0F6' : '#FAFAFA',
                      border: `2px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                    }}>
                      <div style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? 'var(--color-accent)' : '#FFFFFF', border: `2px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`, flexShrink: 0, color: isSelected ? '#FFFFFF' : 'var(--color-fg-muted)' }}>{Icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12.5px', fontWeight: 700, color: 'var(--color-fg)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{PERFIL_LABELS[p]}</div>
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--color-fg-muted)', marginTop: '2px' }}>{PERFIL_DESCRICOES[p]}</div>
                      </div>
                      {isSelected && <ChevronRight size={20} style={{ color: 'var(--color-accent)' }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {exigeLab && (
              <div>
                <select value={laboratorioId} onChange={(e) => setLaboratorioId(e.target.value)} style={{ width: '100%', fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--color-fg)', backgroundColor: '#FFFFFF', border: '2px solid var(--color-border)', padding: '8px 10px', minHeight: '40px' }}>
                  <option value="">Selecione o laboratório</option>
                  {laboratorios.map((l) => <option key={l.id} value={l.id}>{l.sigla} — {l.nome}</option>)}
                </select>
              </div>
            )}

            {erro && <div style={{ padding: '11px 14px', backgroundColor: 'var(--color-danger-bg)', border: '2px solid var(--color-danger)', color: 'var(--color-danger)', fontFamily: 'var(--font-sans)', fontSize: '12.5px', borderLeftWidth: '6px' }}>{erro}</div>}

            <Button type="submit" variant="primary" size="lg" fullWidth loading={carregando} leftIcon={<Key size={18} />}>Entrar como {PERFIL_LABELS[perfil]}</Button>
          </form>

          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '2px solid var(--color-border)', textAlign: 'center' }}><p style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'var(--color-fg-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Universidade de Caxias do Sul • FBI4010X</p></div>
        </div>
      </div>
    </div>
  );
}