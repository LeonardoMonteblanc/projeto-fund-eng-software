/**
 * AgendaPage — Agenda mensal de eventos programados (RF13, calendário centralizado).
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from '@/features/auth/store';
import { getDB } from '@/shared/db';
import { ehGlobal } from '@/features/auth/permissions';
import { TIPO_EVENTO_ROTULO, SITUACAO_EVENTO_ROTULO } from '@/shared/constants';
import type { Laboratorio } from '@/shared/domain';
import { Card, CardHeader, CardContent, Badge, StatusBadge, Button, Select, spaceRem, PageHeader } from '@/shared/ui/components';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function AgendaPage() {
  const user = useUser();
  const global = ehGlobal(user);
  const labIdUsuario = user?.laboratorioId ?? null;

  const [labs, setLabs] = useState<Laboratorio[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mesAtual, setMesAtual] = useState(() => { const h = new Date(); return new Date(h.getFullYear(), h.getMonth(), 1); });
  const [filtroLab, setFiltroLab] = useState<string>('todos');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const db = await getDB();
      const [lss, evs, eqs] = await Promise.all([db.getAll('labs'), db.getAll('eventos'), db.getAll('equipamentos')]);
      setLabs(lss);
      const enriquecidos = (evs as any[]).map((ev) => {
        const eq = (eqs as any[]).find((e) => e.id === ev.equipamentoId);
        return { ...ev, equipamento: eq, laboratorio: eq ? (lss as any[]).find((l) => l.id === eq.laboratorioId) : undefined };
      });
      setEventos(enriquecidos);
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const labsVisiveis = useMemo(() => (global ? labs : labs.filter((l) => l.id === labIdUsuario)), [labs, global, labIdUsuario]);

  const eventosVisiveis = useMemo(() => {
    return eventos.filter((ev) => {
      const matchLab = filtroLab === 'todos' || ev.equipamento?.laboratorioId === filtroLab;
      const matchTipo = filtroTipo === 'todos' || ev.tipo === filtroTipo;
      const noEscopo = global || ev.equipamento?.laboratorioId === labIdUsuario;
      return matchLab && matchTipo && noEscopo;
    });
  }, [eventos, filtroLab, filtroTipo, global, labIdUsuario]);

  const diasDoMes = useMemo(() => {
    const ano = mesAtual.getFullYear();
    const mes = mesAtual.getMonth();
    const primeiroDia = new Date(ano, mes, 1).getDay();
    const totalDias = new Date(ano, mes + 1, 0).getDate();
    const celulas: Array<string | null> = [];
    for (let i = 0; i < primeiroDia; i++) celulas.push(null);
    for (let d = 1; d <= totalDias; d++) celulas.push(`${ano}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    while (celulas.length % 7 !== 0) celulas.push(null);
    return celulas;
  }, [mesAtual]);

  const eventosPorDia = useMemo(() => {
    const mapa: Record<string, any[]> = {};
    eventosVisiveis.forEach((ev) => {
      const data = ev.dataPrevista ?? ev.dataRealizacao;
      if (!data) return;
      (mapa[data] ??= []).push(ev);
    });
    return mapa;
  }, [eventosVisiveis]);

  const eventosDiaSelecionado = diaSelecionado ? (eventosPorDia[diaSelecionado] ?? []) : [];

  const mudarMes = (delta: number) => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + delta, 1));

  if (carregando) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}><div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%' }} /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spaceRem(3) }}>
      <PageHeader
        eyebrow="Operação"
        titulo="Agenda"
        subtitulo="Eventos programados por período, laboratório e tipo"
      />

      <Card style={{ border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader title="Filtros" />
        <CardContent style={{ display: 'flex', flexWrap: 'wrap', gap: spaceRem(3), alignItems: 'flex-end', borderBottom: '1px solid var(--color-border)', paddingBottom: spaceRem(2), marginBottom: spaceRem(2) }}>
          {global && <Select label="Laboratório" value={filtroLab} onChange={(e) => setFiltroLab(e.target.value)} options={[{ value: 'todos', label: 'Todos' }, ...labsVisiveis.map((l) => ({ value: l.id, label: `${l.sigla} — ${l.nome}` }))]} />}
          <Select label="Tipo de Evento" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} options={[{ value: 'todos', label: 'Todos' }, { value: 'CALIBRACAO', label: 'Calibração' }, { value: 'VERIFICACAO', label: 'Verificação' }, { value: 'MANUTENCAO_PREVENTIVA', label: 'Manutenção Preventiva' }, { value: 'MANUTENCAO_CORRETIVA', label: 'Manutenção Corretiva' }, { value: 'DIVERGENCIA_INVENTARIO', label: 'Divergência de Inventário' }]} />
        </CardContent>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: spaceRem(3), alignItems: 'start' }}>
        <Card style={{ border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
          <CardContent>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spaceRem(2) }}>
              <Button variant="ghost" size="sm" onClick={() => mudarMes(-1)}><ChevronLeft size={18} /></Button>
              <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>
                {MESES[mesAtual.getMonth()]} {mesAtual.getFullYear()}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => mudarMes(1)}><ChevronRight size={18} /></Button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {DIAS_SEMANA.map((d) => (
                <div key={d} style={{ padding: '6px', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-fg-muted)' }}>{d}</div>
              ))}
              {diasDoMes.map((data, i) => {
                if (!data) return <div key={i} style={{ minHeight: 76, backgroundColor: 'var(--color-bg-section)', borderRadius: '6px' }} />;
                const evs = eventosPorDia[data] ?? [];
                const selecionado = diaSelecionado === data;
                return (
                  <button key={i} onClick={() => setDiaSelecionado(selecionado ? null : data)} style={{
                    minHeight: 76, padding: '4px', border: selecionado ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                    borderRadius: '6px', background: selecionado ? 'var(--color-accent-bg)' : 'var(--color-bg)', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '2px', textAlign: 'left', overflow: 'hidden',
                  }}>
                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>{Number(data.split('-')[2])}</span>
                    {evs.slice(0, 2).map((ev) => (
                      <span key={ev.id} title={TIPO_EVENTO_ROTULO[ev.tipo as keyof typeof TIPO_EVENTO_ROTULO] ?? ev.tipo} style={{
                        fontSize: '9px', padding: '1px 4px', borderRadius: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        backgroundColor: ev.situacao === 'REALIZADO' ? 'var(--color-sucesso-bg)' : 'var(--color-info-bg)',
                        color: ev.situacao === 'REALIZADO' ? 'var(--color-sucesso)' : 'var(--color-info)',
                      }}>
                        {ev.equipamento?.tag ?? '—'}
                      </span>
                    ))}
                    {evs.length > 2 && <span style={{ fontSize: '9px', color: 'var(--color-fg-muted)' }}>+{evs.length - 2}</span>}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card style={{ border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
          <CardHeader title="Eventos do Dia" subtitle={diaSelecionado ?? 'Selecione um dia no calendário'} />
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spaceRem(2), maxHeight: 480, overflow: 'auto' }}>
            {eventosDiaSelecionado.length === 0 && <p style={{ margin: 0, color: 'var(--color-fg-muted)', fontSize: 'var(--font-size-sm)' }}>{diaSelecionado ? 'Nenhum evento neste dia.' : '—'}</p>}
            {eventosDiaSelecionado.map((ev) => (
              <div key={ev.id} style={{ padding: spaceRem(2), border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                  <Badge variant="accent" size="sm">{TIPO_EVENTO_ROTULO[ev.tipo as keyof typeof TIPO_EVENTO_ROTULO] ?? ev.tipo}</Badge>
                  <StatusBadge status={ev.situacao} size="sm" />
                </div>
                <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>
                  <strong>{ev.equipamento?.tag}</strong> ({ev.equipamento?.patrimonio}) — {ev.laboratorio?.sigla ?? '—'}
                </p>
                {ev.descricao && <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>{ev.descricao}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
