import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFuncionalidades, useUser } from '@/features/auth/store';
import { getDB, getAll, put, deleteById, putAll } from '@/shared/db';
import { calcularMetricas, equipamentoAtivo } from '@/shared/metrology';
import { SITUACOES_EQUIPAMENTO, TIPOS_EVENTO, SITUACOES_EVENTO, type Equipamento, type Evento, type Laboratorio, type Item } from '@/shared/domain';
import { resumirPorSituacao as resumir } from '@/shared/metrology';
import { Card, CardHeader, CardContent, Badge, StatusBadge, Button, Input, Select, spaceRem } from '@/shared/ui/components';
import { formatarDataBR, centavosParaReais, gerarULID, gerarTAG, gerarNumeroSerie, reaisParaCentavos, somarMeses, hojeISO, formatISO } from '@/shared/utils';
import { baixarCSV } from '@/shared/exportar';
import { registrarLog } from '@/shared/audit';
import { getDB as getDBFn } from '@/shared/db';
import { Search, Plus, Filter, ChevronDown, Download, Upload, Edit, Trash2, Eye, AlertTriangle, AlertCircle, Clock, Box, Tag, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  ColumnDef,
  PaginationState,
} from '@tanstack/react-table';

type EquipamentoCompleto = Equipamento & {
  item?: Item;
  laboratorio?: Laboratorio;
  ultimaCalibracao?: Evento;
  ultimaVerificacao?: Evento;
  proximaCalibracao?: string | null;
  proximaVerificacao?: string | null;
  proximaManutencaoPreventiva?: string | null;
  diasParaVencimentoCalibracao?: number | null;
  diasParaVencimentoVerificacao?: number | null;
  diasParaVencimentoManutencao?: number | null;
  diasParaVencimento?: number | null;
  statusCalibracao?: string;
  statusVerificacao?: string;
  statusManutencao?: string;
  situacaoMetrologica?: string;
  sinalizacoes?: any[];
};

const columnHelper = createColumnHelper<EquipamentoCompleto>();

