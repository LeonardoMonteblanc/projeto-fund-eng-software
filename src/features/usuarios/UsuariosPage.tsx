/**
 * UsuariosPage — Cadastro e gestão de usuários e perfis (RF06).
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFuncionalidades } from '@/features/auth/store';
import { getDB } from '@/shared/db';
import { PERFIS, PERFIL_ROTULO, PERFIL_DESCRICAO } from '@/shared/constants';
import type { Usuario, Laboratorio } from '@/shared/domain';
import { Card, CardHeader, CardContent, StatusBadge, Button, Input, Select, spaceRem, PageHeader } from '@/shared/ui/components';
import { gerarULID, agoraISO, validarEmail } from '@/shared/utils';
import { registrarLog } from '@/shared/audit';
import { Search, Plus, ChevronDown, Edit, Trash2, Users } from 'lucide-react';

interface FormUsuario {
  nome: string; email: string; perfil: string; laboratorioId: string; ativo: boolean;
}

const formVazio = (): FormUsuario => ({ nome: '', email: '', perfil: 'TECNICO', laboratorioId: '', ativo: true });

const exigeLab = (perfil: string) => perfil === 'GESTOR_LAB' || perfil === 'TECNICO';

export function UsuariosPage() {
  const funcionalidades = useFuncionalidades();
  const podeGerenciar = funcionalidades.some((f) => f.acessivel && f.codigo === 'F08');

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [labs, setLabs] = useState<Laboratorio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroPerfil, setFiltroPerfil] = useState<string>('todos');
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState<FormUsuario>(formVazio());

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const db = await getDB();
      const [us, lss] = await Promise.all([db.getAll('users'), db.getAll('labs')]);
      setUsuarios(us);
      setLabs(lss);
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

  const abrirEdicao = useCallback((u: Usuario) => {
    setEditandoId(u.id);
    setErro(null);
    setForm({ nome: u.nome, email: u.email, perfil: u.perfil, laboratorioId: u.laboratorioId ?? '', ativo: u.ativo });
    setModalAberto(true);
  }, []);

  const fecharModal = useCallback(() => {
    setModalAberto(false);
    setEditandoId(null);
    setErro(null);
    setForm(formVazio());
  }, []);

  const inativar = useCallback(async (id: string) => {
    if (!confirm('Inativar usuário? O acesso será bloqueado.')) return;
    const db = await getDB();
    const usuario = usuarios.find((u) => u.id === id);
    if (usuario) {
      await db.put('users', { ...usuario, ativo: false, atualizadoEm: agoraISO() });
      await registrarLog(db, { tabela: 'usuarios', registroId: id, acao: 'INATIVAR' });
    }
    await carregarDados();
  }, [usuarios, carregarDados]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!form.nome || !form.email) return;
    if (!validarEmail(form.email)) { setErro('E-mail inválido.'); return; }
    if (exigeLab(form.perfil) && !form.laboratorioId) { setErro('Perfis de Gestor de Laboratório e Técnico exigem vínculo com um laboratório.'); return; }
    setSalvando(true);
    try {
      const db = await getDB();
      const existentes: Usuario[] = await db.getAll('users');
      const emailDuplicado = existentes.some((u) => u.email === form.email.trim().toLowerCase() && u.id !== editandoId);
      if (emailDuplicado) { setErro('Já existe um usuário com esse e-mail.'); setSalvando(false); return; }
      const agora = agoraISO();
      const dados: any = {
        ...(editandoId ? { id: editandoId } : { id: gerarULID(), criadoEm: agora }),
        nome: form.nome, email: form.email.trim().toLowerCase(), perfil: form.perfil,
        laboratorioId: exigeLab(form.perfil) ? form.laboratorioId : undefined,
        ativo: form.ativo, atualizadoEm: agora,
      };
      await db.put('users', dados);
      await registrarLog(db, { tabela: 'usuarios', registroId: dados.id, acao: editandoId ? 'ATUALIZAR' : 'CRIAR', dadosNovos: dados });
      fecharModal();
      await carregarDados();
    } catch (e) {
      console.error(e);
    } finally {
      setSalvando(false);
    }
  }, [form, editandoId, carregarDados, fecharModal]);

  const dadosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      const matchTexto = !filtroTexto ||
        u.nome.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        u.email.toLowerCase().includes(filtroTexto.toLowerCase());
      const matchPerfil = filtroPerfil === 'todos' || u.perfil === filtroPerfil;
      return matchTexto && matchPerfil;
    });
  }, [usuarios, filtroTexto, filtroPerfil]);

  if (carregando) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}><div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%' }} /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spaceRem(3) }}>
      <PageHeader
        eyebrow="Administração"
        titulo="Usuários"
        subtitulo={`${usuarios.length} usuários cadastrados`}
        acoes={<>{podeGerenciar && <Button onClick={abrirNovo} leftIcon={<Plus size={16} />}>Novo Usuário</Button>}</>}
      />

      <Card style={{ border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader title="Filtros" />
        <CardContent style={{ display: 'flex', flexWrap: 'wrap', gap: spaceRem(3), alignItems: 'flex-end', borderBottom: '2px solid var(--color-border)', paddingBottom: spaceRem(2), marginBottom: spaceRem(2) }}>
          <Input placeholder="Buscar (nome, e-mail...)" value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} leftIcon={<Search size={16} />} style={{ minWidth: 280 }} />
          <Select label="Perfil" value={filtroPerfil} onChange={(e) => setFiltroPerfil(e.target.value)} options={[{ value: 'todos', label: 'Todos' }, ...Object.values(PERFIS).map((p) => ({ value: p, label: PERFIL_ROTULO[p as keyof typeof PERFIL_ROTULO] }))]} />
        </CardContent>
      </Card>

      <Card style={{ border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <CardContent>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: spaceRem(2) }}>
            {dadosFiltrados.map((u) => {
              const lab = labs.find((l) => l.id === u.laboratorioId);
              return (
                <div key={u.id} style={{ padding: spaceRem(2), border: '2px solid var(--color-border)', borderRadius: '0', background: 'var(--color-bg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>{u.nome}</h4>
                    <StatusBadge status={u.ativo ? 'ATIVO' : 'INATIVO'} size="sm" />
                  </div>
                  <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>{u.email}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-accent)' }}>
                    {PERFIL_ROTULO[u.perfil as keyof typeof PERFIL_ROTULO] ?? u.perfil}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-dim)' }}>{PERFIL_DESCRICAO[u.perfil as keyof typeof PERFIL_DESCRICAO]}</p>
                  {lab && <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-dim)' }}>Vínculo: {lab.sigla} — {lab.nome}</p>}
                  {podeGerenciar && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <Button variant="ghost" size="sm" onClick={() => abrirEdicao(u)} leftIcon={<Edit size={14} />}>Editar</Button>
                      {u.ativo && <Button variant="ghost" size="sm" onClick={() => inativar(u.id)} leftIcon={<Trash2 size={14} style={{ color: 'var(--color-danger)' }} />} title="Inativar" />}
                    </div>
                  )}
                </div>
              );
            })}
            {dadosFiltrados.length === 0 && <p style={{ textAlign: 'center', color: 'var(--color-fg-muted)', padding: '40px' }}>Nenhum usuário encontrado</p>}
          </div>
        </CardContent>
      </Card>

      {modalAberto && (
        <div className="overlay-modal" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: spaceRem(3) }} onClick={fecharModal}>
          <div style={{ background: 'var(--color-bg-elevated)', border: '2px solid var(--color-accent)', borderRadius: '0', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow-md)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: spaceRem(3), borderBottom: '2px solid var(--color-border)' }}>
              <h2 style={{ margin: 0 }}>{editandoId ? 'Editar Usuário' : 'Novo Usuário'}</h2>
              <Button variant="ghost" size="sm" onClick={fecharModal}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-label="Fechar"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></Button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: spaceRem(3), display: 'flex', flexDirection: 'column', gap: spaceRem(3) }}>
              <Input label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required fullWidth />
              <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required fullWidth />
              <Select label="Perfil" value={form.perfil} onChange={(e) => setForm({ ...form, perfil: e.target.value, laboratorioId: exigeLab(e.target.value) ? form.laboratorioId : '' })} fullWidth
                options={Object.values(PERFIS).map((p) => ({ value: p, label: PERFIL_ROTULO[p as keyof typeof PERFIL_ROTULO] }))} />
              {exigeLab(form.perfil) && (
                <Select label="Laboratório" value={form.laboratorioId} onChange={(e) => setForm({ ...form, laboratorioId: e.target.value })} required fullWidth
                  options={labs.map((l) => ({ value: l.id, label: `${l.sigla} — ${l.nome}` }))} />
              )}
              <Select label="Situação" value={form.ativo ? 'true' : 'false'} onChange={(e) => setForm({ ...form, ativo: e.target.value === 'true' })} options={[{ value: 'true', label: 'Ativo' }, { value: 'false', label: 'Inativo' }]} fullWidth />
              {erro && <p style={{ margin: 0, padding: '10px 12px', backgroundColor: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)', borderRadius: '0', color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>{erro}</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spaceRem(2), paddingTop: spaceRem(3), borderTop: '2px solid var(--color-border)' }}>
                <Button variant="outline" onClick={fecharModal}>Cancelar</Button>
                <Button type="submit" loading={salvando}>{editandoId ? 'Salvar Alterações' : 'Cadastrar Usuário'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
