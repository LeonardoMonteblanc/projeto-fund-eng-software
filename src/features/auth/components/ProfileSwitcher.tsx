/**
 * ProfileSwitcher - Dropdown no header para trocar de perfil.
 */

import { useState, useRef, useEffect } from 'react';
import { useUser, usePerfil, useLabId, useLogout, useTrocarPerfil } from '@/features/auth/store';
import { getDB, getAll } from '@/shared/db';
import { PERFIS, PERFIL_ROTULO, PERFIL_DESCRICAO } from '@/shared/constants';
import { Button, Card, CardContent, Badge, spaceRem } from '@/shared/ui/components';
import { LogOut, ChevronDown, X, Building2, Shield, Wrench, User } from 'lucide-react';

const PERFIS_ORDEM = ['ADMIN', 'GESTOR_GERAL', 'GESTOR_LAB', 'TECNICO'] as const;

const PERFIL_ICONES = { ADMIN: Shield, GESTOR_GERAL: Building2, GESTOR_LAB: User, TECNICO: Wrench };

export function ProfileSwitcher() {
  const user = useUser(); const perfil = usePerfil(); const labId = useLabId();
  const logout = useLogout(); const trocarPerfil = useTrocarPerfil();
  const [aberto, setAberto] = useState(false);
  const [laboratorios, setLaboratorios] = useState<Array<{ id: string; sigla: string; nome: string }>>([]);
  const [novoPerfil, setNovoPerfil] = useState<'ADMIN' | 'GESTOR_GERAL' | 'GESTOR_LAB' | 'TECNICO'>('GESTOR_LAB');
  const [novoLabId, setNovoLabId] = useState<string>('');
  const [carregando, setCarregando] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { async function load() { try { const db = await getDB(); const labs = await db.getAll('labs'); setLaboratorios(labs.filter((l: any) => l.ativo).map((l: any) => ({ id: l.id, sigla: l.sigla, nome: l.nome }))); } catch (e) { console.error(e); } } load(); }, []);

  useEffect(() => { function handleClickOutside(e: MouseEvent) { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setAberto(false); } if (aberto) { document.addEventListener('mousedown', handleClickOutside); } return () => document.removeEventListener('mousedown', handleClickOutside); }, [aberto]);

  const exigeLab = (p: string) => p === 'GESTOR_LAB' || p === 'TECNICO';

  async function handleTrocar() { if (!novoPerfil) return; if (exigeLab(novoPerfil) && !novoLabId) return; setCarregando(true); try { await trocarPerfil(novoPerfil, exigeLab(novoPerfil) ? novoLabId : undefined); setAberto(false); } catch (e) { console.error(e); } finally { setCarregando(false); } }

  async function handleLogout() { setCarregando(true); try { await logout(); window.location.reload(); } finally { setCarregando(false); } }

  if (!user) return null;
  const IconAtual = ({ ADMIN: Shield, GESTOR_GERAL: Building2, GESTOR_LAB: User, TECNICO: Wrench })[perfil!];
  const labAtual = laboratorios.find((l: any) => l.id === labId);

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button onClick={() => setAberto(!aberto)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px', backgroundColor: 'var(--color-bgElevated)', border: '2px solid var(--color-border)', cursor: 'pointer', transition: 'all 120ms ease' }} aria-expanded={aberto} aria-haspopup="true">
        <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-accentBg)', border: '2px solid var(--color-accent)' }}><IconAtual size={16} style={{ color: 'var(--color-accent)' }} /></div>
        <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-fg)' }}>{perfil ? PERFIL_ROTULO[perfil] : 'Demo'}</span>{labAtual && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--color-fgMuted)' }}>{labAtual.sigla}</span>}</div>
        <ChevronDown size={16} style={{ color: 'var(--color-fgMuted)', transition: 'transform 120ms ease', transform: aberto ? 'rotate(180deg)' : 'rotate(0)' }} />
      </button>

      {aberto && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 200, minWidth: '320px', animation: 'slideDown 120ms ease' }}>
          <div style={{ backgroundColor: 'var(--color-bgElevated)', border: '2px solid var(--color-border)', overflow: 'hidden' }}>
            <div style={{ padding: '12px', borderBottom: '2px solid var(--color-border)', backgroundColor: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-accentBg)', border: '2px solid var(--color-accent)' }}><IconAtual size={20} style={{ color: 'var(--color-accent)' }} /></div>
                <div><div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-fg)' }}>{user?.nome}</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--color-fgMuted)' }}>{perfil ? PERFIL_ROTULO[perfil] : 'Demo'}{labAtual && ` • ${labAtual.sigla}`}</div></div>
              </div>
              <button onClick={() => setAberto(false)} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--color-fgMuted)' }} aria-label="Fechar"><X size={18} /></button>
            </div>

            <div style={{ padding: '8px' }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-fgMuted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Trocar Perfil</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(['ADMIN', 'GESTOR_GERAL', 'GESTOR_LAB', 'TECNICO'] as const).map((p) => {
                  const Icon = ({ ADMIN: Shield, GESTOR_GERAL: Building2, GESTOR_LAB: User, TECNICO: Wrench })[p];
                  const isSelected = perfil === p;
                  const precisaLab = p === 'GESTOR_LAB' || p === 'TECNICO';
                  return (
                    <button key={p} type="button" onClick={() => { setNovoPerfil(p); if (!precisaLab) handleTrocar(); }} disabled={carregando} style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                      backgroundColor: isSelected ? 'var(--color-accentBg)' : 'var(--color-bgElevated)',
                      border: `2px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      cursor: precisaLab ? 'pointer' : 'pointer', textAlign: 'left', width: '100%',
                    }}>
                      <div style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? 'var(--color-accent)' : 'var(--color-bg)', border: `2px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`, flexShrink: 0 }}><Icon size={18} style={{ color: isSelected ? 'var(--color-bg)' : 'var(--color-fgMuted)' }} /></div>
                      <div style={{ flex: 1 }}><div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-fg)' }}>{PERFIL_ROTULO[p]}</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--color-fgMuted)' }}>{PERFIL_DESCRICAO[p]}</div></div>
                      {isSelected && <ChevronDown size={16} style={{ color: 'var(--color-accent)' }} />}
                    </button>
                  );
                })}
              </div>

              {exigeLab(novoPerfil) && laboratorios.length > 0 && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '2px solid var(--color-border)' }}>
                  <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-fgMuted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Laboratório para {PERFIL_ROTULO[novoPerfil]}</label>
                  <select value={novoLabId} onChange={(e) => setNovoLabId(e.target.value)} style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-sm)', color: 'var(--color-fg)', backgroundColor: 'var(--color-bgElevated)', border: '2px solid var(--color-border)', padding: '8px' }}>
                    <option value="">Selecione...</option>
                    {laboratorios.map((l: any) => <option key={l.id} value={l.id}>{l.sigla} — {l.nome}</option>)}
                  </select>
                </div>
              )}

              {exigeLab(novoPerfil) && (
                <Button variant="outline" fullWidth loading={carregando} onClick={handleTrocar} disabled={!novoLabId || carregando} style={{ marginTop: '12px' }}>Confirmar troca para {PERFIL_ROTULO[novoPerfil]}</Button>
              )}
            </div>

            <div style={{ padding: '12px', borderTop: '2px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
              <Button variant="danger" fullWidth leftIcon={<LogOut size={16} />} onClick={handleLogout} loading={carregando}>Sair da demonstração</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}