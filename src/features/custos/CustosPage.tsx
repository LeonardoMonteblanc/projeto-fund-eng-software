/**
 * CustosPage — Indicadores de custos e receitas por laboratório (RF15).
 * Custos de calibração, verificação e manutenção (custoRealizado por dataRealizacao)
 * cruzados com a receita mensal do laboratório.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from '@/features/auth/store';
import { getDB } from '@/shared/db';
import { ehGlobal } from '@/features/auth/permissions';
import { TIPO_EVENTO_ROTULO } from '@/shared/constants';
import type { Laboratorio } from '@/shared/domain';
import { Card, CardHeader, CardContent, Badge, Button, Select, Input, spaceRem, PageHeader } from '@/shared/ui/components';
import { centavosParaReais, formatarDataBR } from '@/shared/utils';
import { baixarCSV } from '@/shared/exportar';
import { TrendingUp, Download, Wallet } from 'lucide-react';

interface LinhaCusto {
  laboratorioId: string;
  sigla: string;
  nome: string;
  calibracao: number;
  verificacao: number;
  manutencaoPreventiva: number;
  manutencaoCorretiva: number;
  total: number;
  receitaMensal: number;
  percentual: number | null;
}

export function CustosPage() {
  const user = useUser();
  const global = ehGlobal(user);
  const labIdUsuario = user?.laboratorioId ?? null;

  const [labs, setLabs] = useState<Laboratorio[]>([]);
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [periodo, setPeriodo] = useState<string>('ano');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroLab, setFiltroLab] = useState<string>('todos');

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const db = await getDB();
      const [lss, eqs, evs] = await Promise.all([db.getAll('labs'), db.getAll('equipamentos'), db.getAll('eventos')]);
      setLabs(lss);
      setEquipamentos(eqs);
      setEventos(evs);
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const intervalo = useMemo(() => {
    const hoje = new Date();
    let inicio = '';
    if (periodo === 'mes') { inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]!; }
    else if (periodo === 'trimestre') { const mesInicial = Math.floor(hoje.getMonth() / 3) * 3; inicio = new Date(hoje.getFullYear(), mesInicial, 1).toISOString().split('T')[0]!; }
    else if (periodo === 'ano') { inicio = new Date(hoje.getFullYear(), 0, 1).toISOString().split('T')[0]!; }
    else if (periodo === 'personalizado') { inicio = dataInicio; }
    const fim = periodo === 'personalizado' ? dataFim : hoje.toISOString().split('T')[0]!;
    return { inicio, fim };
  }, [periodo, dataInicio, dataFim]);

  const labsVisiveis = useMemo(() => (global ? labs : labs.filter((l) => l.id === labIdUsuario)), [labs, global, labIdUsuario]);

  const linhas: LinhaCusto[] = useMemo(() => {
    return labsVisiveis
      .filter((l) => filtroLab === 'todos' || l.id === filtroLab)
      .map((l) => {
        const eqsLab = equipamentos.filter((e) => e.laboratorioId === l.id);
        const eqIds = new Set(eqsLab.map((e) => e.id));
        const evsLab = eventos.filter((ev) => eqIds.has(ev.equipamentoId) && ev.situacao === 'REALIZADO' && ev.dataRealizacao && (!intervalo.inicio || ev.dataRealizacao >= intervalo.inicio) && (!intervalo.fim || ev.dataRealizacao <= intervalo.fim));
        const soma = (tipo: string) => evsLab.filter((ev) => ev.tipo === tipo).reduce((acc, ev) => acc + (ev.custoRealizadoCentavos ?? 0), 0);
        const calibracao = soma('CALIBRACAO');
        const verificacao = soma('VERIFICACAO');
        const manutencaoPreventiva = soma('MANUTENCAO_PREVENTIVA');
        const manutencaoCorretiva = soma('MANUTENCAO_CORRETIVA');
        const total = calibracao + verificacao + manutencaoPreventiva + manutencaoCorretiva;
        const receitaMensal = l.receitaMensalCentavos ?? 0;
        return {
          laboratorioId: l.id, sigla: l.sigla, nome: l.nome,
          calibracao, verificacao, manutencaoPreventiva, manutencaoCorretiva, total,
          receitaMensal,
          percentual: receitaMensal > 0 ? Math.round((total / receitaMensal) * 1000) / 10 : null,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [labsVisiveis, equipamentos, eventos, intervalo, filtroLab]);

  const totais = useMemo(() => ({
    calibracao: linhas.reduce((acc, l) => acc + l.calibracao, 0),
    verificacao: linhas.reduce((acc, l) => acc + l.verificacao, 0),
    manutencaoPreventiva: linhas.reduce((acc, l) => acc + l.manutencaoPreventiva, 0),
    manutencaoCorretiva: linhas.reduce((acc, l) => acc + l.manutencaoCorretiva, 0),
    total: linhas.reduce((acc, l) => acc + l.total, 0),
    receita: linhas.reduce((acc, l) => acc + l.receitaMensal, 0),
  }), [linhas]);

  const linhasCSV = useMemo(() => linhas.map((l) => ({
    'Laboratório': l.sigla,
    'Calibração': centavosParaReais(l.calibracao),
    'Verificação': centavosParaReais(l.verificacao),
    'Manutenção Preventiva': centavosParaReais(l.manutencaoPreventiva),
    'Manutenção Corretiva': centavosParaReais(l.manutencaoCorretiva),
    'Total': centavosParaReais(l.total),
    'Receita Mensal': centavosParaReais(l.receitaMensal),
    '% da Receita': l.percentual !== null ? `${l.percentual}%` : '—',
  })), [linhas]);

  const maxTotal = Math.max(1, ...linhas.map((l) => l.total));

  if (carregando) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}><div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%' }} /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spaceRem(3) }}>
      <PageHeader
        eyebrow="Gestão"
        titulo="Indicadores de Custos"
        subtitulo="Custos realizados por laboratório e tipo de evento × receita mensal"
        acoes={<Button variant="secondary" leftIcon={<Download size={16} />} onClick={() => baixarCSV('labucs-indicadores-custos.csv', linhasCSV)}>Exportar CSV</Button>}
      />

      <Card style={{ border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader title="Período" />
        <CardContent style={{ display: 'flex', flexWrap: 'wrap', gap: spaceRem(3), alignItems: 'flex-end', borderBottom: '2px solid var(--color-border)', paddingBottom: spaceRem(2), marginBottom: spaceRem(2) }}>
          <Select label="Período" value={periodo} onChange={(e) => setPeriodo(e.target.value)} options={[{ value: 'mes', label: 'Este Mês' }, { value: 'trimestre', label: 'Este Trimestre' }, { value: 'ano', label: 'Este Ano' }, { value: 'personalizado', label: 'Personalizado' }]} />
          {periodo === 'personalizado' && (
            <>
              <Input label="Data Início" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
              <Input label="Data Fim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </>
          )}
          {global && <Select label="Laboratório" value={filtroLab} onChange={(e) => setFiltroLab(e.target.value)} options={[{ value: 'todos', label: 'Todos' }, ...labsVisiveis.map((l) => ({ value: l.id, label: `${l.sigla} — ${l.nome}` }))]} />}
        </CardContent>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: spaceRem(2) }}>
        <div style={{ padding: spaceRem(2), border: '2px solid var(--color-border)', borderRadius: '0', background: 'var(--color-bg)' }}>
          <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Custo Total no Período</p>
          <p style={{ margin: '8px 0 0', fontSize: 'var(--font-size-2xl)', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-danger)' }}>{centavosParaReais(totais.total)}</p>
        </div>
        <div style={{ padding: spaceRem(2), border: '2px solid var(--color-border)', borderRadius: '0', background: 'var(--color-bg)' }}>
          <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Calibrações</p>
          <p style={{ margin: '8px 0 0', fontSize: 'var(--font-size-2xl)', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{centavosParaReais(totais.calibracao)}</p>
        </div>
        <div style={{ padding: spaceRem(2), border: '2px solid var(--color-border)', borderRadius: '0', background: 'var(--color-bg)' }}>
          <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verificações</p>
          <p style={{ margin: '8px 0 0', fontSize: 'var(--font-size-2xl)', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{centavosParaReais(totais.verificacao)}</p>
        </div>
        <div style={{ padding: spaceRem(2), border: '2px solid var(--color-border)', borderRadius: '0', background: 'var(--color-bg)' }}>
          <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Manutenções (Prev. + Corr.)</p>
          <p style={{ margin: '8px 0 0', fontSize: 'var(--font-size-2xl)', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{centavosParaReais(totais.manutencaoPreventiva + totais.manutencaoCorretiva)}</p>
        </div>
        <div style={{ padding: spaceRem(2), border: '2px solid var(--color-border)', borderRadius: '0', background: 'var(--color-bg)' }}>
          <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Receita Mensal (soma dos labs)</p>
          <p style={{ margin: '8px 0 0', fontSize: 'var(--font-size-2xl)', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-sucesso)' }}>{centavosParaReais(totais.receita)}</p>
        </div>
      </div>

      <Card style={{ border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader title="Custos por Laboratório" subtitle={`Custo realizado vs receita mensal (${linhas.length} laboratórios)`} />
        <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spaceRem(2) }}>
          {linhas.length === 0 && <p style={{ textAlign: 'center', color: 'var(--color-fg-muted)', padding: '40px' }}>Nenhum dado no período selecionado</p>}
          {linhas.map((l) => (
            <div key={l.laboratorioId} style={{ padding: spaceRem(2), border: '2px solid var(--color-border)', borderRadius: '0', background: 'var(--color-bg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                <div>
                  <strong style={{ fontSize: 'var(--font-size-sm)' }}>{l.sigla}</strong>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)', marginLeft: '8px' }}>{l.nome}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Custo: {centavosParaReais(l.total)}</span>
                  <span style={{ color: 'var(--color-sucesso)', fontWeight: 600 }}>Receita: {centavosParaReais(l.receitaMensal)}</span>
                  {l.percentual !== null && <Badge variant={l.percentual > 20 ? 'danger' : l.percentual > 10 ? 'warning' : 'success'} size="sm">{l.percentual}% da receita</Badge>}
                </div>
              </div>
              <div style={{ height: '14px', backgroundColor: 'var(--color-bg-section)', borderRadius: '0', overflow: 'hidden', position: 'relative' }}>
                <div style={{ height: '100%', width: `${Math.max(1, Math.round((l.total / maxTotal) * 100))}%`, backgroundColor: 'var(--color-accent)', borderRadius: '0' }} />
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
                <span>Calibração: {centavosParaReais(l.calibracao)}</span>
                <span>Verificação: {centavosParaReais(l.verificacao)}</span>
                <span>Prev.: {centavosParaReais(l.manutencaoPreventiva)}</span>
                <span>Corr.: {centavosParaReais(l.manutencaoCorretiva)}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
