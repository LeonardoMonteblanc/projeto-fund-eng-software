/**
 * Dashboard - Painel principal.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFuncionalidades } from '@/features/auth/store';
import { getDB, getAll } from '@/shared/db';
import { Card, CardHeader, CardContent, Badge, StatusBadge, Button, spaceRem } from '@/shared/ui/components';
import { formatarDataBR, centavosParaReais } from '@/shared/utils';
import { calcularMetricas, equipamentoAtivo, resumirPorSituacao, maiorSeveridade } from '@/shared/metrology';
import { SITUACOES_EQUIPAMENTO, TIPOS_EVENTO, SITUACOES_EVENTO, type Equipamento, type Evento, type Laboratorio } from '@/shared/domain';

interface AlertaRecente { id: string; tipo: 'CRITICO' | 'ALTO' | 'MEDIO' | 'INFO'; mensagem: string; equipamento: string; lab: string; data: string; }

const DownloadIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/></svg>;

export function Dashboard() {
  const funcionalidades = useFuncionalidades();
  const [kpis, setKpis] = useState({ totalEquipamentos: 0, ativos: 0, alertasCriticos: 0, alertasAltos: 0, proximosVencimentos: 0, custosMes: 0, receitaMes: 0 });
  const [alertasRecent, setAlertasRecent] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarDashboard() {
      setCarregando(true);
      try {
        const db = await getDB();
        const [equipamentos, eventos, labs] = await Promise.all([getAll('equipamentos'), getAll('eventos'), getAll('labs')]);
        const hoje = new Date().toISOString().split('T')[0]!;
        const trintaDiasAtras = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]!;
        const ativos = equipamentos.filter((e: any) => e.situacao === 'ATIVO').length;
        let criticos = 0, altos = 0, proximosVenc = 0;
        const alertas: any[] = [];
        for (const eq of equipamentos.filter((e: any) => e.situacao === 'ATIVO')) {
          const item = { caCalibracao: eq.caCalibracao, caVerificacao: eq.caVerificacao, periodicidadeCalibracaoMeses: eq.periodicidadeCalibracaoMeses, periodicidadeVerificacaoMeses: eq.periodicidadeVerificacaoMeses, periodicidadeManutencaoPreventivaMeses: eq.periodicidadeManutencaoPreventivaMeses };
          const eqEventos = eventos.filter((e: any) => e.equipamentoId === eq.id);
          const { calcularMetricas } = await import('@/shared/metrology');
          const metricas = calcularMetricas({ equipamento: eq, item, eventos: eqEventos, hoje, diasAlerta: 30 });
          if (metricas.situacaoMetrologica === 'NAO_CONFORME') criticos++;
          else if (metricas.situacaoMetrologica === 'ATENCAO') altos++;
          if (metricas.diasParaVencimento !== null && metricas.diasParaVencimento > 0 && metricas.diasParaVencimento <= 30) proximosVenc++;
          for (const s of metricas.sinalizacoes) {
            const lab = labs.find((l: any) => l.id === eq.laboratorioId);
            alertas.push({ id: `${eq.id}-${s.codigo}`, tipo: s.severidade, mensagem: s.detalhe, equipamento: `${eq.tag} (${eq.patrimonio})`, lab: lab?.sigla ?? '—', data: hoje });
          }
        }
        const eventosMes = eventos.filter((e: any) => e.situacao === 'REALIZADO' && e.dataRealizacao && e.dataRealizacao >= new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]! && e.custoRealizadoCentavos && e.custoRealizadoCentavos > 0);
        const custosMes = eventosMes.reduce((sum: number, e: any) => sum + (e.custoRealizadoCentavos || 0), 0);
        const receitaMes = labs.reduce((sum: number, l: any) => sum + (l.receitaMensalCentavos || 0), 0);
        setKpis({ totalEquipamentos: equipamentos.length, ativos, alertasCriticos: criticos, alertasAltos: altos, proximosVencimentos: proximosVenc, custosMes, receitaMes });
        setAlertasRecent(alertas.sort((a, b) => b.data.localeCompare(a.data)).slice(0, 10));
      } catch (e) { console.error(e); } finally { setCarregando(false); }
    }
    carregarDashboard();
  }, []);

  const navCards = (funcionalidades ?? []).filter((f: any) => f.acessivel && f.rota && f.rota !== '/').map((f: any) => ({ titulo: f.nome, rota: f.rota, descricao: f.descricao, icone: <ModuloIcone codigo={f.codigo} /> }));

  if (carregando) return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--color-fgMuted)' }}><div style={{ width: '48px', height: '48px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '0', animation: 'spin 1s linear infinite' }} /><p style={{ marginTop: '16px', fontFamily: 'var(--font-mono)' }}>Carregando dashboard...</p></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="painel-hero-responsivo" style={{ background: 'var(--color-accent)', color: 'var(--color-fg-on-blue)', padding: '30px 32px 26px', marginBottom: '26px', borderLeft: '8px solid var(--color-rosa)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '24px', flexWrap: 'wrap', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.16em', fontWeight: 700, color: 'var(--color-rosa)', textTransform: 'uppercase', marginBottom: '4px' }}>LabUcs • Visão consolidada</div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(1.9rem, 3.1vw, 2.7rem)', fontWeight: 300, color: '#FFFFFF', margin: '6px 0 0', lineHeight: 1.1, letterSpacing: '-0.02em', textTransform: 'none' }}>Painel de <strong style={{ fontWeight: 600 }}>Controle</strong></h1>
          <p style={{ color: '#DBE4EE', fontSize: '13px', margin: '8px 0 0', maxWidth: '62ch' }}>Visão consolidada de equipamentos, alertas de vencimento e indicadores dos laboratórios</p>
        </div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button style={{ backgroundColor: '#FFFFFF', color: 'var(--color-accent)', borderColor: '#FFFFFF' }} leftIcon={<DownloadIcon />}>Exportar PDF</Button>
          <Button variant="secondary" style={{ backgroundColor: 'transparent', color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.7)' }} leftIcon={<DownloadIcon />}>Exportar Excel</Button>
        </div>
      </div>

      <div className="grade-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <KPICard titulo="Total de Equipamentos" valor={kpis.totalEquipamentos.toLocaleString('pt-BR')} subtitulo={`${kpis.ativos} ativos • ${kpis.totalEquipamentos - kpis.ativos} inativos/manutenção`} cor="accent" />
        <KPICard titulo="Alertas Críticos" valor={kpis.alertasCriticos} subtitulo="Não conformes (calibração vencida/reprovada)" cor="danger" />
        <KPICard titulo="Alertas de Atenção" valor={kpis.alertasAltos} subtitulo="Próximos do vencimento ou periodicidade zero" cor="warning" />
        <KPICard titulo="Próximos Vencimentos (30d)" valor={kpis.proximosVencimentos} subtitulo="Calibrações/verificações a vencer" cor="info" />
        <KPICard titulo="Custos (30 dias)" valor={centavosParaReais(kpis.custosMes)} subtitulo="Calibrações, verificações e manutenções" cor="danger" />
        <KPICard titulo="Receita Mensal (Labs)" valor={centavosParaReais(kpis.receitaMes)} subtitulo="Soma das receitas dos laboratórios" cor="success" />
      </div>

      <div className="grade-empilhada" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '16px' }}>
        <div style={{ backgroundColor: 'var(--color-bg-elevated)', border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
          <CardHeader title="Alertas Recentes" subtitle={`${alertasRecent.length} sinalizações ativas`} action={<Button variant="ghost" size="sm" leftIcon={<ChevronRightIcon size={14} />}>Ver todos</Button>} />
          <CardContent style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
            {alertasRecent.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', color: 'var(--color-fg-muted)', textAlign: 'center' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" style={{ marginBottom: '16px', color: 'var(--color-accent)' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-base)', margin: 0 }}>Nenhum alerta ativo</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', marginTop: '4px' }}>Todos os equipamentos estão conformes</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {alertasRecent.map((alerta: any) => (
                  <div key={alerta.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 10px', backgroundColor: alerta.tipo === 'CRITICO' ? '#FDF0F0' : alerta.tipo === 'ALTO' ? '#FFF7E8' : '#FAFAFA', border: '2px solid var(--color-border)', borderLeftWidth: '6px', borderLeftColor: alerta.tipo === 'CRITICO' ? 'var(--color-danger)' : alerta.tipo === 'ALTO' ? 'var(--color-warning)' : 'var(--color-accent)' }}>
                    <StatusBadge status={alerta.tipo} size="sm" showDot />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12.5px', fontWeight: 700, color: 'var(--color-fg)', margin: '0 0 4px 0' }}>{alerta.equipamento}</p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{alerta.mensagem}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-dim)' }}>{alerta.data}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-dim)' }}>{alerta.lab}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </div>

        <div style={{ backgroundColor: 'var(--color-bg-elevated)', border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <CardHeader title="Acesso Rápido" subtitle={`${navCards.length} módulos disponíveis`} />
          <CardContent style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px' }}>
              {navCards.map((item) => (
                <Link key={item.titulo} to={item.rota} title={item.descricao} style={{ display: 'flex', flexDirection: 'column', gap: '3px', padding: '13px', backgroundColor: 'var(--color-bg-elevated)', border: '2px solid var(--color-border)', textAlign: 'left', textDecoration: 'none', color: 'var(--color-fg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--color-accent)' }}>
                    {item.icone}
                    <strong style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase' }}>{item.titulo}</strong>
                  </div>
                  <span style={{ color: 'var(--color-fg-muted)', fontSize: '11px' }}>{item.descricao}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </div>
      </div>
    </div>
  );
}

function KPICard({ titulo, valor, subtitulo, cor }: { titulo: string; valor: string | number; subtitulo?: string; cor: 'accent' | 'danger' | 'warning' | 'info' | 'success' }) {
  const cores: Record<string, { borda: string; valor: string }> = {
    accent: { borda: 'var(--color-accent)', valor: 'var(--color-accent)' },
    danger: { borda: 'var(--color-danger)', valor: 'var(--color-danger)' },
    warning: { borda: 'var(--color-warning)', valor: 'var(--color-warning)' },
    info: { borda: 'var(--color-info)', valor: 'var(--color-info)' },
    success: { borda: 'var(--color-sucesso)', valor: 'var(--color-sucesso)' },
  };
  const c = cores[cor];
  return (
    <div style={{ backgroundColor: 'var(--color-bg-elevated)', border: '2px solid var(--color-border)', borderLeft: `5px solid ${c.borda}`, padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px', height: '100%', boxShadow: 'var(--shadow-sm)', transition: 'border-color var(--transition-base), transform var(--transition-base)' }}>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', fontWeight: 700, color: 'var(--color-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{titulo}</p>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '30px', fontWeight: 600, color: c.valor, margin: 0, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{valor}</p>
      {subtitulo && <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--color-fg-muted)', margin: 0 }}>{subtitulo}</p>}
    </div>
  );
}

function BoxIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="0" strokeWidth="2"/><path d="M12 22V12"/><path d="M8 16h8"/></svg>; }
function AlertCircleIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>; }
function AlertTriangleIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>; }
function ClockIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function DollarSignIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7h6"/></svg>; }
function TrendingUpIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><polyline points="18 10 12 4 6 10"/></svg>; }
function ChevronRightIcon({ size = 14 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>; }

function ModuloIcone({ codigo }: { codigo: string }) {
  const icones: Record<string, React.ReactNode> = {
    F02: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M12 22V12"/><path d="M8 16h8"/></svg>,
    F03: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
    F04: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
    F05: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    F06: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    F07: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 2v8L4.8 12.6A2 2 0 0 0 4 14.3V20a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5.7a2 2 0 0 0-.8-1.7L14 10V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/></svg>,
    F08: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    F09: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    F10: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    F11: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    F12: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    F13: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
    F14: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    F15: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    F16: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>,
  };
  return icones[codigo] ?? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>;
}