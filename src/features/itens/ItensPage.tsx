/**
 * ItensPage — Itens (modelos), categorias e subcategorias (RF02, catálogo).
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFuncionalidades, useUser } from '@/features/auth/store';
import { getDB } from '@/shared/db';
import type { Equipamento, Item, Categoria, Subcategoria } from '@/shared/domain';
import { Card, CardHeader, CardContent, StatusBadge, Button, Input, Select, spaceRem, PageHeader } from '@/shared/ui/components';
import { gerarULID, agoraISO } from '@/shared/utils';
import { registrarLog } from '@/shared/audit';
import { Search, Plus, ChevronDown, Edit, Trash2, Box, Folder, Tag, FolderOpen } from 'lucide-react';
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

type ItemCompleto = Item & {
  categoria?: Categoria;
  subcategoria?: Subcategoria;
  equipamentosCount?: number;
};

type Aba = 'itens' | 'categorias' | 'subcategorias';

interface FormEstado {
  nome: string; descricao: string; fabricante: string; modelo: string;
  categoriaId: string; subcategoriaId: string;
  capacidadeMedicao: string; resolucao: string; tipoIndicacao: string;
  caCalibracao: string; caVerificacao: string;
  periodicidadeCalibracaoMeses: string; periodicidadeVerificacaoMeses: string;
  periodicidadeManutencaoPreventivaMeses: string;
  ativo: boolean; ordem: string; parametrosEstimados: string[];
}

const formVazio = (): FormEstado => ({
  nome: '', descricao: '', fabricante: '', modelo: '',
  categoriaId: '', subcategoriaId: '',
  capacidadeMedicao: '', resolucao: '', tipoIndicacao: 'DIGITAL',
  caCalibracao: '', caVerificacao: '',
  periodicidadeCalibracaoMeses: '', periodicidadeVerificacaoMeses: '',
  periodicidadeManutencaoPreventivaMeses: '',
  ativo: true, ordem: '0', parametrosEstimados: [],
});

export function ItensPage() {
  const user = useUser();
  const funcionalidades = useFuncionalidades();
  const podeGerenciar = user?.perfil === 'GESTOR_LAB';
  const podeGerenciarCatalogo = user?.perfil === 'GESTOR_LAB' || user?.perfil === 'GESTOR_GERAL' || user?.perfil === 'ADMIN';

  const [itens, setItens] = useState<ItemCompleto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [filtroAtivo, setFiltroAtivo] = useState<string>('todos');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
  const [modalAberto, setModalAberto] = useState(false);
  const [abaForm, setAbaForm] = useState<Aba>('itens');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<Aba>('itens');
  const [form, setForm] = useState<FormEstado>(formVazio());

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const db = await getDB();
      const [its, cats, subs, eqs] = await Promise.all([
        db.getAll('itens'),
        db.getAll('categorias'),
        db.getAll('subcategorias'),
        db.getAll('equipamentos'),
      ]);
      const eqsByItem = (eqs as Equipamento[]).reduce<Record<string, number>>((acc, e) => { acc[e.itemId] = (acc[e.itemId] ?? 0) + 1; return acc; }, {});
      const completos: ItemCompleto[] = (its as Item[]).map((item) => ({
        ...item,
        categoria: (cats as Categoria[]).find((c) => c.id === item.categoriaId),
        subcategoria: (subs as Subcategoria[]).find((s) => s.id === item.subcategoriaId),
        equipamentosCount: eqsByItem[item.id] ?? 0,
      }));
      setItens(completos);
      setCategorias(cats);
      setSubcategorias(subs);
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const abrirNovo = useCallback((aba: Aba) => {
    setAbaForm(aba);
    setEditandoId(null);
    setForm(formVazio());
    setModalAberto(true);
  }, []);

  const abrirEdicaoItem = useCallback((item: ItemCompleto) => {
    setAbaForm('itens');
    setEditandoId(item.id);
    setForm({
      nome: item.nome, descricao: item.descricao ?? '', fabricante: item.fabricante ?? '', modelo: item.modelo ?? '',
      categoriaId: item.categoriaId, subcategoriaId: item.subcategoriaId,
      capacidadeMedicao: item.capacidadeMedicao ?? '', resolucao: item.resolucao ?? '', tipoIndicacao: item.tipoIndicacao ?? 'DIGITAL',
      caCalibracao: item.caCalibracao?.toString() ?? '', caVerificacao: item.caVerificacao?.toString() ?? '',
      periodicidadeCalibracaoMeses: item.periodicidadeCalibracaoMeses?.toString() ?? '',
      periodicidadeVerificacaoMeses: item.periodicidadeVerificacaoMeses?.toString() ?? '',
      periodicidadeManutencaoPreventivaMeses: item.periodicidadeManutencaoPreventivaMeses?.toString() ?? '',
      ativo: item.ativo, ordem: '0', parametrosEstimados: item.parametrosEstimados ?? [],
    });
    setModalAberto(true);
  }, []);

  const abrirEdicaoCategoria = useCallback((cat: Categoria) => {
    setAbaForm('categorias');
    setEditandoId(cat.id);
    setForm({ ...formVazio(), nome: cat.nome, ordem: String(cat.ordem), ativo: cat.ativo });
    setModalAberto(true);
  }, []);

  const abrirEdicaoSubcategoria = useCallback((sub: Subcategoria) => {
    setAbaForm('subcategorias');
    setEditandoId(sub.id);
    setForm({ ...formVazio(), nome: sub.nome, categoriaId: sub.categoriaId, ativo: sub.ativo });
    setModalAberto(true);
  }, []);

  const fecharModal = useCallback(() => {
    setModalAberto(false);
    setEditandoId(null);
    setForm(formVazio());
  }, []);

  const excluirItem = useCallback(async (id: string) => {
    if (!confirm('Excluir item? Os equipamentos vinculados ficarão sem item associado.')) return;
    const db = await getDB();
    await db.delete('itens', id);
    await registrarLog(db, { tabela: 'itens', registroId: id, acao: 'INATIVAR' });
    await carregarDados();
  }, [carregarDados]);

  const excluirCategoria = useCallback(async (id: string) => {
    if (!confirm('Excluir categoria? Subcategorias e itens vinculados serão afetados.')) return;
    const db = await getDB();
    await db.delete('categorias', id);
    await registrarLog(db, { tabela: 'categorias', registroId: id, acao: 'INATIVAR' });
    await carregarDados();
  }, [carregarDados]);

  const excluirSubcategoria = useCallback(async (id: string) => {
    if (!confirm('Excluir subcategoria? Os itens vinculados ficarão sem subcategoria.')) return;
    const db = await getDB();
    await db.delete('subcategorias', id);
    await registrarLog(db, { tabela: 'subcategorias', registroId: id, acao: 'INATIVAR' });
    await carregarDados();
  }, [carregarDados]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome) return;
    setSalvando(true);
    try {
      const db = await getDB();
      const agora = agoraISO();
      if (abaForm === 'itens') {
        if (!form.categoriaId) return;
        const dados: any = {
          ...(editandoId ? { id: editandoId } : { id: gerarULID(), criadoEm: agora }),
          chave: (editandoId ? (itens.find((i) => i.id === editandoId)?.chave) : (Date.now() % 1000000000)) as number,
          nome: form.nome, descricao: form.descricao, fabricante: form.fabricante, modelo: form.modelo,
          categoriaId: form.categoriaId, subcategoriaId: form.subcategoriaId || null,
          capacidadeMedicao: form.capacidadeMedicao || null, resolucao: form.resolucao || null,
          tipoIndicacao: form.tipoIndicacao || null,
          caCalibracao: form.caCalibracao !== '' ? Number(form.caCalibracao) : null,
          caVerificacao: form.caVerificacao !== '' ? Number(form.caVerificacao) : null,
          periodicidadeCalibracaoMeses: Number(form.periodicidadeCalibracaoMeses) || 0,
          periodicidadeVerificacaoMeses: Number(form.periodicidadeVerificacaoMeses) || 0,
          periodicidadeManutencaoPreventivaMeses: Number(form.periodicidadeManutencaoPreventivaMeses) || 0,
          ativo: form.ativo, parametrosEstimados: form.parametrosEstimados,
          atualizadoEm: agora,
        };
        if (dados.subcategoriaId === '') dados.subcategoriaId = null;
        await db.put('itens', dados);
        await registrarLog(db, { tabela: 'itens', registroId: dados.id, acao: editandoId ? 'ATUALIZAR' : 'CRIAR', dadosNovos: dados });
      } else if (abaForm === 'categorias') {
        const dados: any = {
          ...(editandoId ? { id: editandoId } : { id: gerarULID(), criadoEm: agora }),
          nome: form.nome, ordem: Number(form.ordem) || 0, ativo: form.ativo, atualizadoEm: agora,
        };
        await db.put('categorias', dados);
        await registrarLog(db, { tabela: 'categorias', registroId: dados.id, acao: editandoId ? 'ATUALIZAR' : 'CRIAR', dadosNovos: dados });
      } else {
        if (!form.categoriaId) return;
        const dados: any = {
          ...(editandoId ? { id: editandoId } : { id: gerarULID(), criadoEm: agora }),
          nome: form.nome, categoriaId: form.categoriaId, ativo: form.ativo, atualizadoEm: agora,
        };
        await db.put('subcategorias', dados);
        await registrarLog(db, { tabela: 'subcategorias', registroId: dados.id, acao: editandoId ? 'ATUALIZAR' : 'CRIAR', dadosNovos: dados });
      }
      fecharModal();
      await carregarDados();
    } catch (e) {
      console.error(e);
    } finally {
      setSalvando(false);
    }
  }, [abaForm, form, editandoId, itens, carregarDados, fecharModal]);

  const dadosFiltrados = useMemo(() => {
    return itens.filter((item) => {
      const matchTexto = !filtroTexto ||
        (item.nome ?? '').toLowerCase().includes(filtroTexto.toLowerCase()) ||
        (item.fabricante ?? '').toLowerCase().includes(filtroTexto.toLowerCase()) ||
        (item.modelo ?? '').toLowerCase().includes(filtroTexto.toLowerCase()) ||
        (item.categoria?.nome ?? '').toLowerCase().includes(filtroTexto.toLowerCase()) ||
        (item.subcategoria?.nome ?? '').toLowerCase().includes(filtroTexto.toLowerCase());
      const matchCat = filtroCategoria === 'todas' || item.categoriaId === filtroCategoria;
      const matchAtivo = filtroAtivo === 'todos' || (filtroAtivo === 'ativos' ? item.ativo : !item.ativo);
      return matchTexto && matchCat && matchAtivo;
    });
  }, [itens, filtroTexto, filtroCategoria, filtroAtivo]);

  const columns = useMemo<ColumnDef<ItemCompleto>[]>(() => [
    {
      accessorKey: 'nome',
      header: 'Nome',
      cell: (info) => <span style={{ fontWeight: 500 }}>{info.getValue() as string}</span>,
      size: 200,
    },
    {
      accessorKey: 'fabricante',
      header: 'Fabricante',
      cell: (info) => <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>{String(info.getValue() ?? '—')}</span>,
      size: 150,
    },
    {
      accessorKey: 'modelo',
      header: 'Modelo',
      cell: (info) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}>{String(info.getValue() ?? '—')}</span>,
      size: 130,
    },
    {
      accessorKey: 'categoria.nome',
      header: 'Categoria',
      cell: (info) => <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{String(info.getValue() ?? '—')}</span>,
      size: 120,
    },
    {
      accessorKey: 'subcategoria.nome',
      header: 'Subcategoria',
      cell: (info) => <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>{String(info.getValue() ?? '—')}</span>,
      size: 120,
    },
    {
      accessorKey: 'periodicidadeCalibracaoMeses',
      header: 'Per. Cal. (meses)',
      cell: (info) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}>{String(info.getValue() ?? 0)}</span>,
      size: 110,
    },
    {
      accessorKey: 'periodicidadeVerificacaoMeses',
      header: 'Per. Ver. (meses)',
      cell: (info) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}>{String(info.getValue() ?? 0)}</span>,
      size: 110,
    },
    {
      accessorKey: 'ativo',
      header: 'Status',
      cell: (info) => <StatusBadge status={info.getValue() ? 'ATIVO' : 'INATIVO'} size="sm" />,
      size: 80,
    },
    {
      accessorKey: 'equipamentosCount',
      header: 'Equipamentos',
      cell: (info) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-accent)' }}>{String(info.getValue())}</span>,
      size: 100,
    },
    {
      id: 'acoes',
      header: 'Ações',
      cell: (info) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          {podeGerenciar && <Button variant="ghost" size="sm" onClick={() => abrirEdicaoItem(info.row.original)} title="Editar"><Edit size={14} /></Button>}
          {podeGerenciar && <Button variant="ghost" size="sm" onClick={() => excluirItem(info.row.original.id)} title="Excluir"><Trash2 size={14} style={{ color: 'var(--color-danger)' }} /></Button>}
        </div>
      ),
      size: 90,
    },
  ], [podeGerenciar, abrirEdicaoItem, excluirItem]);

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

  const abaStyle = (ativa: boolean): React.CSSProperties => ({
    padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: ativa ? 'var(--color-accent-bg)' : 'transparent',
    border: 'none', borderBottom: ativa ? '2px solid var(--color-accent)' : '2px solid transparent',
    color: ativa ? 'var(--color-accent)' : 'var(--color-fg-muted)',
    fontWeight: 600, fontSize: 'var(--font-size-sm)', cursor: 'pointer', transition: 'all var(--transition-base)',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spaceRem(3) }}>
      <PageHeader
        eyebrow="Catálogo"
        titulo="Itens & Catálogo"
        subtitulo={`${itens.length} itens • ${categorias.length} categorias • ${subcategorias.length} subcategorias`}
        acoes={<>
          {podeGerenciar && <Button onClick={() => abrirNovo('itens')} leftIcon={<Plus size={16} />}>Novo Item</Button>}
          {podeGerenciarCatalogo && <Button variant="secondary" onClick={() => abrirNovo('categorias')} leftIcon={<Plus size={16} />}>Nova Categoria</Button>}
          {podeGerenciarCatalogo && <Button variant="secondary" onClick={() => abrirNovo('subcategorias')} leftIcon={<Plus size={16} />}>Nova Subcategoria</Button>}
        </>}
      />

      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--color-border)', marginBottom: spaceRem(2) }}>
        <button onClick={() => setAbaAtiva('itens')} style={abaStyle(abaAtiva === 'itens')}><Box size={16} /> Itens ({itens.length})</button>
        <button onClick={() => setAbaAtiva('categorias')} style={abaStyle(abaAtiva === 'categorias')}><Folder size={16} /> Categorias ({categorias.length})</button>
        <button onClick={() => setAbaAtiva('subcategorias')} style={abaStyle(abaAtiva === 'subcategorias')}><Tag size={16} /> Subcategorias ({subcategorias.length})</button>
      </div>

      {abaAtiva === 'itens' && (
        <>
          <Card style={{ border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
            <CardHeader title="Filtros" />
            <CardContent style={{ display: 'flex', flexWrap: 'wrap', gap: spaceRem(3), alignItems: 'flex-end', borderBottom: '2px solid var(--color-border)', paddingBottom: spaceRem(2), marginBottom: spaceRem(2) }}>
              <Input placeholder="Buscar (nome, fabricante, modelo, categoria...)" value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} leftIcon={<Search size={16} />} style={{ minWidth: 280 }} />
              <Select label="Categoria" value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} options={[{ value: 'todas', label: 'Todas' }, ...categorias.map((c) => ({ value: c.id, label: c.nome }))]} />
              <Select label="Status" value={filtroAtivo} onChange={(e) => setFiltroAtivo(e.target.value)} options={[{ value: 'todos', label: 'Todos' }, { value: 'ativos', label: 'Ativos' }, { value: 'inativos', label: 'Inativos' }]} />
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
                    <tr><td colSpan={columns.length} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-fg-muted)' }}>Nenhum item encontrado</td></tr>
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

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: spaceRem(3), flexWrap: 'wrap', gap: spaceRem(2), borderTop: '2px solid var(--color-border)', marginTop: spaceRem(2) }}>
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
        </>
      )}

      {abaAtiva === 'categorias' && (
        <Card style={{ border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
          <CardHeader title="Categorias" subtitle={`${categorias.length} categorias cadastradas`} />
          <CardContent>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: spaceRem(2) }}>
              {categorias.map((cat) => (
                <div key={cat.id} style={{ padding: spaceRem(2), border: '2px solid var(--color-border)', borderRadius: '0', background: 'var(--color-bg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>{cat.nome}</h4>
                    <StatusBadge status={cat.ativo ? 'ATIVO' : 'INATIVO'} size="sm" />
                  </div>
                  <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>
                    Ordem: {cat.ordem} • {subcategorias.filter((s) => s.categoriaId === cat.id).length} subcategorias
                  </p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    {podeGerenciarCatalogo && <Button variant="ghost" size="sm" onClick={() => abrirEdicaoCategoria(cat)} leftIcon={<Edit size={14} />}>Editar</Button>}
                    {podeGerenciarCatalogo && <Button variant="ghost" size="sm" onClick={() => excluirCategoria(cat.id)} leftIcon={<Trash2 size={14} style={{ color: 'var(--color-danger)' }} />} title="Excluir" />}
                  </div>
                </div>
              ))}
              {categorias.length === 0 && <p style={{ textAlign: 'center', color: 'var(--color-fg-muted)', padding: '32px' }}>Nenhuma categoria cadastrada</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {abaAtiva === 'subcategorias' && (
        <Card style={{ border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
          <CardHeader title="Subcategorias" subtitle={`${subcategorias.length} subcategorias cadastradas`} />
          <CardContent>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: spaceRem(2) }}>
              {subcategorias.map((sub) => (
                <div key={sub.id} style={{ padding: spaceRem(2), border: '2px solid var(--color-border)', borderRadius: '0', background: 'var(--color-bg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>{sub.nome}</h4>
                    <StatusBadge status={sub.ativo ? 'ATIVO' : 'INATIVO'} size="sm" />
                  </div>
                  <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>Categoria: {categorias.find((c) => c.id === sub.categoriaId)?.nome ?? '—'}</p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    {podeGerenciarCatalogo && <Button variant="ghost" size="sm" onClick={() => abrirEdicaoSubcategoria(sub)} leftIcon={<Edit size={14} />}>Editar</Button>}
                    {podeGerenciarCatalogo && <Button variant="ghost" size="sm" onClick={() => excluirSubcategoria(sub.id)} leftIcon={<Trash2 size={14} style={{ color: 'var(--color-danger)' }} />} title="Excluir" />}
                  </div>
                </div>
              ))}
              {subcategorias.length === 0 && <p style={{ textAlign: 'center', color: 'var(--color-fg-muted)', padding: '32px' }}>Nenhuma subcategoria cadastrada</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {modalAberto && (
        <div className="overlay-modal" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: spaceRem(3) }} onClick={fecharModal}>
          <div style={{ background: 'var(--color-bg-elevated)', border: '2px solid var(--color-accent)', borderRadius: '0', width: '100%', maxWidth: abaForm === 'itens' ? '720px' : '480px', maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow-md)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: spaceRem(3), borderBottom: '2px solid var(--color-border)' }}>
              <h2 style={{ margin: 0 }}>
                {abaForm === 'itens' ? (editandoId ? 'Editar Item' : 'Novo Item') : abaForm === 'categorias' ? (editandoId ? 'Editar Categoria' : 'Nova Categoria') : (editandoId ? 'Editar Subcategoria' : 'Nova Subcategoria')}
              </h2>
              <Button variant="ghost" size="sm" onClick={fecharModal}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-label="Fechar"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></Button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: spaceRem(3), display: 'flex', flexDirection: 'column', gap: spaceRem(3) }}>
              {abaForm === 'categorias' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: spaceRem(3) }}>
                  <Input label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required fullWidth />
                  <Input label="Ordem" type="number" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: e.target.value })} fullWidth />
                  <Select label="Status" value={form.ativo ? 'true' : 'false'} onChange={(e) => setForm({ ...form, ativo: e.target.value === 'true' })} options={[{ value: 'true', label: 'Ativo' }, { value: 'false', label: 'Inativo' }]} fullWidth />
                </div>
              )}
              {abaForm === 'subcategorias' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: spaceRem(3) }}>
                  <Input label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required fullWidth />
                  <Select label="Categoria" value={form.categoriaId} onChange={(e) => setForm({ ...form, categoriaId: e.target.value })} options={categorias.map((c) => ({ value: c.id, label: c.nome }))} required fullWidth />
                  <Select label="Status" value={form.ativo ? 'true' : 'false'} onChange={(e) => setForm({ ...form, ativo: e.target.value === 'true' })} options={[{ value: 'true', label: 'Ativo' }, { value: 'false', label: 'Inativo' }]} fullWidth />
                </div>
              )}
              {abaForm === 'itens' && (
                <div className="grade-formulario" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spaceRem(3) }}>
                  <Input label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required fullWidth />
                  <Input label="Fabricante" value={form.fabricante} onChange={(e) => setForm({ ...form, fabricante: e.target.value })} fullWidth />
                  <Input label="Modelo" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} fullWidth />
                  <Select label="Categoria" value={form.categoriaId} onChange={(e) => setForm({ ...form, categoriaId: e.target.value, subcategoriaId: '' })} options={categorias.map((c) => ({ value: c.id, label: c.nome }))} required fullWidth />
                  <Select label="Subcategoria" value={form.subcategoriaId} onChange={(e) => setForm({ ...form, subcategoriaId: e.target.value })} options={subcategorias.filter((s) => s.categoriaId === form.categoriaId).map((s) => ({ value: s.id, label: s.nome }))} fullWidth />
                  <Input label="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} fullWidth />
                  <Input label="Capacidade de Medição" value={form.capacidadeMedicao} onChange={(e) => setForm({ ...form, capacidadeMedicao: e.target.value })} fullWidth />
                  <Input label="Resolução" value={form.resolucao} onChange={(e) => setForm({ ...form, resolucao: e.target.value })} fullWidth />
                  <Select label="Tipo Indicação" value={form.tipoIndicacao} onChange={(e) => setForm({ ...form, tipoIndicacao: e.target.value })} options={[{ value: 'ANALOGICO', label: 'Analógico (A)' }, { value: 'DIGITAL', label: 'Digital (D)' }]} fullWidth />
                  <Input label="CA Calibração" type="number" step="any" value={form.caCalibracao} onChange={(e) => setForm({ ...form, caCalibracao: e.target.value })} fullWidth />
                  <Input label="CA Verificação" type="number" step="any" value={form.caVerificacao} onChange={(e) => setForm({ ...form, caVerificacao: e.target.value })} fullWidth />
                  <Input label="Periodicidade Calibração (meses)" type="number" value={form.periodicidadeCalibracaoMeses} onChange={(e) => setForm({ ...form, periodicidadeCalibracaoMeses: e.target.value })} fullWidth />
                  <Input label="Periodicidade Verificação (meses)" type="number" value={form.periodicidadeVerificacaoMeses} onChange={(e) => setForm({ ...form, periodicidadeVerificacaoMeses: e.target.value })} fullWidth />
                  <Input label="Periodicidade Manutenção (meses)" type="number" value={form.periodicidadeManutencaoPreventivaMeses} onChange={(e) => setForm({ ...form, periodicidadeManutencaoPreventivaMeses: e.target.value })} fullWidth />
                  <Select label="Status" value={form.ativo ? 'true' : 'false'} onChange={(e) => setForm({ ...form, ativo: e.target.value === 'true' })} options={[{ value: 'true', label: 'Ativo' }, { value: 'false', label: 'Inativo' }]} fullWidth />
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spaceRem(2), paddingTop: spaceRem(3), borderTop: '2px solid var(--color-border)' }}>
                <Button variant="outline" onClick={fecharModal}>Cancelar</Button>
                <Button type="submit" loading={salvando}>{editandoId ? 'Salvar Alterações' : 'Criar'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
