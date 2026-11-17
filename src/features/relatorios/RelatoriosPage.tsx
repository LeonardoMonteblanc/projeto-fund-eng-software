/**
 * RelatoriosPage — Relatórios operacionais e gerenciais (RF05, RF14).
 * Inventário, situação dos equipamentos e histórico de eventos com exportação CSV/XLSX/PDF.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from '@/features/auth/store';
import { getDB } from '@/shared/db';
import { ehGlobal } from '@/features/auth/permissions';
import { calcularMetricas } from '@/shared/metrology';
import { SITUACAO_EVENTO_ROTULO, TIPO_EVENTO_ROTULO, STATUS_PRAZO_ROTULO } from '@/shared/constants';
import type { Laboratorio } from '@/shared/domain';
import { Card, CardHeader, CardContent, Badge, Button, Input, Select, spaceRem, PageHeader } from '@/shared/ui/components';
import { formatarDataBR, centavosParaReais, hojeISO } from '@/shared/utils';
import { baixarCSV, baixarXLSX, baixarPDF } from '@/shared/exportar';
import { registrarLog } from '@/shared/audit';
import { FileBarChart2, Download } from 'lucide-react';

type TipoRelatorio = 'inventario' | 'situacao' | 'historico';

const TIPOS: Array<{ valor: TipoRelatorio; rotulo: string; descricao: string }> = [
  { valor: 'inventario', rotulo: 'Inventário', descricao: 'Equipamentos ativos por laboratório (RF05).' },
  { valor: 'situacao', rotulo: 'Situação dos Equipamentos', descricao: 'Situação operacional e metrológica de todos os equipamentos.' },
  { valor: 'historico', rotulo: 'Histórico de Eventos', descricao: 'Calibrações, verificações e manutenções por período, laboratório e status (RF14).' },
];

export function RelatoriosPage() {
  const user = useUser();
  const global = ehGlobal(user);
  const labIdUsuario = user?.laboratorioId ?? null;

  const [tipo, setTipo] = useState<TipoRelatorio>('inventario');
  const [labs, setLabs] = useState<Laboratorio[]>([]);
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroLab, setFiltroLab] = useState<string>('todos');
  const [filtroSituacao, setFiltroSituacao] = useState<string>('todas');
  const [filtroTipoEvento, setFiltroTipoEvento] = useState<string>('todos');
  const [filtroStatusEvento, setFiltroStatusEvento] = useState<string>('todas');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const db = await getDB();
      const [lss, eqs, evs, its] = await Promise.all([db.getAll('labs'), db.getAll('equipamentos'), db.getAll('eventos'), db.getAll('itens')]);
      setLabs(lss);
      const hoje = hojeISO();
      const enriquecidos = (eqs as any[]).map((eq) => {
        const item = (its as any[]).find((i) => i.id === eq.itemId);
        const eqEventos = (evs as any[]).filter((e) => e.equipamentoId === eq.id);
        const metricas = calcularMetricas({
          equipamento: eq,
          item: item || { caCalibracao: eq.caCalibracao, caVerificacao: eq.caVerificacao, periodicidadeCalibracaoMeses: eq.periodicidadeCalibracaoMeses, periodicidadeVerificacaoMeses: eq.periodicidadeVerificacaoMeses, periodicidadeManutencaoPreventivaMeses: eq.periodicidadeManutencaoPreventivaMeses },
          eventos: eqEventos,
          hoje,
          diasAlerta: 30,
        });
        return { ...eq, item, laboratorio: (lss as any[]).find((l) => l.id === eq.laboratorioId), ...metricas };
      });
      setEquipamentos(enriquecidos);
      setEventos((evs as any[]).map((ev) => {
        const eq = enriquecidos.find((e) => e.id === ev.equipamentoId);
        return { ...ev, equipamento: eq, laboratorio: eq?.laboratorio, item: eq?.item };
      }));
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
  const equipamentosVisiveis = useMemo(() => (global ? equipamentos : equipamentos.filter((e) => e.laboratorioId === labIdUsuario)), [equipamentos, global, labIdUsuario]);
  const eventosVisiveis = useMemo(() => (global ? eventos : eventos.filter((e) => e.equipamento?.laboratorioId === labIdUsuario)), [eventos, global, labIdUsuario]);

  const linhasInventario = useMemo(() => {
    return equipamentosVisiveis
      .filter((e) => (filtroLab === 'todos' || e.laboratorioId === filtroLab) && e.ativo)
      .map((e) => ({
        'Laboratório': e.laboratorio?.sigla ?? '',
        'Patrimônio': e.patrimonio,
        'TAG': e.tag,
        'Nº Série': e.numeroSerie,
        'Item': e.item?.nome ?? '',
        'Localização': e.localizacao,
        'Situação': e.situacao,
        'Última Calibração': e.ultimaCalibracao?.dataRealizacao ?? '',
        'Próx. Calibração': e.proximaCalibracao ?? '',
        'Dias p/ Vencimento': e.diasParaVencimentoCalibracao ?? '',
      }));
  }, [equipamentosVisiveis, filtroLab]);

  const linhasSituacao = useMemo(() => {
    return equipamentosVisiteisFiltered(equipamentosVisiveis, filtroLab, filtroSituacao).map((e) => ({
      'Laboratório': e.laboratorio?.sigla ?? '',
      'TAG': e.tag,
      'Patrimônio': e.patrimonio,
      'Item': e.item?.nome ?? '',
      'Situação': e.situacao,
      'Situação Metrológica': e.situacaoMetrologica,
      'Status Calibração': e.statusCalibracao,
      'Status Verificação': e.statusVerificacao,
      'Sinalizações': (e.sinalizacoes ?? []).map((s: any) => s.rotulo).join('; '),
    }));
  }, [equipamentosVisiveis, filtroLab, filtroSituacao]);

  const linhasHistorico = useMemo(() => {
    return eventosVisiveis
      .filter((ev) => {
        const matchLab = filtroLab === 'todos' || ev.equipamento?.laboratorioId === filtroLab;
        const matchTipo = filtroTipoEvento === 'todos' || ev.tipo === filtroTipoEvento;
        const matchStatus = filtroStatusEvento === 'todas' || ev.situacao === filtroStatusEvento;
        const matchInicio = !filtroDataInicio || (ev.dataRealizacao ?? '') >= filtroDataInicio;
        const matchFim = !filtroDataFim || (ev.dataRealizacao ?? '') <= filtroDataFim;
        return matchLab && matchTipo && matchStatus && matchInicio && matchFim;
      })
      .map((ev) => ({
        'Data Realização': ev.dataRealizacao ?? ev.dataPrevista ?? '',
        'Tipo': TIPO_EVENTO_ROTULO[ev.tipo as keyof typeof TIPO_EVENTO_ROTULO] ?? ev.tipo,
        'Equipamento (TAG)': ev.equipamento?.tag ?? '',
        'Laboratório': ev.equipamento?.laboratorio?.sigla ?? '',
        'Situação': SITUACAO_EVENTO_ROTULO[ev.situacao as keyof typeof SITUACAO_EVENTO_ROTULO] ?? ev.situacao,
        'Resultado': ev.resultado ?? '',
        'Fornecedor': ev.fornecedor ?? '',
        'Nº Certificado': ev.numeroCertificado ?? '',
        'Custo Realizado': ev.custoRealizadoCentavos ? centavosParaReais(ev.custoRealizadoCentavos) : '',
      }));
  }, [eventosVisiveis, filtroLab, filtroTipoEvento, filtroStatusEvento, filtroDataInicio, filtroDataFim]);

  async function exportar(formato: 'csv' | 'xlsx' | 'pdf') {
    const nomeBase = `labucs-${tipo}`;
    const linhas = tipo === 'inventario' ? linhasInventario : tipo === 'situacao' ? linhasSituacao : linhasHistorico;
    if (formato === 'csv') baixarCSV(`${nomeBase}.csv`, linhas);
    if (formato === 'xlsx') await baixarXLSX(`${nomeBase}.xlsx`, linhas);
    if (formato === 'pdf') await baixarPDF(`${nomeBase}.pdf`, `LabUcs — ${TIPOS.find((t) => t.valor === tipo)?.rotulo}`, `Gerado em ${new Date().toLocaleString('pt-BR')}`, linhas);
    const db = await getDB();
    await registrarLog(db, { tabela: 'relatorios', registroId: tipo, acao: 'EXPORTAR', dadosNovos: { formato, totalLinhas: linhas.length } });
  }

  if (carregando) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}><div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%' }} /></div>;

  const abaStyle = (ativa: boolean): React.CSSProperties => ({
    padding: '8px 16px', background: ativa ? 'var(--color-accent-bg)' : 'transparent',
    border: 'none', borderBottom: ativa ? '2px solid var(--color-accent)' : '2px solid transparent',
    color: ativa ? 'var(--color-accent)' : 'var(--color-fg-muted)', fontWeight: 600,
    fontSize: 'var(--font-size-sm)', cursor: 'pointer', transition: 'all 120ms ease',
  });

  const totalAtual = tipo === 'inventario' ? linhasInventario.length : tipo === 'situacao' ? linhasSituacao.length : linhasHistorico.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spaceRem(3) }}>
      <PageHeader
        eyebrow="Gestão"
        titulo="Relatórios"
        subtitulo={global ? 'Visão consolidada de todos os laboratórios' : 'Relatórios do seu laboratório'}
        acoes={<>
          <Button variant="secondary" leftIcon={<Download size={16} />} onClick={() => exportar('csv')}>Exportar CSV</Button>
          <Button variant="secondary" leftIcon={<Download size={16} />} onClick={() => exportar('xlsx')}>Exportar Excel</Button>
          <Button variant="secondary" leftIcon={<Download size={16} />} onClick={() => exportar('pdf')}>Exportar PDF</Button>
        </>}
      />

      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--color-border)' }}>
        {TIPOS.map((t) => (
          <button key={t.valor} onClick={() => setTipo(t.valor)} style={abaStyle(tipo === t.valor)}>{t.rotulo}</button>
        ))}
      </div>
      <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>{TIPOS.find((t) => t.valor === tipo)?.descricao}</p>

      <Card style={{ border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader title="Filtros" />
        <CardContent style={{ display: 'flex', flexWrap: 'wrap', gap: spaceRem(3), alignItems: 'flex-end', borderBottom: '1px solid var(--color-border)', paddingBottom: spaceRem(2), marginBottom: spaceRem(2) }}>
          {global && <Select label="Laboratório" value={filtroLab} onChange={(e) => setFiltroLab(e.target.value)} options={[{ value: 'todos', label: 'Todos' }, ...labsVisiveis.map((l) => ({ value: l.id, label: `${l.sigla} — ${l.nome}` }))]} />}
          {tipo === 'situacao' && <Select label="Situação" value={filtroSituacao} onChange={(e) => setFiltroSituacao(e.target.value)} options={[{ value: 'todas', label: 'Todas' }, { value: 'ATIVO', label: 'Ativo' }, { value: 'INATIVO', label: 'Inativo' }, { value: 'EM_MANUTENCAO', label: 'Em manutenção' }]} />}
          {tipo === 'historico' && (
            <>
              <Select label="Tipo de Evento" value={filtroTipoEvento} onChange={(e) => setFiltroTipoEvento(e.target.value)} options={[{ value: 'todos', label: 'Todos' }, { value: 'CALIBRACAO', label: 'Calibração' }, { value: 'VERIFICACAO', label: 'Verificação' }, { value: 'MANUTENCAO_PREVENTIVA', label: 'Manutenção Preventiva' }, { value: 'MANUTENCAO_CORRETIVA', label: 'Manutenção Corretiva' }, { value: 'DIVERGENCIA_INVENTARIO', label: 'Divergência de Inventário' }]} />
              <Select label="Status" value={filtroStatusEvento} onChange={(e) => setFiltroStatusEvento(e.target.value)} options={[{ value: 'todas', label: 'Todos' }, { value: 'AGENDADO', label: 'Agendado' }, { value: 'REALIZADO', label: 'Realizado' }, { value: 'CANCELADO', label: 'Cancelado' }]} />
              <Input label="Data Início" type="date" value={filtroDataInicio} onChange={(e) => setFiltroDataInicio(e.target.value)} />
              <Input label="Data Fim" type="date" value={filtroDataFim} onChange={(e) => setFiltroDataFim(e.target.value)} />
            </>
          )}
        </CardContent>
      </Card>

      <Card style={{ border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader title={`${TIPOS.find((t) => t.valor === tipo)?.rotulo} — ${totalAtual} registro(s)`} />
        <CardContent style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-xs)' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-section)', borderBottom: '1px solid var(--color-border)' }}>
                {totalAtual > 0 && Object.keys((tipo === 'inventario' ? linhasInventario : tipo === 'situacao' ? linhasSituacao : linhasHistorico)[0] ?? {}).map((c) => (
                  <th key={c} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {totalAtual === 0 ? (
                <tr><td style={{ padding: '40px', textAlign: 'center', color: 'var(--color-fg-muted)' }}>Nenhum registro encontrado com os filtros selecionados</td></tr>
              ) : (
                (tipo === 'inventario' ? linhasInventario : tipo === 'situacao' ? linhasSituacao : linhasHistorico).map((linha, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {Object.values(linha).map((valor, j) => (
                      <td key={j} style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{String(valor)}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function equipamentosVisiteisFiltered(equipamentos: any[], filtroLab: string, filtroSituacao: string) {
  return equipamentos.filter((e) => (filtroLab === 'todos' || e.laboratorioId === filtroLab) && (filtroSituacao === 'todas' || e.situacao === filtroSituacao));
}
