/**
 * SolicitacoesPage — Solicitar e avaliar eventos (RF12).
 * Ao aprovar, gera o evento correspondente (AGENDADO) no equipamento.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFuncionalidades, useUser, useLabId } from '@/features/auth/store';
import { getDB } from '@/shared/db';
import { ehGlobal } from '@/features/auth/permissions';
import { SITUACOES_SOLICITACAO, SITUACAO_SOLICITACAO_ROTULO, TIPO_EVENTO_ROTULO } from '@/shared/constants';
import type { Solicitacao, Equipamento, Usuario, Laboratorio } from '@/shared/domain';
import { Card, CardHeader, CardContent, StatusBadge, Button, Input, Select, spaceRem, PageHeader } from '@/shared/ui/components';
import { formatarDataBR, formatarDataHoraBR, gerarULID, agoraISO, hojeISO } from '@/shared/utils';
import { registrarLog } from '@/shared/audit';
import { Search, Plus, ChevronDown, Check, X, FileText } from 'lucide-react';

type SolicitacaoCompleta = Solicitacao & {
  equipamento?: any;
  solicitante?: Usuario;
  laboratorio?: Laboratorio;
};

const TIPOS_SOLICITAVEIS = ['CALIBRACAO', 'VERIFICACAO', 'MANUTENCAO_PREVENTIVA', 'MANUTENCAO_CORRETIVA'] as const;

export function SolicitacoesPage() {
  const user = useUser();
  const labId = useLabId();
  const global = ehGlobal(user);
  const funcionalidades = useFuncionalidades();
  const podeCriar = funcionalidades.some((f) => f.acessivel && f.codigo === 'F05');
  const podeAprovar = podeCriar && (user?.perfil === 'GESTOR_LAB' || user?.perfil === 'GESTOR_GERAL');

  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoCompleta[]>([]);
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [labs, setLabs] = useState<Laboratorio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState<string>('todas');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [rejeitando, setRejeitando] = useState<SolicitacaoCompleta | null>(null);
  const [justificativaRejeicao, setJustificativaRejeicao] = useState('');
  const [form, setForm] = useState({ equipamentoId: '', tipoEvento: 'CALIBRACAO', justificativa: '', dataDesejada: '' });

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const db = await getDB();
      const [sols, eqs, lss] = await Promise.all([db.getAll('solicitacoes'), db.getAll('equipamentos'), db.getAll('labs')]);
      const [users, its] = await Promise.all([db.getAll('users'), db.getAll('itens')]);
      setLabs(lss);
      const eqsEnriquecidos = eqs.map((e: any) => ({ ...e, item: its.find((i: any) => i.id === e.itemId) }));
      const eqsFiltrados = global ? eqsEnriquecidos : eqsEnriquecidos.filter((e: any) => e.laboratorioId === labId);
      setEquipamentos(eqsFiltrados);
      const completas: SolicitacaoCompleta[] = sols.map((s: any) => {
        const equipamento = eqsEnriquecidos.find((e: any) => e.id === s.equipamentoId);
        return {
          ...s,
          equipamento,
          solicitante: users.find((u: any) => u.id === s.solicitanteId),
          laboratorio: lss.find((l: any) => l.id === equipamento?.laboratorioId),
        };
      });
      setSolicitacoes(global ? completas : completas.filter((s) => s.equipamento?.laboratorioId === labId));
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  }, [global, labId]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.equipamentoId || !form.tipoEvento || !form.justificativa) return;
    setSalvando(true);
    try {
      const db = await getDB();
      const agora = agoraISO();
      const solicitacao: any = {
        id: gerarULID(), equipamentoId: form.equipamentoId, tipoEvento: form.tipoEvento,
        solicitanteId: user?.id, justificativa: form.justificativa,
        dataDesejada: form.dataDesejada || null,
        situacao: 'PENDENTE', avaliadorId: null, dataAvaliacao: null,
        justificativaAvaliacao: undefined, eventoGeradoId: null,
        criadoEm: agora,
      };
      await db.put('solicitacoes', solicitacao);
      await registrarLog(db, { tabela: 'solicitacoes', registroId: solicitacao.id, acao: 'CRIAR', dadosNovos: solicitacao });
      setModalAberto(false);
      setForm({ equipamentoId: '', tipoEvento: 'CALIBRACAO', justificativa: '', dataDesejada: '' });
      await carregarDados();
    } catch (e) {
      console.error(e);
    } finally {
      setSalvando(false);
    }
  }, [form, user, carregarDados]);

  const avaliar = useCallback(async (sol: SolicitacaoCompleta, decisao: 'APROVADA' | 'REJEITADA', justificativaAvaliacao?: string) => {
    setSalvando(true);
    try {
      const db = await getDB();
      const agora = agoraISO();
      let eventoGeradoId: string | null = sol.eventoGeradoId ?? null;
      if (decisao === 'APROVADA') {
        eventoGeradoId = gerarULID();
        const evento: any = {
          id: eventoGeradoId, tipo: sol.tipoEvento, equipamentoId: sol.equipamentoId,
          fornecedorId: null, responsavelId: user?.id ?? sol.solicitanteId,
          situacao: 'AGENDADO', dataPrevista: sol.dataDesejada ?? hojeISO(), dataRealizacao: null,
          descricao: `Evento originado da solicitação ${sol.id}.`,
          observacoes: sol.justificativa, custoEstimadoCentavos: null, custoRealizadoCentavos: null,
          numeroCertificado: null, erro: null, incerteza: null, caUtilizado: null, resultado: null,
          problema: null, servico: null, estadoRetorno: null,
          solicitacaoOrigemId: sol.id, criadoEm: agora,
        };
        await db.put('eventos', evento);
        await registrarLog(db, { tabela: 'eventos', registroId: eventoGeradoId, acao: 'CRIAR', dadosNovos: evento });
      }
      await db.put('solicitacoes', {
        ...sol,
        situacao: decisao,
        avaliadorId: user?.id ?? null,
        dataAvaliacao: agora,
        justificativaAvaliacao,
        eventoGeradoId,
        atualizadoEm: agora,
      });
      await registrarLog(db, {
        tabela: 'solicitacoes', registroId: sol.id, acao: decisao === 'APROVADA' ? 'APROVAR' : 'REJEITAR',
        dadosAnteriores: sol as any, dadosNovos: { situacao: decisao, eventoGeradoId }, motivo: justificativaAvaliacao,
      });
      await carregarDados();
    } catch (e) {
      console.error(e);
    } finally {
      setSalvando(false);
    }
  }, [user, carregarDados]);

  const dadosFiltrados = useMemo(() => {
    return solicitacoes.filter((s) => {
      const matchTexto = !filtroTexto ||
        (s.equipamento?.tag ?? '').toLowerCase().includes(filtroTexto.toLowerCase()) ||
        (s.equipamento?.patrimonio ?? '').toLowerCase().includes(filtroTexto.toLowerCase()) ||
        (s.justificativa ?? '').toLowerCase().includes(filtroTexto.toLowerCase());
      const matchSit = filtroSituacao === 'todas' || s.situacao === filtroSituacao;
      const matchTipo = filtroTipo === 'todos' || s.tipoEvento === filtroTipo;
      return matchTexto && matchSit && matchTipo;
    });
  }, [solicitacoes, filtroTexto, filtroSituacao, filtroTipo]);

  if (carregando) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}><div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%' }} /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spaceRem(3) }}>
      <PageHeader
        eyebrow="Fluxo de aprovação"
        titulo="Solicitações"
        subtitulo={`${dadosFiltrados.length} solicitações — ${solicitacoes.filter((s) => s.situacao === 'PENDENTE').length} pendentes`}
        acoes={<>{podeCriar && <Button onClick={() => setModalAberto(true)} leftIcon={<Plus size={16} />}>Nova Solicitação</Button>}</>}
      />

      <Card style={{ border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader title="Filtros" />
        <CardContent style={{ display: 'flex', flexWrap: 'wrap', gap: spaceRem(3), alignItems: 'flex-end', borderBottom: '2px solid var(--color-border)', paddingBottom: spaceRem(2), marginBottom: spaceRem(2) }}>
          <Input placeholder="Buscar (TAG, patrimônio, justificativa...)" value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} leftIcon={<Search size={16} />} style={{ minWidth: 280 }} />
          <Select label="Situação" value={filtroSituacao} onChange={(e) => setFiltroSituacao(e.target.value)} options={[{ value: 'todas', label: 'Todas' }, ...Object.values(SITUACOES_SOLICITACAO).map((s) => ({ value: s, label: SITUACAO_SOLICITACAO_ROTULO[s] }))]} />
          <Select label="Tipo de Evento" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} options={[{ value: 'todos', label: 'Todos' }, ...TIPOS_SOLICITAVEIS.map((t) => ({ value: t, label: TIPO_EVENTO_ROTULO[t] }))]} />
        </CardContent>
      </Card>

      <Card style={{ border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <CardContent>
          {dadosFiltrados.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--color-fg-muted)', padding: '40px' }}>Nenhuma solicitação encontrada</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spaceRem(2) }}>
              {dadosFiltrados.map((s) => (
                <div key={s.id} style={{ padding: spaceRem(2), border: '2px solid var(--color-border)', borderRadius: '0', background: 'var(--color-bg)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: spaceRem(2) }}>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <StatusBadge status={s.situacao} size="sm" />
                      <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{TIPO_EVENTO_ROTULO[s.tipoEvento as keyof typeof TIPO_EVENTO_ROTULO] ?? s.tipoEvento}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>
                      <strong>{s.equipamento?.tag}</strong> ({s.equipamento?.patrimonio}) • {s.equipamento?.item?.nome ?? ''} • {s.laboratorio?.sigla ?? '—'}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>{s.justificativa}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-dim)' }}>
                      Solicitante: {s.solicitante?.nome ?? '—'} • Data desejada: {s.dataDesejada ? formatarDataBR(s.dataDesejada) : '—'} • Criada em {formatarDataHoraBR(s.criadoEm)}
                      {s.dataAvaliacao && <> • Avaliada em {formatarDataHoraBR(s.dataAvaliacao)}</>}
                      {s.justificativaAvaliacao && <> • Justificativa: {s.justificativaAvaliacao}</>}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {s.eventoGeradoId && <Button variant="ghost" size="sm" leftIcon={<FileText size={14} />} title="Evento gerado">Evento gerado</Button>}
                      {podeAprovar && s.situacao === 'PENDENTE' && (
                        <>
                          <Button size="sm" leftIcon={<Check size={14} />} loading={salvando} onClick={() => avaliar(s, 'APROVADA')}>Aprovar</Button>
                          <Button variant="danger" size="sm" leftIcon={<X size={14} />} loading={salvando} onClick={() => { setRejeitando(s); setJustificativaRejeicao(''); }}>Rejeitar</Button>
                        </>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {modalAberto && (
        <div className="overlay-modal" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: spaceRem(3) }} onClick={() => setModalAberto(false)}>
          <div style={{ background: 'var(--color-bg-elevated)', border: '2px solid var(--color-accent)', borderRadius: '0', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow-md)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: spaceRem(3), borderBottom: '2px solid var(--color-border)' }}>
              <h2 style={{ margin: 0 }}>Nova Solicitação de Evento</h2>
              <Button variant="ghost" size="sm" onClick={() => setModalAberto(false)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-label="Fechar"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></Button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: spaceRem(3), display: 'flex', flexDirection: 'column', gap: spaceRem(3) }}>
              <Select label="Equipamento" value={form.equipamentoId} onChange={(e) => setForm({ ...form, equipamentoId: e.target.value })} required fullWidth
                options={equipamentos.map((e) => ({ value: e.id, label: `${e.tag} — ${e.patrimonio} (${e.item?.nome ?? ''})` }))} />
              <Select label="Tipo de Evento" value={form.tipoEvento} onChange={(e) => setForm({ ...form, tipoEvento: e.target.value })} fullWidth
                options={TIPOS_SOLICITAVEIS.map((t) => ({ value: t, label: TIPO_EVENTO_ROTULO[t] }))} />
              <Input label="Data Desejada" type="date" value={form.dataDesejada} onChange={(e) => setForm({ ...form, dataDesejada: e.target.value })} fullWidth />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label htmlFor="solicitacao-justificativa" style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--color-fg-light)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Justificativa *</label>
                <textarea id="solicitacao-justificativa" value={form.justificativa} onChange={(e) => setForm({ ...form, justificativa: e.target.value })} rows={4} required style={{ width: '100%', padding: '10px 12px', fontSize: 'var(--font-size-base)', border: '2px solid var(--color-border-input)', borderRadius: '0', background: 'var(--color-bg)', color: 'var(--color-fg)', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spaceRem(2), paddingTop: spaceRem(3), borderTop: '2px solid var(--color-border)' }}>
                <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
                <Button type="submit" loading={salvando}>Enviar Solicitação</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {rejeitando && (
        <div className="overlay-modal" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: spaceRem(3) }} onClick={() => setRejeitando(null)}>
          <div style={{ background: 'var(--color-bg-elevated)', border: '2px solid var(--color-accent)', borderRadius: '0', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow-md)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: spaceRem(3), borderBottom: '2px solid var(--color-border)' }}>
              <h2 style={{ margin: 0 }}>Rejeitar Solicitação</h2>
              <Button variant="ghost" size="sm" onClick={() => setRejeitando(null)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-label="Fechar"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></Button>
            </div>
            <div style={{ padding: spaceRem(3), display: 'flex', flexDirection: 'column', gap: spaceRem(3) }}>
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>
                Solicitação de <strong>{TIPO_EVENTO_ROTULO[rejeitando.tipoEvento as keyof typeof TIPO_EVENTO_ROTULO] ?? rejeitando.tipoEvento}</strong> para <strong>{rejeitando.equipamento?.tag}</strong> ({rejeitando.equipamento?.patrimonio}).
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label htmlFor="rejeicao-justificativa" style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--color-fg-light)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Justificativa da rejeição *</label>
                <textarea id="rejeicao-justificativa" value={justificativaRejeicao} onChange={(e) => setJustificativaRejeicao(e.target.value)} rows={4} required style={{ width: '100%', padding: '10px 12px', fontSize: 'var(--font-size-base)', border: '2px solid var(--color-border-input)', borderRadius: '0', background: 'var(--color-bg)', color: 'var(--color-fg)', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spaceRem(2), paddingTop: spaceRem(3), borderTop: '2px solid var(--color-border)' }}>
                <Button variant="outline" onClick={() => setRejeitando(null)}>Cancelar</Button>
                <Button variant="danger" loading={salvando} disabled={!justificativaRejeicao.trim()} onClick={async () => { await avaliar(rejeitando, 'REJEITADA', justificativaRejeicao.trim()); setRejeitando(null); }}>Confirmar Rejeição</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