export function EquipamentosPage() {
  const navigate = useNavigate();
  const user = useUser();
  const funcionalidades = useFuncionalidades();
  const podeGerenciar = user?.perfil === 'GESTOR_LAB' || user?.perfil === 'GESTOR_GERAL';

  const [equipamentos, setEquipamentos] = useState<EquipamentoCompleto[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [labs, setLabs] = useState<Laboratorio[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroLab, setFiltroLab] = useState<string>('todos');
  const [filtroSituacao, setFiltroSituacao] = useState<string>('todas');
  const [filtroMetrologia, setFiltroMetrologia] = useState<string>('todas');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'patrimonio', desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<EquipamentoCompleto | null>(null);
  const [visualizando, setVisualizando] = useState<EquipamentoCompleto | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [form, setForm] = useState({
    patrimonio: '', tag: '', numeroSerie: '', laboratorioId: '', itemId: '',
    localizacao: '', dataAquisicao: '', dataColocacaoUso: '', valorAquisicaoCentavos: '',
    caCalibracao: '', caVerificacao: '', periodicidadeCalibracaoMeses: '', periodicidadeVerificacaoMeses: '',
    periodicidadeManutencaoPreventivaMeses: '', situacao: 'ATIVO',
  });

  const processarEquipamentos = useCallback((eqs: any[], its: any[], lss: any[], evs: any[]) => {
    const hoje = hojeISO();
    const resultado: EquipamentoCompleto[] = eqs.map(eq => {
      const item = its.find(i => i.id === eq.itemId);
      const laboratorio = lss.find(l => l.id === eq.laboratorioId);
      const eqEventos = evs.filter(e => e.equipamentoId === eq.id);

      const metricas = calcularMetricas({
        equipamento: eq,
        item: item || { caCalibracao: eq.caCalibracao, caVerificacao: eq.caVerificacao, periodicidadeCalibracaoMeses: eq.periodicidadeCalibracaoMeses, periodicidadeVerificacaoMeses: eq.periodicidadeVerificacaoMeses, periodicidadeManutencaoPreventivaMeses: eq.periodicidadeManutencaoPreventivaMeses },
        eventos: eqEventos,
        hoje,
        diasAlerta: 30,
      });

      return {
        ...eq,
        item,
        laboratorio,
        ...metricas,
      };
    });
    setEquipamentos(resultado);
  }, []);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const db = await getDB();
      const [eqs, its, lss, evs] = await Promise.all([
        db.getAll('equipamentos'),
        db.getAll('itens'),
        db.getAll('labs'),
        db.getAll('eventos'),
      ]);
      setItens(its);
      setLabs(lss);
      setEventos(evs);
      processarEquipamentos(eqs, its, lss, evs);
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  }, [processarEquipamentos]);

  const excluirEquipamento = useCallback(async (id: string) => {
    if (!confirm('Excluir equipamento?')) return;
    const db = await getDB();
    await db.delete('equipamentos', id);
    await carregarDados();
  }, [carregarDados]);

  const abrirEdicao = useCallback((eq: EquipamentoCompleto) => {
    setEditando(eq);
    setForm({
      patrimonio: eq.patrimonio || '',
      tag: eq.tag || '',
      numeroSerie: eq.numeroSerie || '',
      laboratorioId: eq.laboratorioId || '',
      itemId: eq.itemId || '',
      localizacao: eq.localizacao || '',
      dataAquisicao: eq.dataAquisicao || '',
      dataColocacaoUso: eq.dataColocacaoUso || '',
      valorAquisicaoCentavos: String((eq.valorAquisicaoCentavos || 0) / 100),
      caCalibracao: eq.caCalibracao?.toString() || '',
      caVerificacao: eq.caVerificacao?.toString() || '',
      periodicidadeCalibracaoMeses: eq.periodicidadeCalibracaoMeses?.toString() || '',
      periodicidadeVerificacaoMeses: eq.periodicidadeVerificacaoMeses?.toString() || '',
      periodicidadeManutencaoPreventivaMeses: eq.periodicidadeManutencaoPreventivaMeses?.toString() || '',
      situacao: eq.situacao || 'ATIVO',
    });
    setModalAberto(true);
  }, [setEditando, setForm, setModalAberto]);

  const confirmarExclusao = useCallback((eq: EquipamentoCompleto) => {
    if (confirm(`Excluir ${eq.tag} (${eq.patrimonio})?`)) excluirEquipamento(eq.id);
  }, [excluirEquipamento]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const dadosFiltrados = useMemo(() => {
    return equipamentos.filter(eq => {
      const matchTexto = !filtroTexto ||
        eq.patrimonio?.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        eq.tag?.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        eq.numeroSerie?.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        eq.item?.nome?.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        eq.laboratorio?.sigla?.toLowerCase().includes(filtroTexto.toLowerCase());

      const matchLab = filtroLab === 'todos' || eq.laboratorioId === filtroLab;
      const matchSit = filtroSituacao === 'todas' || eq.situacao === filtroSituacao;
      const matchMet = filtroMetrologia === 'todas' || eq.situacaoMetrologica === filtroMetrologia;

      return matchTexto && matchLab && matchSit && matchMet;
    });
  }, [equipamentos, filtroTexto, filtroLab, filtroSituacao, filtroMetrologia]);

  const columns = useMemo<ColumnDef<EquipamentoCompleto>[]>(() => [
    columnHelper.accessor('patrimonio', {
      header: 'Patrimônio',
      cell: info => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}>{info.getValue()}</span>,
      size: 120,
    }),
    columnHelper.accessor('tag', {
      header: 'TAG',
      cell: info => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-accent)' }}>{info.getValue()}</span>,
      size: 130,
    }),
    columnHelper.accessor('item.nome', {
      header: 'Item / Modelo',
      cell: info => <div><span style={{ fontWeight: 500 }}>{info.getValue()}</span><br/><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fgMuted)' }}>{info.row.original.item?.fabricante} {info.row.original.item?.modelo}</span></div>,
      size: 200,
    }),
    columnHelper.accessor('laboratorio.sigla', {
      header: 'Lab',
      cell: info => <Badge variant="outline" size="sm">{info.getValue()}</Badge>,
      size: 80,
    }),
    columnHelper.accessor('situacao', {
      header: 'Situação',
      cell: info => <StatusBadge status={info.getValue()} size="sm" />,
      size: 120,
    }),
    columnHelper.accessor('situacaoMetrologica', {
      header: 'Metrologia',
      cell: info => {
        const status = info.getValue();
        const variants: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
          CONFORME: 'success', ATENCAO: 'warning', NAO_CONFORME: 'danger', SEM_DADOS: 'default'
        };
        return <Badge variant={variants[status] || 'default'} size="sm" dot>{status}</Badge>;
      },
      size: 130,
    }),
    columnHelper.accessor('proximaCalibracao', {
      header: 'Próx. Calibração',
      cell: info => {
        const data = info.getValue();
        if (!data) return <span style={{ color: 'var(--color-fgMuted)' }}>—</span>;
        const dias = info.row.original.diasParaVencimentoCalibracao;
        const isVencido = dias !== null && dias < 0;
        const isProximo = dias !== null && dias >= 0 && dias <= 30;
        return <span style={{ color: isVencido ? 'var(--color-danger)' : isProximo ? 'var(--color-warning)' : 'var(--color-fg)', fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}>{data ? formatarDataBR(data) : '—'}</span>;
      },
      size: 140,
    }),
    columnHelper.accessor('proximaVerificacao', {
      header: 'Próx. Verificação',
      cell: info => {
        const data = info.getValue();
        if (!data) return <span style={{ color: 'var(--color-fgMuted)' }}>—</span>;
        const dias = info.row.original.diasParaVencimentoVerificacao;
        const isVencido = dias !== null && dias < 0;
        const isProximo = dias !== null && dias >= 0 && dias <= 30;
        return <span style={{ color: isVencido ? 'var(--color-danger)' : isProximo ? 'var(--color-warning)' : 'var(--color-fg)', fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}>{data ? formatarDataBR(data) : '—'}</span>;
      },
      size: 140,
    }),
    columnHelper.display({
      id: 'acoes',
      header: 'Ações',
      cell: info => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button variant="ghost" size="sm" onClick={() => setVisualizando(info.row.original)} title="Visualizar"><Eye size={14} /></Button>
          {podeGerenciar && <Button variant="ghost" size="sm" onClick={() => abrirEdicao(info.row.original)} title="Editar"><Edit size={14} /></Button>}
          {podeGerenciar && <Button variant="ghost" size="sm" onClick={() => confirmarExclusao(info.row.original)} title="Excluir"><Trash2 size={14} style={{ color: 'var(--color-danger)' }} /></Button>}
        </div>
      ),
      size: 100,
    }),
  ], [podeGerenciar, abrirEdicao, confirmarExclusao, setVisualizando]);

  const table = useReactTable({
    data: dadosFiltrados,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const totalRegistros = dadosFiltrados.length;
  const resumo = resumir(equipamentos as Array<{ situacao: string }>);

  async function exportarCSV() {
    const linhas = dadosFiltrados.map((eq) => ({
      'Laboratório': eq.laboratorio?.sigla ?? '',
      'Patrimônio': eq.patrimonio,
      'TAG': eq.tag,
      'Nº Série': eq.numeroSerie,
      'Item': eq.item?.nome ?? '',
      'Fabricante': eq.item?.fabricante ?? '',
      'Modelo': eq.item?.modelo ?? '',
      'Localização': eq.localizacao,
      'Situação': eq.situacao,
      'Situação Metrológica': eq.situacaoMetrologica ?? '',
      'Próx. Calibração': eq.proximaCalibracao ?? '',
      'Próx. Verificação': eq.proximaVerificacao ?? '',
      'Valor Aquisição': eq.valorAquisicaoCentavos ? centavosParaReais(eq.valorAquisicaoCentavos) : '',
    }));
    baixarCSV('labucs-equipamentos.csv', linhas);
    const db = await getDBFn();
    await registrarLog(db, { tabela: 'equipamentos', registroId: 'exportacao', acao: 'EXPORTAR', dadosNovos: { totalLinhas: linhas.length } });
  }

  async function salvarEquipamento() {
    if (!form.patrimonio || !form.tag || !form.laboratorioId || !form.itemId) return;
    setSalvando(true);
    try {
      const db = await getDB();
      const agora = new Date().toISOString();
      const item = itens.find(i => i.id === form.itemId);

      const dados = {
        ...(editando ? { id: editando.id, criadoEm: editando.criadoEm } : { id: gerarULID(), criadoEm: agora }),
        ...form,
        valorAquisicaoCentavos: Number(form.valorAquisicaoCentavos) || 0,
        caCalibracao: Number(form.caCalibracao) || null,
        caVerificacao: Number(form.caVerificacao) || null,
        periodicidadeCalibracaoMeses: Number(form.periodicidadeCalibracaoMeses) || 0,
        periodicidadeVerificacaoMeses: Number(form.periodicidadeVerificacaoMeses) || 0,
        periodicidadeManutencaoPreventivaMeses: Number(form.periodicidadeManutencaoPreventivaMeses) || 0,
        ativo: true,
        atualizadoEm: agora,
      };
      await db.put('equipamentos', dados);
      await carregarDados();
      fecharModal();
    } catch (e) {
      console.error(e);
    } finally {
      setSalvando(false);
    }
  }

  function fecharModal() {
    setModalAberto(false);
    setEditando(null);
  }

  function handleItemChange(itemId: string) {
    const item = itens.find(i => i.id === itemId);
    if (item) {
      setForm(prev => ({
        ...prev,
        caCalibracao: item.caCalibracao?.toString() || '',
        caVerificacao: item.caVerificacao?.toString() || '',
        periodicidadeCalibracaoMeses: item.periodicidadeCalibracaoMeses?.toString() || '',
        periodicidadeVerificacaoMeses: item.periodicidadeVerificacaoMeses?.toString() || '',
        periodicidadeManutencaoPreventivaMeses: item.periodicidadeManutencaoPreventivaMeses?.toString() || '',
      }));
    }
  }

  if (carregando) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}><div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%' }} /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spaceRem(3) }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spaceRem(2) }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-fg)', margin: 0 }}>Equipamentos</h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fgMuted)', margin: '4px 0 0' }}>{totalRegistros} equipamentos • {resumo.ATIVO} ativos • {resumo.INATIVO} inativos • {resumo.EM_MANUTENCAO} em manutenção</p>
        </div>
        <div style={{ display: 'flex', gap: spaceRem(2), flexWrap: 'wrap' }}>
          {podeGerenciar && <Button onClick={() => { setEditando(null); setForm({ patrimonio: '', tag: '', numeroSerie: '', laboratorioId: labs[0]?.id || '', itemId: itens[0]?.id || '', localizacao: '', dataAquisicao: '', dataColocacaoUso: '', valorAquisicaoCentavos: '', caCalibracao: '', caVerificacao: '', periodicidadeCalibracaoMeses: '', periodicidadeVerificacaoMeses: '', periodicidadeManutencaoPreventivaMeses: '', situacao: 'ATIVO' }); setModalAberto(true); }} leftIcon={<Plus size={16} />}>Novo Equipamento</Button>}
          <Button variant="outline" leftIcon={<Download size={16} />} onClick={exportarCSV}>Exportar CSV</Button>
        </div>
      </div>

      <Card style={{ border: '1px solid var(--color-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <CardHeader title="Filtros" />
        <CardContent style={{ display: 'flex', flexWrap: 'wrap', gap: spaceRem(3), alignItems: 'flex-end', borderBottom: '1px solid var(--color-border)', paddingBottom: spaceRem(2), marginBottom: spaceRem(2) }}>
          <Input placeholder="Buscar (patrimônio, TAG, nº série, item, lab...)" value={filtroTexto} onChange={e => setFiltroTexto(e.target.value)} leftIcon={<Search size={16} />} style={{ minWidth: 280 }} />
          <Select label="Laboratório" value={filtroLab} onChange={e => setFiltroLab(e.target.value)} options={[{ value: 'todos', label: 'Todos' }, ...labs.map(l => ({ value: l.id, label: `${l.sigla} - ${l.nome}` }))]} fullWidth />
          <Select label="Situação" value={filtroSituacao} onChange={e => setFiltroSituacao(e.target.value)} options={[{ value: 'todas', label: 'Todas' }, ...Object.entries(SITUACOES_EQUIPAMENTO).map(([k, v]) => ({ value: v, label: k }))]} />
          <Select label="Metrologia" value={filtroMetrologia} onChange={e => setFiltroMetrologia(e.target.value)} options={[{ value: 'todas', label: 'Todas' }, { value: 'CONFORME', label: 'Conforme' }, { value: 'ATENCAO', label: 'Atenção' }, { value: 'NAO_CONFORME', label: 'Não Conforme' }, { value: 'SEM_DADOS', label: 'Sem Dados' }]} />
        </CardContent>
      </Card>

      <Card style={{ border: '1px solid var(--color-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <CardContent style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)', tableLayout: 'fixed' }}>
            <colgroup>
              {table.getAllLeafColumns().map(col => <col key={col.id} style={{ width: col.getSize() }} />)}
            </colgroup>
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} style={{ backgroundColor: 'var(--color-bg-section)', borderBottom: '1px solid var(--color-border)' }}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--color-fg)', whiteSpace: 'nowrap', overflow: 'hidden', cursor: header.column.getCanSort() ? 'pointer' : 'default', userSelect: 'none' }}
                      onClick={header.column.getToggleSortingHandler()}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc' && <ChevronDown size={12} style={{ transform: 'rotate(-180deg)' }} />}
                        {header.column.getIsSorted() === 'desc' && <ChevronDown size={12} />}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr><td colSpan={columns.length} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-fgMuted)' }}>Nenhum equipamento encontrado</td></tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.1s' }}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} style={{ padding: '10px 12px', verticalAlign: 'middle', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: spaceRem(3), flexWrap: 'wrap', gap: spaceRem(2), borderTop: '1px solid var(--color-border)', marginTop: spaceRem(2) }}>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fgMuted)' }}>
              Mostrando {pagination.pageIndex * pagination.pageSize + 1} a {Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalRegistros)} de {totalRegistros}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Anterior</Button>
              <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Próxima</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {modalAberto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: spaceRem(3) }} onClick={fecharModal}>
          <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '10px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: spaceRem(3), borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ margin: 0 }}>{editando ? 'Editar Equipamento' : 'Novo Equipamento'}</h2>
              <Button variant="ghost" size="sm" onClick={fecharModal}><ChevronDown size={20} /></Button>
            </div>
            <form onSubmit={e => { e.preventDefault(); salvarEquipamento(); }} style={{ padding: spaceRem(3) }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spaceRem(3) }}>
                <Input label="Patrimônio" value={form.patrimonio} onChange={e => setForm({ ...form, patrimonio: e.target.value })} required fullWidth />
                <Input label="TAG" value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })} required fullWidth />
                <Input label="Nº Série" value={form.numeroSerie} onChange={e => setForm({ ...form, numeroSerie: e.target.value })} fullWidth />
                <Select label="Laboratório" value={form.laboratorioId} onChange={e => setForm({ ...form, laboratorioId: e.target.value })} options={labs.map(l => ({ value: l.id, label: `${l.sigla} - ${l.nome}` }))} required fullWidth />
                <Select label="Item/Modelo" value={form.itemId} onChange={e => { setForm({ ...form, itemId: e.target.value }); handleItemChange(e.target.value); }} options={itens.map(i => ({ value: i.id, label: `${i.nome} (${i.fabricante} ${i.modelo})` }))} required fullWidth />
                <Input label="Localização" value={form.localizacao} onChange={e => setForm({ ...form, localizacao: e.target.value })} fullWidth style={{ gridColumn: '1 / -1' }} />
                <Input label="Data Aquisição" type="date" value={form.dataAquisicao} onChange={e => setForm({ ...form, dataAquisicao: e.target.value })} fullWidth />
                <Input label="Data Colocação em Uso" type="date" value={form.dataColocacaoUso} onChange={e => setForm({ ...form, dataColocacaoUso: e.target.value })} fullWidth />
                <Input label="Valor Aquisição (R$)" value={form.valorAquisicaoCentavos} onChange={e => setForm({ ...form, valorAquisicaoCentavos: e.target.value })} fullWidth />
                <Input label="CA Calibração" value={form.caCalibracao} onChange={e => setForm({ ...form, caCalibracao: e.target.value })} fullWidth />
                <Input label="CA Verificação" value={form.caVerificacao} onChange={e => setForm({ ...form, caVerificacao: e.target.value })} fullWidth />
                <Input label="Periodicidade Calibração (meses)" value={form.periodicidadeCalibracaoMeses} onChange={e => setForm({ ...form, periodicidadeCalibracaoMeses: e.target.value })} fullWidth />
                <Input label="Periodicidade Verificação (meses)" value={form.periodicidadeVerificacaoMeses} onChange={e => setForm({ ...form, periodicidadeVerificacaoMeses: e.target.value })} fullWidth />
                <Input label="Periodicidade Manutenção (meses)" value={form.periodicidadeManutencaoPreventivaMeses} onChange={e => setForm({ ...form, periodicidadeManutencaoPreventivaMeses: e.target.value })} fullWidth />
                <Select label="Situação" value={form.situacao} onChange={e => setForm({ ...form, situacao: e.target.value })} options={Object.entries(SITUACOES_EQUIPAMENTO).map(([k, v]) => ({ value: v, label: k }))} fullWidth />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spaceRem(2), marginTop: spaceRem(3), paddingTop: spaceRem(3), borderTop: '1px solid var(--color-border)' }}>
                <Button variant="outline" onClick={fecharModal}>Cancelar</Button>
                <Button type="submit" loading={salvando}>{editando ? 'Salvar Alterações' : 'Criar Equipamento'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {visualizando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: spaceRem(3) }} onClick={() => setVisualizando(null)}>
          <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '10px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: spaceRem(3), borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spaceRem(2) }}>
                <Box size={24} style={{ color: 'var(--color-accent)' }} />
                <div>
                  <h2 style={{ margin: 0 }}>{visualizando.tag}</h2>
                  <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-fgMuted)' }}>{visualizando.patrimonio}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setVisualizando(null)}><ChevronDown size={20} /></Button>
            </div>
            <div style={{ padding: spaceRem(3) }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spaceRem(3) }}>
                <div><strong>Item:</strong> {visualizando.item?.nome}</div>
                <div><strong>Lab:</strong> {visualizando.laboratorio?.sigla} - {visualizando.laboratorio?.nome}</div>
                <div><strong>Nº Série:</strong> {visualizando.numeroSerie}</div>
                <div><strong>Localização:</strong> {visualizando.localizacao}</div>
                <div><strong>Situação:</strong> <StatusBadge status={visualizando.situacao} /></div>
                <div><strong>Metrologia:</strong> <Badge variant={visualizando.situacaoMetrologica === 'CONFORME' ? 'success' : visualizando.situacaoMetrologica === 'ATENCAO' ? 'warning' : visualizando.situacaoMetrologica === 'NAO_CONFORME' ? 'danger' : 'default'}>{visualizando.situacaoMetrologica}</Badge></div>
                <div><strong>Próx. Calibração:</strong> {visualizando.proximaCalibracao ? formatarDataBR(visualizando.proximaCalibracao) : '—'}</div>
                <div><strong>Próx. Verificação:</strong> {visualizando.proximaVerificacao ? formatarDataBR(visualizando.proximaVerificacao) : '—'}</div>
                <div><strong>Valor:</strong> {centavosParaReais(visualizando.valorAquisicaoCentavos || 0)}</div>
                <div><strong>Data Aquisição:</strong> {visualizando.dataAquisicao ? formatarDataBR(visualizando.dataAquisicao) : '—'}</div>
              </div>
              {visualizando.sinalizacoes && visualizando.sinalizacoes.length > 0 && (
                <div style={{ marginTop: spaceRem(3), paddingTop: spaceRem(3), borderTop: '1px solid var(--color-border)' }}>
                  <h4 style={{ margin: '0 0 12px 0' }}>Sinalizações</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {visualizando.sinalizacoes.map((s: any, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                        <Badge variant={s.severidade === 'CRITICO' ? 'danger' : s.severidade === 'ALTO' ? 'warning' : 'info'} size="sm" dot>{s.severidade}</Badge>
                        <span style={{ flex: 1, fontSize: 'var(--font-size-sm)' }}>{s.detalhe}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spaceRem(2), marginTop: spaceRem(3), paddingTop: spaceRem(3), borderTop: '1px solid var(--color-border)' }}>
                <Button variant="outline" onClick={() => setVisualizando(null)}>Fechar</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}