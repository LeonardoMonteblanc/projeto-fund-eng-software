/**
 * EventosPage — Calibrações, verificações e manutenções (RF08–RF11, RF14, RF17).
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFuncionalidades, useUser } from '@/features/auth/store';
import { getDB } from '@/shared/db';
import { calcularMetricas } from '@/shared/metrology';
import { SITUACOES_EVENTO, SITUACAO_POR_ESTADO_RETORNO, TIPO_EVENTO_ROTULO, SITUACAO_EVENTO_ROTULO } from '@/shared/constants';
import type { Equipamento, Evento, Laboratorio, Item, Fornecedor } from '@/shared/domain';
import { Card, CardHeader, CardContent, Badge, StatusBadge, Button, Input, Select, spaceRem, PageHeader } from '@/shared/ui/components';
import { formatarDataBR, centavosParaReais, gerarULID, reaisParaCentavos, hojeISO } from '@/shared/utils';
import { registrarLog } from '@/shared/audit';
import { Search, Plus, ChevronDown, Edit, Trash2, Eye, Calendar } from 'lucide-react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type ColumnDef,
  type PaginationState,
} from '@tanstack/react-table';
import { EventForm } from './EventForm';
import { TIPOS_EVENTO_ICONS } from './icons';

type EventoCompleto = Evento & {
  equipamento?: Equipamento;
  item?: Item;
  laboratorio?: Laboratorio;
  fornecedor?: Fornecedor;
};

const TIPOS_EVENTO_ORDEM = ['CALIBRACAO', 'VERIFICACAO', 'MANUTENCAO_PREVENTIVA', 'MANUTENCAO_CORRETIVA', 'DIVERGENCIA_INVENTARIO'] as const;

export function EventosPage() {
  const user = useUser();
  const funcionalidades = useFuncionalidades();
  const podeRegistrar = funcionalidades.some((f) => f.acessivel && f.codigo === 'F04');

  const [eventos, setEventos] = useState<EventoCompleto[]>([]);
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [labs, setLabs] = useState<Laboratorio[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroSituacao, setFiltroSituacao] = useState<string>('todas');
  const [filtroLab, setFiltroLab] = useState<string>('todos');
  const [filtroEquipamento, setFiltroEquipamento] = useState<string>('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('todos');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<EventoCompleto | null>(null);
  const [visualizando, setVisualizando] = useState<EventoCompleto | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const db = await getDB();
      const [evs, eqs, its, lss, forns] = await Promise.all([
        db.getAll('eventos'),
        db.getAll('equipamentos'),
        db.getAll('itens'),
        db.getAll('labs'),
        db.getAll('fornecedores'),
      ]);
      setItens(its);
      setLabs(lss);
      setFornecedores(forns);

      const hoje = hojeISO();
      const eqsEnriquecidos = eqs.map((eq: any) => {
        const item = its.find((i: any) => i.id === eq.itemId);
        const eqEventos = evs.filter((e: any) => e.equipamentoId === eq.id);
        const metricas = calcularMetricas({
          equipamento: eq,
          item: item || { caCalibracao: eq.caCalibracao, caVerificacao: eq.caVerificacao, periodicidadeCalibracaoMeses: eq.periodicidadeCalibracaoMeses, periodicidadeVerificacaoMeses: eq.periodicidadeVerificacaoMeses, periodicidadeManutencaoPreventivaMeses: eq.periodicidadeManutencaoPreventivaMeses },
          eventos: eqEventos,
          hoje,
          diasAlerta: 30,
        });
        return { ...eq, item, ...metricas };
      });
      setEquipamentos(eqsEnriquecidos);

      const resultado: EventoCompleto[] = evs.map((ev: any) => {
        const equipamento = eqsEnriquecidos.find((e: any) => e.id === ev.equipamentoId);
        return {
          ...ev,
          equipamento,
          item: equipamento?.item,
          laboratorio: lss.find((l: any) => l.id === equipamento?.laboratorioId),
          fornecedor: ev.fornecedorId ? forns.find((f: any) => f.id === ev.fornecedorId) : undefined,
        };
      });
      setEventos(resultado);
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const abrirNovo = useCallback(() => {
    setEditando(null);
    setModalAberto(true);
  }, []);

  const abrirEdicao = useCallback((ev: EventoCompleto) => {
    setEditando(ev);
    setModalAberto(true);
  }, []);

  const confirmarExclusao = useCallback(async (ev: EventoCompleto) => {
    if (!confirm(`Excluir o evento de ${TIPO_EVENTO_ROTULO[ev.tipo]} do equipamento ${ev.equipamento?.tag ?? '—'}?`)) return;
    const db = await getDB();
    await db.delete('eventos', ev.id);
    await registrarLog(db, { tabela: 'eventos', registroId: ev.id, acao: 'INATIVAR', dadosAnteriores: ev as any, dadosNovos: null });
    await carregarDados();
  }, [carregarDados]);

  const handleSubmit = useCallback(async (formData: any) => {
    setSalvando(true);
    try {
      const db = await getDB();
      const agora = new Date().toISOString();
      const equipamento = equipamentos.find((e) => e.id === formData.equipamentoId);
      const tipo = formData.tipo;
      const ehMetrologico = tipo === 'CALIBRACAO' || tipo === 'VERIFICACAO';

      const dados: any = {
        ...(editando ? { id: editando.id, criadoEm: editando.criadoEm } : { id: gerarULID(), criadoEm: agora }),
        tipo,
        equipamentoId: formData.equipamentoId,
        fornecedorId: formData.fornecedorId || null,
        responsavelId: formData.responsavelId || user?.id,
        situacao: formData.situacao || 'AGENDADO',
        dataPrevista: formData.dataPrevista || null,
        dataRealizacao: formData.dataRealizacao || null,
        descricao: formData.descricao || '',
        observacoes: formData.observacoes || '',
        custoEstimadoCentavos: formData.custoEstimadoCentavos ? reaisParaCentavos(formData.custoEstimadoCentavos) : null,
        custoRealizadoCentavos: formData.custoRealizadoCentavos ? reaisParaCentavos(formData.custoRealizadoCentavos) : null,
        numeroCertificado: formData.numeroCertificado || null,
        erro: ehMetrologico && formData.erro !== '' ? Number(formData.erro) : null,
        incerteza: ehMetrologico && formData.incerteza !== '' ? Number(formData.incerteza) : null,
        caUtilizado: formData.caUtilizado !== '' && formData.caUtilizado !== null && formData.caUtilizado !== undefined ? Number(formData.caUtilizado) : null,
        resultado: ehMetrologico && formData.resultado ? formData.resultado : null,
        problema: tipo === 'MANUTENCAO_CORRETIVA' ? formData.problema || '' : undefined,
        servico: tipo === 'MANUTENCAO_CORRETIVA' ? formData.servico || '' : undefined,
        estadoRetorno: tipo === 'MANUTENCAO_CORRETIVA' && formData.estadoRetorno ? formData.estadoRetorno : null,
        solicitacaoOrigemId: editando?.solicitacaoOrigemId ?? null,
        atualizadoEm: agora,
      };

      await db.put('eventos', dados);

      if (tipo === 'MANUTENCAO_CORRETIVA' && formData.estadoRetorno && equipamento) {
        const novaSituacao = SITUACAO_POR_ESTADO_RETORNO[formData.estadoRetorno as keyof typeof SITUACAO_POR_ESTADO_RETORNO];
        if (novaSituacao && novaSituacao !== equipamento.situacao) {
          await db.put('equipamentos', { ...equipamento, situacao: novaSituacao, atualizadoEm: agora });
        }
      }

      await registrarLog(db, {
        tabela: 'eventos',
        registroId: dados.id,
        acao: editando ? 'ATUALIZAR' : 'CRIAR',
        dadosAnteriores: editando ? (editando as any) : null,
        dadosNovos: dados,
      });

      setModalAberto(false);
      setEditando(null);
      await carregarDados();
    } catch (e) {
      console.error(e);
    } finally {
      setSalvando(false);
    }
  }, [editando, equipamentos, user, carregarDados]);

  const dadosFiltrados = useMemo(() => {
    return eventos.filter((ev) => {
      const matchTexto = !filtroTexto ||
        (ev.equipamento?.tag ?? '').toLowerCase().includes(filtroTexto.toLowerCase()) ||
        (ev.equipamento?.patrimonio ?? '').toLowerCase().includes(filtroTexto.toLowerCase()) ||
        (ev.numeroCertificado ?? '').toLowerCase().includes(filtroTexto.toLowerCase()) ||
        (ev.descricao ?? '').toLowerCase().includes(filtroTexto.toLowerCase()) ||
        (ev.fornecedor?.razaoSocial ?? '').toLowerCase().includes(filtroTexto.toLowerCase());

      const matchTipo = filtroTipo === 'todos' || ev.tipo === filtroTipo;
      const matchSit = filtroSituacao === 'todas' || ev.situacao === filtroSituacao;
      const matchLab = filtroLab === 'todos' || ev.equipamento?.laboratorioId === filtroLab;
      const matchEquip = filtroEquipamento === 'todos' || ev.equipamentoId === filtroEquipamento;

      let matchPeriodo = true;
      if (filtroPeriodo !== 'todos' && ev.dataRealizacao) {
        const hoje = new Date();
        const dataEv = new Date(ev.dataRealizacao + 'T00:00:00');
        if (filtroPeriodo === 'mes') matchPeriodo = dataEv.getMonth() === hoje.getMonth() && dataEv.getFullYear() === hoje.getFullYear();
        else if (filtroPeriodo === 'trimestre') matchPeriodo = Math.floor(dataEv.getMonth() / 3) === Math.floor(hoje.getMonth() / 3) && dataEv.getFullYear() === hoje.getFullYear();
        else if (filtroPeriodo === 'ano') matchPeriodo = dataEv.getFullYear() === hoje.getFullYear();
      }

      return matchTexto && matchTipo && matchSit && matchLab && matchEquip && matchPeriodo;
    });
  }, [eventos, filtroTexto, filtroTipo, filtroSituacao, filtroLab, filtroEquipamento, filtroPeriodo]);

  const columns = useMemo<ColumnDef<EventoCompleto>[]>(() => [
    {
      accessorKey: 'dataRealizacao',
      header: 'Data Realização',
      cell: (info) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}>{info.getValue() ? formatarDataBR(info.getValue() as string) : '—'}</span>,
      size: 110,
    },
    {
      accessorKey: 'tipo',
      header: 'Tipo',
      cell: (info) => {
        const tipo = info.getValue() as string;
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {TIPOS_EVENTO_ICONS[tipo as keyof typeof TIPOS_EVENTO_ICONS]} <span>{TIPO_EVENTO_ROTULO[tipo as keyof typeof TIPO_EVENTO_ROTULO] ?? tipo}</span>
          </span>
        );
      },
      size: 170,
    },
    {
      accessorKey: 'equipamento.tag',
      header: 'Equipamento (TAG)',
      cell: (info) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-accent)' }}>{String(info.getValue() ?? '—')}</span>,
      size: 130,
    },
    {
      accessorKey: 'equipamento.laboratorio.sigla',
      header: 'Lab',
      cell: (info) => <Badge variant="outline" size="sm">{String(info.getValue() ?? '—')}</Badge>,
      size: 70,
    },
    {
      accessorKey: 'situacao',
      header: 'Situação',
      cell: (info) => <StatusBadge status={info.getValue() as string} size="sm" />,
      size: 100,
    },
    {
      accessorKey: 'resultado',
      header: 'Resultado',
      cell: (info) => {
        const res = info.getValue() as string | null;
        if (!res) return <span style={{ color: 'var(--color-fg-muted)' }}>—</span>;
        return <StatusBadge status={res} size="sm" />;
      },
      size: 100,
    },
    {
      accessorKey: 'fornecedor.razaoSocial',
      header: 'Fornecedor',
      cell: (info) => <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>{String(info.getValue() ?? '—')}</span>,
      size: 160,
    },
    {
      accessorKey: 'custoRealizadoCentavos',
      header: 'Custo Realizado',
      cell: (info) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>{info.getValue() ? centavosParaReais(info.getValue() as number) : '—'}</span>,
      size: 110,
    },
    {
      id: 'acoes',
      header: 'Ações',
      cell: (info) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button variant="ghost" size="sm" onClick={() => setVisualizando(info.row.original)} title="Visualizar"><Eye size={14} /></Button>
          {podeRegistrar && <Button variant="ghost" size="sm" onClick={() => abrirEdicao(info.row.original)} title="Editar"><Edit size={14} /></Button>}
          {podeRegistrar && <Button variant="ghost" size="sm" onClick={() => confirmarExclusao(info.row.original)} title="Excluir"><Trash2 size={14} style={{ color: 'var(--color-danger)' }} /></Button>}
        </div>
      ),
      size: 110,
    },
  ], [podeRegistrar, abrirEdicao, confirmarExclusao]);

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

  if (carregando) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}><div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%' }} /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spaceRem(3) }}>
      <PageHeader
        eyebrow="Operação"
        titulo="Eventos"
        subtitulo={`${totalRegistros} eventos — calibrações, verificações e manutenções`}
        acoes={<>{podeRegistrar && <Button onClick={abrirNovo} leftIcon={<Plus size={16} />}>Novo Evento</Button>}</>}
      />

      <Card style={{ border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader title="Filtros" />
        <CardContent style={{ display: 'flex', flexWrap: 'wrap', gap: spaceRem(3), alignItems: 'flex-end', borderBottom: '1px solid var(--color-border)', paddingBottom: spaceRem(2), marginBottom: spaceRem(2) }}>
          <Input placeholder="Buscar (TAG, patrimônio, nº certificado, fornecedor...)" value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} leftIcon={<Search size={16} />} style={{ minWidth: 280 }} />
          <Select label="Tipo" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} options={[{ value: 'todos', label: 'Todos' }, ...TIPOS_EVENTO_ORDEM.map((t) => ({ value: t, label: TIPO_EVENTO_ROTULO[t] }))]} />
          <Select label="Situação" value={filtroSituacao} onChange={(e) => setFiltroSituacao(e.target.value)} options={[{ value: 'todas', label: 'Todas' }, ...Object.values(SITUACOES_EVENTO).map((s) => ({ value: s, label: SITUACAO_EVENTO_ROTULO[s as keyof typeof SITUACAO_EVENTO_ROTULO] }))]} />
          <Select label="Laboratório" value={filtroLab} onChange={(e) => setFiltroLab(e.target.value)} options={[{ value: 'todos', label: 'Todos' }, ...labs.map((l) => ({ value: l.id, label: `${l.sigla} - ${l.nome}` }))]} />
          <Select label="Equipamento" value={filtroEquipamento} onChange={(e) => setFiltroEquipamento(e.target.value)} options={[{ value: 'todos', label: 'Todos' }, ...equipamentos.map((e) => ({ value: e.id, label: `${e.tag} (${e.patrimonio})` }))]} />
          <Select label="Período" value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value)} options={[{ value: 'todos', label: 'Todos' }, { value: 'mes', label: 'Este Mês' }, { value: 'trimestre', label: 'Este Trimestre' }, { value: 'ano', label: 'Este Ano' }]} />
        </CardContent>
      </Card>

      <Card style={{ border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <CardContent style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)', tableLayout: 'fixed' }}>
            <colgroup>
              {table.getAllLeafColumns().map(col => <col key={col.id} style={{ width: col.getSize() }} />)}
            </colgroup>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} style={{ backgroundColor: 'var(--color-bg-section)', borderBottom: '1px solid var(--color-border)' }}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--color-fg-light)', whiteSpace: 'nowrap', overflow: 'hidden', textTransform: 'uppercase', fontSize: '10.5px', letterSpacing: '0.04em', cursor: header.column.getCanSort() ? 'pointer' : 'default', userSelect: 'none' }} onClick={header.column.getToggleSortingHandler()}>
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
                <tr><td colSpan={columns.length} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-fg-muted)' }}>Nenhum evento encontrado</td></tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.1s' }}>
                    {row.getVisibleCells().map((cell) => (
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
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>
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
        <div className="overlay-modal" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: spaceRem(3) }} onClick={() => { setModalAberto(false); setEditando(null); }}>
          <div style={{ background: 'var(--color-bg-elevated)', border: '2px solid var(--color-accent)', borderRadius: '0', width: '100%', maxWidth: '860px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: spaceRem(3), borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ margin: 0 }}>{editando ? 'Editar Evento' : 'Novo Evento'}</h2>
              <Button variant="ghost" size="sm" onClick={() => { setModalAberto(false); setEditando(null); }}><ChevronDown size={20} /></Button>
            </div>
            <EventForm
              editando={editando}
              equipamentos={equipamentos}
              itens={itens}
              fornecedores={fornecedores}
              usuarioId={user?.id ?? 'anonimo'}
              onSubmit={handleSubmit}
              onCancel={() => { setModalAberto(false); setEditando(null); }}
              salvando={salvando}
            />
          </div>
        </div>
      )}

      {visualizando && (
        <div className="overlay-modal" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: spaceRem(3) }} onClick={() => setVisualizando(null)}>
          <div style={{ background: 'var(--color-bg-elevated)', border: '2px solid var(--color-accent)', borderRadius: '0', width: '100%', maxWidth: '820px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: spaceRem(3), borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spaceRem(2) }}>
                {TIPOS_EVENTO_ICONS[visualizando.tipo as keyof typeof TIPOS_EVENTO_ICONS]}
                <div>
                  <h2 style={{ margin: 0 }}>{TIPO_EVENTO_ROTULO[visualizando.tipo as keyof typeof TIPO_EVENTO_ROTULO] ?? visualizando.tipo}</h2>
                  <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>{visualizando.equipamento?.tag} ({visualizando.equipamento?.patrimonio})</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setVisualizando(null)}><ChevronDown size={20} /></Button>
            </div>
            <div style={{ padding: spaceRem(3) }}>
              <div className="grade-formulario" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spaceRem(3) }}>
                <div><strong>Equipamento:</strong> {visualizando.equipamento?.tag} ({visualizando.equipamento?.patrimonio})</div>
                <div><strong>Item:</strong> {visualizando.item?.nome ?? '—'}</div>
                <div><strong>Lab:</strong> {visualizando.laboratorio?.sigla ?? '—'} - {visualizando.laboratorio?.nome ?? '—'}</div>
                <div><strong>Fornecedor:</strong> {visualizando.fornecedor?.razaoSocial ?? '—'}</div>
                <div><strong>Situação:</strong> <StatusBadge status={visualizando.situacao} /></div>
                <div><strong>Resultado:</strong> {visualizando.resultado ? <StatusBadge status={visualizando.resultado} /> : '—'}</div>
                <div><strong>Data Prevista:</strong> {visualizando.dataPrevista ? formatarDataBR(visualizando.dataPrevista) : '—'}</div>
                <div><strong>Data Realização:</strong> {visualizando.dataRealizacao ? formatarDataBR(visualizando.dataRealizacao) : '—'}</div>
                <div><strong>Nº Certificado:</strong> {visualizando.numeroCertificado ?? '—'}</div>
                <div><strong>Erro:</strong> {visualizando.erro ?? '—'}</div>
                <div><strong>Incerteza (U):</strong> {visualizando.incerteza ?? '—'}</div>
                <div><strong>CA Utilizado:</strong> {visualizando.caUtilizado ?? '—'}</div>
                <div><strong>Custo Estimado:</strong> {visualizando.custoEstimadoCentavos ? centavosParaReais(visualizando.custoEstimadoCentavos) : '—'}</div>
                <div><strong>Custo Realizado:</strong> {visualizando.custoRealizadoCentavos ? centavosParaReais(visualizando.custoRealizadoCentavos) : '—'}</div>
                {visualizando.problema && <div style={{ gridColumn: '1 / -1' }}><strong>Problema:</strong> {visualizando.problema}</div>}
                {visualizando.servico && <div style={{ gridColumn: '1 / -1' }}><strong>Serviço:</strong> {visualizando.servico}</div>}
                {visualizando.estadoRetorno && <div><strong>Estado de Retorno:</strong> <StatusBadge status={visualizando.estadoRetorno} /></div>}
                {visualizando.descricao && <div style={{ gridColumn: '1 / -1' }}><strong>Descrição:</strong> {visualizando.descricao}</div>}
                {visualizando.observacoes && <div style={{ gridColumn: '1 / -1' }}><strong>Observações:</strong> {visualizando.observacoes}</div>}
              </div>
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
