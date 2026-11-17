/**
 * LaboratoriosPage — Cadastro de laboratórios (RF07) e receita mensal (RF15).
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFuncionalidades } from '@/features/auth/store';
import { getDB } from '@/shared/db';
import type { Laboratorio } from '@/shared/domain';
import { Card, CardHeader, CardContent, StatusBadge, Button, Input, Select, spaceRem, PageHeader } from '@/shared/ui/components';
import { gerarULID, agoraISO, centavosParaReais, reaisParaCentavos } from '@/shared/utils';
import { registrarLog } from '@/shared/audit';
import { Search, Plus, ChevronDown, Edit, Trash2, FlaskConical } from 'lucide-react';

interface FormLab {
  sigla: string; nome: string; codigo: string; responsavelTecnico: string; ramal: string;
  bloco: string; sala: string; localizacao: string; receitaMensalCentavos: string; ativo: boolean;
}

const formVazio = (): FormLab => ({ sigla: '', nome: '', codigo: '', responsavelTecnico: '', ramal: '', bloco: '', sala: '', localizacao: '', receitaMensalCentavos: '', ativo: true });

export function LaboratoriosPage() {
  const funcionalidades = useFuncionalidades();
  const podeGerenciar = funcionalidades.some((f) => f.acessivel && f.codigo === 'F07');

  const [labs, setLabs] = useState<Laboratorio[]>([]);
  const [equipamentosPorLab, setEquipamentosPorLab] = useState<Record<string, number>>({});
  const [carregando, setCarregando] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState<FormLab>(formVazio());

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const db = await getDB();
      const [lss, eqs] = await Promise.all([db.getAll('labs'), db.getAll('equipamentos')]);
      const porLab: Record<string, number> = {};
      (eqs as any[]).forEach((e) => { porLab[e.laboratorioId] = (porLab[e.laboratorioId] ?? 0) + 1; });
      setEquipamentosPorLab(porLab);
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

  const abrirEdicao = useCallback((l: Laboratorio) => {
    setEditandoId(l.id);
    setErro(null);
    setForm({
      sigla: l.sigla, nome: l.nome, codigo: l.codigo,
      responsavelTecnico: l.responsavelTecnico ?? '', ramal: l.ramal ?? '',
      bloco: l.bloco ?? '', sala: l.sala ?? '', localizacao: l.localizacao ?? '',
      receitaMensalCentavos: String((l.receitaMensalCentavos ?? 0) / 100), ativo: l.ativo,
    });
    setModalAberto(true);
  }, []);

  const fecharModal = useCallback(() => {
    setModalAberto(false);
    setEditandoId(null);
    setErro(null);
    setForm(formVazio());
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!form.sigla || !form.nome || !form.codigo) return;
    setSalvando(true);
    try {
      const db = await getDB();
      const labsExistentes: Laboratorio[] = await db.getAll('labs');
      const siglaDuplicada = labsExistentes.some((l) => l.sigla === form.sigla.trim().toUpperCase() && l.id !== editandoId);
      if (siglaDuplicada) { setErro('Já existe um laboratório com essa sigla.'); setSalvando(false); return; }
      const agora = agoraISO();
      const dados: any = {
        ...(editandoId ? { id: editandoId } : { id: gerarULID(), criadoEm: agora }),
        sigla: form.sigla.trim().toUpperCase(), nome: form.nome, codigo: form.codigo,
        responsavelTecnico: form.responsavelTecnico || undefined, ramal: form.ramal || undefined,
        bloco: form.bloco || undefined, sala: form.sala || undefined, localizacao: form.localizacao || undefined,
        receitaMensalCentavos: form.receitaMensalCentavos !== '' ? reaisParaCentavos(form.receitaMensalCentavos) : 0,
        ativo: form.ativo, atualizadoEm: agora,
      };
      await db.put('labs', dados);
      await registrarLog(db, { tabela: 'laboratorios', registroId: dados.id, acao: editandoId ? 'ATUALIZAR' : 'CRIAR', dadosNovos: dados });
      fecharModal();
      await carregarDados();
    } catch (e) {
      console.error(e);
    } finally {
      setSalvando(false);
    }
  }, [form, editandoId, carregarDados, fecharModal]);

  const dadosFiltrados = useMemo(() => {
    return labs.filter((l) => {
      const matchTexto = !filtroTexto ||
        l.sigla.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        l.nome.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        l.codigo.toLowerCase().includes(filtroTexto.toLowerCase());
      return matchTexto;
    });
  }, [labs, filtroTexto]);

  if (carregando) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}><div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%' }} /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spaceRem(3) }}>
      <PageHeader
        eyebrow="Administração"
        titulo="Laboratórios"
        subtitulo={`${labs.length} laboratórios cadastrados`}
        acoes={<>{podeGerenciar && <Button onClick={abrirNovo} leftIcon={<Plus size={16} />}>Novo Laboratório</Button>}</>}
      />

      <Card style={{ border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader title="Busca" />
        <CardContent style={{ display: 'flex', flexWrap: 'wrap', gap: spaceRem(3), alignItems: 'flex-end', borderBottom: '1px solid var(--color-border)', paddingBottom: spaceRem(2), marginBottom: spaceRem(2) }}>
          <Input placeholder="Buscar (sigla, nome, código...)" value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} leftIcon={<Search size={16} />} style={{ minWidth: 280 }} />
        </CardContent>
      </Card>

      <Card style={{ border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <CardContent>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: spaceRem(2) }}>
            {dadosFiltrados.map((l) => (
              <div key={l.id} style={{ padding: spaceRem(2), border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>{l.sigla} — {l.nome}</h4>
                  <StatusBadge status={l.ativo ? 'ATIVO' : 'INATIVO'} size="sm" />
                </div>
                <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>
                  Código: {l.codigo} • {equipamentosPorLab[l.id] ?? 0} equipamentos
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>
                  {l.responsavelTecnico ? `Resp. técnico: ${l.responsavelTecnico}` : 'Sem responsável técnico'} {l.ramal ? `• Ramal ${l.ramal}` : ''}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>
                  {l.localizacao ?? (l.bloco || l.sala ? `${l.bloco ?? ''} ${l.sala ? `— Sala ${l.sala}` : ''}` : 'Sem localização')}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-accent)' }}>
                  Receita mensal: {centavosParaReais(l.receitaMensalCentavos ?? 0)}
                </p>
                {podeGerenciar && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <Button variant="ghost" size="sm" onClick={() => abrirEdicao(l)} leftIcon={<Edit size={14} />}>Editar</Button>
                  </div>
                )}
              </div>
            ))}
            {dadosFiltrados.length === 0 && <p style={{ textAlign: 'center', color: 'var(--color-fg-muted)', padding: '40px' }}>Nenhum laboratório encontrado</p>}
          </div>
        </CardContent>
      </Card>

      {modalAberto && (
        <div className="overlay-modal" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: spaceRem(3) }} onClick={fecharModal}>
          <div style={{ background: 'var(--color-bg-elevated)', border: '2px solid var(--color-accent)', borderRadius: '0', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: spaceRem(3), borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ margin: 0 }}>{editandoId ? 'Editar Laboratório' : 'Novo Laboratório'}</h2>
              <Button variant="ghost" size="sm" onClick={fecharModal}><ChevronDown size={20} /></Button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: spaceRem(3), display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spaceRem(3) }}>
              <Input label="Sigla" value={form.sigla} onChange={(e) => setForm({ ...form, sigla: e.target.value })} required fullWidth />
              <Input label="Código" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} required fullWidth />
              <Input label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required fullWidth style={{ gridColumn: '1 / -1' }} />
              <Input label="Responsável Técnico" value={form.responsavelTecnico} onChange={(e) => setForm({ ...form, responsavelTecnico: e.target.value })} fullWidth />
              <Input label="Ramal" value={form.ramal} onChange={(e) => setForm({ ...form, ramal: e.target.value })} fullWidth />
              <Input label="Bloco" value={form.bloco} onChange={(e) => setForm({ ...form, bloco: e.target.value })} fullWidth />
              <Input label="Sala" value={form.sala} onChange={(e) => setForm({ ...form, sala: e.target.value })} fullWidth />
              <Input label="Localização" value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} fullWidth style={{ gridColumn: '1 / -1' }} />
              <Input label="Receita Mensal (R$)" value={form.receitaMensalCentavos} onChange={(e) => setForm({ ...form, receitaMensalCentavos: e.target.value })} fullWidth />
              <Select label="Situação" value={form.ativo ? 'true' : 'false'} onChange={(e) => setForm({ ...form, ativo: e.target.value === 'true' })} options={[{ value: 'true', label: 'Ativo' }, { value: 'false', label: 'Inativo' }]} fullWidth />
              {erro && <p style={{ margin: 0, gridColumn: '1 / -1', padding: '10px 12px', backgroundColor: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)', borderRadius: '4px', color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>{erro}</p>}
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: spaceRem(2), paddingTop: spaceRem(3), borderTop: '1px solid var(--color-border)' }}>
                <Button variant="outline" onClick={fecharModal}>Cancelar</Button>
                <Button type="submit" loading={salvando}>{editandoId ? 'Salvar Alterações' : 'Cadastrar Laboratório'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
