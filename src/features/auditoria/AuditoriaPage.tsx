/**
 * AuditoriaPage — Log interno de alterações (RNF03).
 * Consulta restrita ao Gestor Geral.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from '@/features/auth/store';
import { getDB } from '@/shared/db';
import { ACAO_LOG_ROTULO, TABELAS_AUDITADAS } from '@/shared/constants';
import type { LogAuditoria } from '@/shared/domain';
import { Card, CardHeader, CardContent, Badge, Button, Input, Select, spaceRem, PageHeader } from '@/shared/ui/components';
import { formatarDataHoraBR } from '@/shared/utils';
import { ShieldAlert, Search, ChevronDown } from 'lucide-react';

export function AuditoriaPage() {
  const user = useUser();
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroTabela, setFiltroTabela] = useState<string>('todas');
  const [filtroAcao, setFiltroAcao] = useState<string>('todas');
  const [visualizando, setVisualizando] = useState<LogAuditoria | null>(null);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const db = await getDB();
      const todos = await db.getAll('auditoria');
      setLogs(todos.sort((a: any, b: any) => (b.timestamp ?? '').localeCompare(a.timestamp ?? '')));
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const dadosFiltrados = useMemo(() => {
    return logs.filter((l) => {
      const matchTexto = !filtroTexto ||
        (l.usuarioNome ?? '').toLowerCase().includes(filtroTexto.toLowerCase()) ||
        (l.registroId ?? '').toLowerCase().includes(filtroTexto.toLowerCase()) ||
        (l.motivo ?? '').toLowerCase().includes(filtroTexto.toLowerCase());
      const matchTabela = filtroTabela === 'todas' || l.tabela === filtroTabela;
      const matchAcao = filtroAcao === 'todas' || l.acao === filtroAcao;
      return matchTexto && matchTabela && matchAcao;
    });
  }, [logs, filtroTexto, filtroTabela, filtroAcao]);

  if (carregando) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}><div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%' }} /></div>;

  if (user?.perfil !== 'GESTOR_GERAL') {
    return (
      <div style={{ minHeight: '50vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: spaceRem(2), textAlign: 'center' }}>
        <ShieldAlert size={48} style={{ color: 'var(--color-danger)' }} />
        <h2 style={{ margin: 0 }}>Acesso restrito</h2>
        <p style={{ margin: 0, color: 'var(--color-fg-muted)', maxWidth: 480 }}>O log interno de auditoria é completo e consultável apenas pelo perfil Gestor Geral (RNF03).</p>
      </div>
    );
  }

  const tabelas = Object.entries(TABELAS_AUDITADAS).map(([value, rotulo]) => ({ value, label: rotulo as string }));
  const acoes = Object.entries(ACAO_LOG_ROTULO).map(([value, rotulo]) => ({ value, label: rotulo as string }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spaceRem(3) }}>
      <PageHeader
        eyebrow="Conformidade"
        titulo="Auditoria"
        subtitulo={`${logs.length} registros no log interno`}
      />

      <Card style={{ border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader title="Filtros" />
        <CardContent style={{ display: 'flex', flexWrap: 'wrap', gap: spaceRem(3), alignItems: 'flex-end', borderBottom: '2px solid var(--color-border)', paddingBottom: spaceRem(2), marginBottom: spaceRem(2) }}>
          <Input placeholder="Buscar (usuário, registro, motivo...)" value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} leftIcon={<Search size={16} />} style={{ minWidth: 280 }} />
          <Select label="Tabela" value={filtroTabela} onChange={(e) => setFiltroTabela(e.target.value)} options={[{ value: 'todas', label: 'Todas' }, ...tabelas]} />
          <Select label="Ação" value={filtroAcao} onChange={(e) => setFiltroAcao(e.target.value)} options={[{ value: 'todas', label: 'Todas' }, ...acoes]} />
        </CardContent>
      </Card>

      <Card style={{ border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <CardContent style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-xs)' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-section)', borderBottom: '1px solid var(--color-border)' }}>
                {['Data/Hora', 'Usuário', 'Perfil', 'Tabela', 'Registro', 'Ação', 'Motivo', 'Detalhes'].map((c) => (
                  <th key={c} style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--color-fg-light)', textTransform: 'uppercase', fontSize: '10.5px', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dadosFiltrados.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-fg-muted)' }}>Nenhum registro de auditoria encontrado</td></tr>
              ) : (
                dadosFiltrados.slice(0, 500).map((l) => (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>{formatarDataHoraBR(l.timestamp)}</td>
                    <td style={{ padding: '8px 10px' }}>{l.usuarioNome}</td>
                    <td style={{ padding: '8px 10px' }}><Badge variant="outline" size="sm">{l.usuarioPerfil}</Badge></td>
                    <td style={{ padding: '8px 10px' }}>{TABELAS_AUDITADAS[l.tabela as keyof typeof TABELAS_AUDITADAS] ?? l.tabela}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)' }}>{l.registroId}</td>
                    <td style={{ padding: '8px 10px' }}><Badge variant="accent" size="sm">{ACAO_LOG_ROTULO[l.acao as keyof typeof ACAO_LOG_ROTULO] ?? l.acao}</Badge></td>
                    <td style={{ padding: '8px 10px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.motivo ?? '—'}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <Button variant="ghost" size="sm" onClick={() => setVisualizando(l)}><ChevronDown size={14} /></Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {visualizando && (
        <div className="overlay-modal" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: spaceRem(3) }} onClick={() => setVisualizando(null)}>
          <div style={{ background: 'var(--color-bg-elevated)', border: '2px solid var(--color-accent)', borderRadius: '0', width: '100%', maxWidth: '720px', maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow-md)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: spaceRem(3), borderBottom: '2px solid var(--color-border)' }}>
              <h2 style={{ margin: 0 }}>Detalhes do Registro</h2>
              <Button variant="ghost" size="sm" onClick={() => setVisualizando(null)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-label="Fechar"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></Button>
            </div>
            <div style={{ padding: spaceRem(3), display: 'flex', flexDirection: 'column', gap: spaceRem(2) }}>
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}><strong>Data/Hora:</strong> {formatarDataHoraBR(visualizando.timestamp)}</p>
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}><strong>Usuário:</strong> {visualizando.usuarioNome} ({visualizando.usuarioPerfil})</p>
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}><strong>Tabela:</strong> {visualizando.tabela} — <strong>Registro:</strong> {visualizando.registroId}</p>
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}><strong>Ação:</strong> {ACAO_LOG_ROTULO[visualizando.acao as keyof typeof ACAO_LOG_ROTULO] ?? visualizando.acao}</p>
              {visualizando.motivo && <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}><strong>Motivo:</strong> {visualizando.motivo}</p>}
              <div>
                <strong style={{ fontSize: 'var(--font-size-sm)' }}>Dados Anteriores:</strong>
                <pre style={{ margin: '8px 0 0', padding: '10px 12px', backgroundColor: 'var(--color-bg-section)', border: '2px solid var(--color-border)', borderRadius: '0', fontSize: 'var(--font-size-xs)', overflow: 'auto' }}>{JSON.stringify(visualizando.dadosAnteriores, null, 2) ?? 'null'}</pre>
              </div>
              <div>
                <strong style={{ fontSize: 'var(--font-size-sm)' }}>Dados Novos:</strong>
                <pre style={{ margin: '8px 0 0', padding: '10px 12px', backgroundColor: 'var(--color-bg-section)', border: '2px solid var(--color-border)', borderRadius: '0', fontSize: 'var(--font-size-xs)', overflow: 'auto' }}>{JSON.stringify(visualizando.dadosNovos, null, 2) ?? 'null'}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
