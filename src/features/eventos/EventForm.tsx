/**
 * EventForm — Formulário unificado de eventos (calibração, verificação, manutenções).
 * Inclui cálculo automático do resultado (RF09: |erro| + U <= CA → Aprovado).
 */

import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Select, spaceRem } from '@/shared/ui/components';
import { TIPOS_EVENTO, SITUACOES_EVENTO, TIPO_EVENTO_ROTULO, SITUACAO_EVENTO_ROTULO, RESULTADO_ROTULO, ESTADO_RETORNO_ROTULO } from '@/shared/constants';
import { calcularResultado } from '@/shared/metrology';
import { formatarDataBR } from '@/shared/utils';

interface EventFormProps {
  editando?: any;
  equipamentos: any[];
  itens: any[];
  fornecedores: any[];
  usuarioId: string;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  salvando?: boolean;
}

function formInicial(): Record<string, string> {
  return {
    tipo: 'CALIBRACAO', equipamentoId: '', fornecedorId: '', situacao: 'AGENDADO',
    dataPrevista: '', dataRealizacao: '', descricao: '', observacoes: '',
    custoEstimadoCentavos: '', custoRealizadoCentavos: '', numeroCertificado: '',
    erro: '', incerteza: '', caUtilizado: '', resultado: '',
    problema: '', servico: '', estadoRetorno: '',
  };
}

