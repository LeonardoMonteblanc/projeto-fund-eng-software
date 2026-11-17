/**
 * FornecedoresPage — Cadastro de fornecedores (RF16).
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFuncionalidades } from '@/features/auth/store';
import { getDB } from '@/shared/db';
import type { Fornecedor } from '@/shared/domain';
import { Card, CardHeader, CardContent, StatusBadge, Button, Input, Select, spaceRem } from '@/shared/ui/components';
import { gerarULID, agoraISO, validarCNPJ, validarEmail } from '@/shared/utils';
import { registrarLog } from '@/shared/audit';
import { Search, Plus, ChevronDown, Edit, Trash2, Truck } from 'lucide-react';

interface FormFornecedor {
  razaoSocial: string; cnpj: string; telefone: string; email: string;
  situacao: 'ATIVO' | 'INATIVO'; observacoes: string;
}

const formVazio = (): FormFornecedor => ({ razaoSocial: '', cnpj: '', telefone: '', email: '', situacao: 'ATIVO', observacoes: '' });

export function FornecedoresPage() {
  const funcionalidades = useFuncionalidades();
  const podeGerenciar = funcionalidades.some((f) => f.acessivel && f.codigo === 'F06');

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState<string>('todas');
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState<FormFornecedor>(formVazio());

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const db = await getDB();
      setFornecedores(await db.getAll('fornecedores'));
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
    setEditandoId(null);
    setErro(null);
    setForm(formVazio());
    setModalAberto(true);
  }, []);

  const abrirEdicao = useCallback((f: Fornecedor) => {
    setEditandoId(f.id);
    setErro(null);
    setForm({ razaoSocial: f.razaoSocial, cnpj: f.cnpj, telefone: f.telefone ?? '', email: f.email ?? '', situacao: f.situacao, observacoes: f.observacoes ?? '' });
    setModalAberto(true);
  }, []);

  const fecharModal = useCallback(() => {
    setModalAberto(false);
    setEditandoId(null);
    setErro(null);
    setForm(formVazio());
  }, []);

  const excluir = useCallback(async (id: string) => {
    if (!confirm('Excluir fornecedor?')) return;
    const db = await getDB();
    await db.delete('fornecedores', id);
    await registrarLog(db, { tabela: 'fornecedores', registroId: id, acao: 'INATIVAR' });
    await carregarDados();
  }, [carregarDados]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!form.razaoSocial || !form.cnpj) return;
    if (!validarCNPJ(form.cnpj)) { setErro('CNPJ inválido.'); return; }
    if (form.email && !validarEmail(form.email)) { setErro('E-mail inválido.'); return; }
    setSalvando(true);
    try {
      const db = await getDB();
      const agora = agoraISO();
      const dados: any = {
        ...(editandoId ? { id: editandoId } : { id: gerarULID(), criadoEm: agora }),
        razaoSocial: form.razaoSocial, cnpj: form.cnpj, telefone: form.telefone || undefined,
        email: form.email || undefined, situacao: form.situacao, observacoes: form.observacoes || undefined,
        atualizadoEm: agora,
      };
      await db.put('fornecedores', dados);
      await registrarLog(db, { tabela: 'fornecedores', registroId: dados.id, acao: editandoId ? 'ATUALIZAR' : 'CRIAR', dadosNovos: dados });
      fecharModal();
      await carregarDados();
    } catch (e) {
      console.error(e);
    } finally {
      setSalvando(false);
    }
  }, [form, editandoId, carregarDados, fecharModal]);

  const dadosFiltrados = useMemo(() => {
    return fornecedores.filter((f) => {
      const matchTexto = !filtroTexto ||
        f.razaoSocial.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        f.cnpj.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        (f.email ?? '').toLowerCase().includes(filtroTexto.toLowerCase());
      const matchSit = filtroSituacao === 'todas' || f.situacao === filtroSituacao;
      return matchTexto && matchSit;
    });
  }, [fornecedores, filtroTexto, filtroSituacao]);

  if (carregando) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}><div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%' }} /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spaceRem(3) }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spaceRem(2) }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spaceRem(2), marginBottom: '4px' }}>
            <Truck size={28} style={{ color: 'var(--color-accent)' }} />
            <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-fg)', margin: 0 }}>Fornecedores</h1>
          </div>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)', margin: '4px 0 0' }}>{fornecedores.length} fornecedores cadastrados</p>
        </div>
        {podeGerenciar && <Button onClick={abrirNovo} leftIcon={<Plus size={16} />}>Novo Fornecedor</Button>}
      </div>

      <Card style={{ border: '1px solid var(--color-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <CardHeader title="Filtros" />
        <CardContent style={{ display: 'flex', flexWrap: 'wrap', gap: spaceRem(3), alignItems: 'flex-end', borderBottom: '1px solid var(--color-border)', paddingBottom: spaceRem(2), marginBottom: spaceRem(2) }}>
          <Input placeholder="Buscar (razão social, CNPJ, e-mail...)" value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} leftIcon={<Search size={16} />} style={{ minWidth: 280 }} />
          <Select label="Situação" value={filtroSituacao} onChange={(e) => setFiltroSituacao(e.target.value)} options={[{ value: 'todas', label: 'Todas' }, { value: 'ATIVO', label: 'Ativo' }, { value: 'INATIVO', label: 'Inativo' }]} />
        </CardContent>
      </Card>

      <Card style={{ border: '1px solid var(--color-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <CardContent>
          {dadosFiltrados.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--color-fg-muted)', padding: '40px' }}>Nenhum fornecedor encontrado</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: spaceRem(2) }}>
              {dadosFiltrados.map((f) => (
                <div key={f.id} style={{ padding: spaceRem(2), border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>{f.razaoSocial}</h4>
                    <StatusBadge status={f.situacao} size="sm" />
                  </div>
                  <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-mono)', color: 'var(--color-fg-muted)' }}>CNPJ: {f.cnpj}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>{f.telefone ?? 'Sem telefone'} • {f.email ?? 'Sem e-mail'}</p>
                  {f.observacoes && <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-dim)' }}>{f.observacoes}</p>}
                  {podeGerenciar && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <Button variant="ghost" size="sm" onClick={() => abrirEdicao(f)} leftIcon={<Edit size={14} />}>Editar</Button>
                      <Button variant="ghost" size="sm" onClick={() => excluir(f.id)} leftIcon={<Trash2 size={14} style={{ color: 'var(--color-danger)' }} />} title="Excluir" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {modalAberto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: spaceRem(3) }} onClick={fecharModal}>
          <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '10px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: spaceRem(3), borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ margin: 0 }}>{editandoId ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
              <Button variant="ghost" size="sm" onClick={fecharModal}><ChevronDown size={20} /></Button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: spaceRem(3), display: 'flex', flexDirection: 'column', gap: spaceRem(3) }}>
              <Input label="Razão Social" value={form.razaoSocial} onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })} required fullWidth />
              <Input label="CNPJ" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} required fullWidth placeholder="00.000.000/0000-00" />
              <Input label="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} fullWidth />
              <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} fullWidth />
              <Select label="Situação" value={form.situacao} onChange={(e) => setForm({ ...form, situacao: e.target.value as 'ATIVO' | 'INATIVO' })} options={[{ value: 'ATIVO', label: 'Ativo' }, { value: 'INATIVO', label: 'Inativo' }]} fullWidth />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label htmlFor="fornecedor-observacoes" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-fg)' }}>Observações</label>
                <textarea id="fornecedor-observacoes" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={3} style={{ width: '100%', padding: '10px 12px', fontSize: 'var(--font-size-base)', border: '1px solid var(--color-border-input)', borderRadius: '4px', background: 'var(--color-bg)', color: 'var(--color-fg)', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} />
              </div>
              {erro && <p style={{ margin: 0, padding: '10px 12px', backgroundColor: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)', borderRadius: '4px', color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>{erro}</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spaceRem(2), paddingTop: spaceRem(3), borderTop: '1px solid var(--color-border)' }}>
                <Button variant="outline" onClick={fecharModal}>Cancelar</Button>
                <Button type="submit" loading={salvando}>{editandoId ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