export function EventForm({ editando, equipamentos, itens, fornecedores, usuarioId, onSubmit, onCancel, salvando }: EventFormProps) {
  const [form, setForm] = useState<Record<string, string>>(formInicial());

  useEffect(() => {
    if (editando) {
      setForm({
        tipo: editando.tipo || 'CALIBRACAO',
        equipamentoId: editando.equipamentoId || '',
        fornecedorId: editando.fornecedorId || '',
        situacao: editando.situacao || 'AGENDADO',
        dataPrevista: editando.dataPrevista || '',
        dataRealizacao: editando.dataRealizacao || '',
        descricao: editando.descricao || '',
        observacoes: editando.observacoes || '',
        custoEstimadoCentavos: editando.custoEstimadoCentavos ? String(editando.custoEstimadoCentavos / 100) : '',
        custoRealizadoCentavos: editando.custoRealizadoCentavos ? String(editando.custoRealizadoCentavos / 100) : '',
        numeroCertificado: editando.numeroCertificado || '',
        erro: editando.erro?.toString() ?? '',
        incerteza: editando.incerteza?.toString() ?? '',
        caUtilizado: editando.caUtilizado?.toString() ?? '',
        resultado: editando.resultado || '',
        problema: editando.problema || '',
        servico: editando.servico || '',
        estadoRetorno: editando.estadoRetorno || '',
      });
    }
  }, [editando]);

  const equipamentoSelecionado = equipamentos.find((e) => e.id === form.equipamentoId);
  const itemDoEquipamento = equipamentoSelecionado ? itens.find((i) => i.id === equipamentoSelecionado.itemId) : undefined;
  const caEfetivo = useMemo(() => {
    if (form.tipo !== 'CALIBRACAO' && form.tipo !== 'VERIFICACAO') return null;
    const campo = form.tipo === 'CALIBRACAO' ? 'caCalibracao' : 'caVerificacao';
    const doEq = equipamentoSelecionado?.[campo];
    if (doEq !== null && doEq !== undefined && doEq !== '') return Number(doEq);
    const doItem = itemDoEquipamento?.[campo];
    if (doItem !== null && doItem !== undefined) return Number(doItem);
    return null;
  }, [form.tipo, equipamentoSelecionado, itemDoEquipamento]);

  const ehMetrologico = form.tipo === 'CALIBRACAO' || form.tipo === 'VERIFICACAO';
  const calculo = useMemo(() => {
    if (!ehMetrologico) return null;
    const erro = form.erro === '' ? null : Number(form.erro);
    const incerteza = form.incerteza === '' ? null : Number(form.incerteza);
    if (erro === null || isNaN(erro)) return null;
    const u = incerteza === null || isNaN(incerteza) ? 0 : incerteza;
    const ca = caEfetivo ?? (form.caUtilizado !== '' ? Number(form.caUtilizado) : null);
    if (ca === null || isNaN(ca)) return { erroAbsoluto: Math.abs(erro), erroMaisU: Math.abs(erro) + u, ca: null, resultado: null } as any;
    return calcularResultado(erro, u, ca);
  }, [ehMetrologico, form.erro, form.incerteza, form.caUtilizado, caEfetivo]);

  function atualizar(campo: string, valor: string) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function aoMudarTipo(tipo: string) {
    setForm((prev) => ({ ...formInicial(), tipo, equipamentoId: prev.equipamentoId }));
  }

  function aoMudarEquipamento(equipamentoId: string) {
    const eq = equipamentos.find((e) => e.id === equipamentoId);
    const item = eq ? itens.find((i) => i.id === eq.itemId) : undefined;
    const campo = form.tipo === 'CALIBRACAO' ? 'caCalibracao' : 'caVerificacao';
    const ca = eq?.[campo] ?? item?.[campo];
    setForm((prev) => ({ ...prev, equipamentoId, caUtilizado: ca !== null && ca !== undefined ? String(ca) : prev.caUtilizado }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.tipo || !form.equipamentoId) return;
    if (ehMetrologico && (!form.erro || !form.incerteza)) return;
    if (ehMetrologico && !form.resultado) return;
    if (form.tipo === 'MANUTENCAO_CORRETIVA' && !form.estadoRetorno) return;
    await onSubmit({
      ...form,
      responsavelId: usuarioId,
      caUtilizado: caEfetivo ?? (form.caUtilizado !== '' ? Number(form.caUtilizado) : null),
    });
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', fontSize: 'var(--font-size-base)', border: '2px solid var(--color-border-input)', borderRadius: '0', background: 'var(--color-bg)', color: 'var(--color-fg)', outline: 'none' };

  return (
    <form onSubmit={handleSubmit} style={{ padding: spaceRem(3), display: 'flex', flexDirection: 'column', gap: spaceRem(3) }}>
      <div className="grade-formulario" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spaceRem(3) }}>
        <Select label="Tipo de Evento" value={form.tipo} onChange={(e) => aoMudarTipo(e.target.value)} required fullWidth
          options={Object.values(TIPOS_EVENTO).map((t) => ({ value: t, label: TIPO_EVENTO_ROTULO[t] }))} />
        <Select label="Equipamento" value={form.equipamentoId} onChange={(e) => aoMudarEquipamento(e.target.value)} required fullWidth
          options={equipamentos.map((e) => ({ value: e.id, label: `${e.tag} — ${e.patrimonio} (${e.item?.nome ?? e.itemId})` }))} />
        <Select label="Situação" value={form.situacao} onChange={(e) => atualizar('situacao', e.target.value)} fullWidth
          options={Object.values(SITUACOES_EVENTO).map((s) => ({ value: s, label: SITUACAO_EVENTO_ROTULO[s] }))} />
        <Select label="Fornecedor" value={form.fornecedorId} onChange={(e) => atualizar('fornecedorId', e.target.value)} fullWidth
          options={[{ value: '', label: 'Nenhum (opcional)' }, ...fornecedores.map((f) => ({ value: f.id, label: f.razaoSocial }))]} />
        <Input label="Data Prevista" type="date" value={form.dataPrevista} onChange={(e) => atualizar('dataPrevista', e.target.value)} fullWidth />
        <Input label="Data Realização" type="date" value={form.dataRealizacao} onChange={(e) => atualizar('dataRealizacao', e.target.value)} fullWidth />

        {ehMetrologico && (
          <>
            <Input label="Erro Medido" type="number" step="any" value={form.erro} onChange={(e) => atualizar('erro', e.target.value)} required fullWidth />
            <Input label="Incerteza (U)" type="number" step="any" value={form.incerteza} onChange={(e) => atualizar('incerteza', e.target.value)} required fullWidth />
            <Input label="CA Utilizado" type="number" step="any" value={form.caUtilizado} onChange={(e) => atualizar('caUtilizado', e.target.value)} fullWidth hint={caEfetivo !== null ? `CA efetivo (item/equipamento): ${caEfetivo}` : undefined} />
            <Select label="Resultado" value={form.resultado} onChange={(e) => atualizar('resultado', e.target.value)} required fullWidth
              options={[{ value: '', label: 'Selecione...' }, ...Object.entries(RESULTADO_ROTULO).map(([k, v]) => ({ value: k, label: v }))]} />
            <Input label="Nº Certificado" value={form.numeroCertificado} onChange={(e) => atualizar('numeroCertificado', e.target.value)} fullWidth />
          </>
        )}

        {form.tipo === 'MANUTENCAO_PREVENTIVA' && (
          <>
            <Input label="Custo Estimado (R$)" value={form.custoEstimadoCentavos} onChange={(e) => atualizar('custoEstimadoCentavos', e.target.value)} fullWidth />
            <Input label="Custo Realizado (R$)" value={form.custoRealizadoCentavos} onChange={(e) => atualizar('custoRealizadoCentavos', e.target.value)} fullWidth />
          </>
        )}

        {form.tipo === 'MANUTENCAO_CORRETIVA' && (
          <>
            <Input label="Problema Identificado" value={form.problema} onChange={(e) => atualizar('problema', e.target.value)} fullWidth style={{ gridColumn: '1 / -1' }} />
            <Input label="Serviço Realizado" value={form.servico} onChange={(e) => atualizar('servico', e.target.value)} fullWidth style={{ gridColumn: '1 / -1' }} />
            <Select label="Estado de Retorno" value={form.estadoRetorno} onChange={(e) => atualizar('estadoRetorno', e.target.value)} required fullWidth
              options={[{ value: '', label: 'Selecione...' }, ...Object.entries(ESTADO_RETORNO_ROTULO).map(([k, v]) => ({ value: k, label: v }))]} />
            <Input label="Custo Realizado (R$)" value={form.custoRealizadoCentavos} onChange={(e) => atualizar('custoRealizadoCentavos', e.target.value)} fullWidth />
          </>
        )}

        <Input label="Descrição" value={form.descricao} onChange={(e) => atualizar('descricao', e.target.value)} fullWidth style={{ gridColumn: '1 / -1' }} />
        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label htmlFor="evento-observacoes" style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--color-fg-light)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Observações</label>
          <textarea id="evento-observacoes" value={form.observacoes} onChange={(e) => atualizar('observacoes', e.target.value)} rows={3} style={inputStyle} />
        </div>
      </div>

      {calculo && (
        <div style={{ padding: spaceRem(2), backgroundColor: 'var(--color-accent-bg)', border: '2px solid var(--color-accent)', borderRadius: '0' }}>
          <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-accent)' }}>Cálculo da regra de decisão (aceitação simples)</p>
          <p style={{ margin: '8px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-fg)', fontFamily: 'var(--font-mono)' }}>
            |Erro| + U = {calculo.erroAbsoluto} + {form.incerteza ? Number(form.incerteza) : 0} = {calculo.erroMaisU} {calculo.ca !== null ? `≤ CA ${calculo.ca} → ${calculo.resultado === 'APROVADO' ? 'Aprovado' : 'Reprovado'}` : '(informe o CA para avaliar)'}
          </p>
        </div>
      )}

      {equipamentoSelecionado && (
        <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
          Última calibração: {equipamentoSelecionado.ultimaCalibracao?.dataRealizacao ? formatarDataBR(equipamentoSelecionado.ultimaCalibracao.dataRealizacao) : '—'} • Próx. calibração: {equipamentoSelecionado.proximaCalibracao ? formatarDataBR(equipamentoSelecionado.proximaCalibracao) : '—'}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spaceRem(2), paddingTop: spaceRem(3), borderTop: '2px solid var(--color-border)' }}>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={salvando}>{editando ? 'Salvar Alterações' : 'Registrar Evento'}</Button>
      </div>
    </form>
  );
}
