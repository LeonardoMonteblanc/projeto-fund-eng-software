/**
 * InventarioPage — Inventário anual de equipamentos ativos por laboratório (RF05).
 * Divergências identificadas são registradas como evento DIVERGENCIA_INVENTARIO.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from '@/features/auth/store';
import { getDB } from '@/shared/db';
import { ehGlobal } from '@/features/auth/permissions';
import { calcularMetricas } from '@/shared/metrology';
import type { Laboratorio } from '@/shared/domain';
import { Card, CardHeader, CardContent, Badge, Button, Input, Select, spaceRem } from '@/shared/ui/components';
import { formatarDataBR, centavosParaReais, gerarULID, hojeISO, agoraISO } from '@/shared/utils';
import { baixarCSV, baixarXLSX } from '@/shared/exportar';
import { registrarLog } from '@/shared/audit';
import { ClipboardList, Download, AlertTriangle } from 'lucide-react';

export function InventarioPage() {
  const user = useUser();
  const global = ehGlobal(user);
  const labIdUsuario = user?.laboratorioId ?? null;

  const [labs, setLabs] = useState<Laboratorio[]>([]);
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroLab, setFiltroLab] = useState<string>('todos');
  const [filtroTexto, setFiltroTexto] = useState('');
  const [ano, setAno] = useState<string>(String(new Date().getFullYear()));
  const [modalDivergencia, setModalDivergencia] = useState<any | null>(null);
  const [descricaoDivergencia, setDescricaoDivergencia] = useState('');
  const [salvando, setSalvando] = useState(false);

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
        return { ...eq, item, laboratorio: (lss as any[]).find((l) => l.id === eq.laboratorioId), ...metricas, divergencias: eqEventos.filter((e) => e.tipo === 'DIVERGENCIA_INVENTARIO') };
      });
      setEquipamentos(enriquecidos);
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

  const ativos = useMemo(() => equipamentosVisiveis.filter((e) => e.ativo && e.situacao === 'ATIVO'), [equipamentosVisiveis]);

  const linhas = useMemo(() => {
    return ativos
      .filter((e) => (filtroLab === 'todos' || e.laboratorioId === filtroLab))
      .filter((e) => !filtroTexto || e.tag.toLowerCase().includes(filtroTexto.toLowerCase()) || e.patrimonio.toLowerCase().includes(filtroTexto.toLowerCase()) || (e.item?.nome ?? '').toLowerCase().includes(filtroTexto.toLowerCase()))
      .map((e) => ({
        'Laboratório': e.laboratorio?.sigla ?? '',
        'Patrimônio': e.patrimonio,
        'TAG': e.tag,
        'Nº Série': e.numeroSerie,
        'Item': e.item?.nome ?? '',
        'Fabricante/Modelo': `${e.item?.fabricante ?? ''} ${e.item?.modelo ?? ''}`,
        'Localização': e.localizacao,
        'Data Aquisição': e.dataAquisicao,
        'Valor Aquisição': e.valorAquisicaoCentavos ? centavosParaReais(e.valorAquisicaoCentavos) : '',
        'Próx. Calibração': e.proximaCalibracao ?? '',
        'Divergências Registradas': e.divergencias?.length ?? 0,
      }));
  }, [ativos, filtroLab, filtroTexto]);

  const totalPorLab = useMemo(() => {
    const contagem: Record<string, number> = {};
    ativos.forEach((e) => { contagem[e.laboratorioId] = (contagem[e.laboratorioId] ?? 0) + 1; });
    return contagem;
  }, [ativos]);

  async function registrarDivergencia() {
    if (!modalDivergencia || !descricaoDivergencia.trim()) return;
    setSalvando(true);
    try {
      const db = await getDB();
      const evento: any = {
        id: gerarULID(), tipo: 'DIVERGENCIA_INVENTARIO', equipamentoId: modalDivergencia.id,
        fornecedorId: null, responsavelId: user?.id ?? 'anonimo',
        situacao: 'REALIZADO', dataPrevista: null, dataRealizacao: hojeISO(),
        descricao: descricaoDivergencia.trim(), observacoes: `Divergência identificada no inventário ${ano}.`,
        custoEstimadoCentavos: null, custoRealizadoCentavos: null, numeroCertificado: null,
        erro: null, incerteza: null, caUtilizado: null, resultado: null,
        problema: null, servico: null, estadoRetorno: null,
        solicitacaoOrigemId: null, criadoEm: agoraISO(),
      };
      await db.put('eventos', evento);
      await registrarLog(db, { tabela: 'eventos', registroId: evento.id, acao: 'CRIAR', dadosNovos: evento, motivo: 'Divergência de inventário' });
      setModalDivergencia(null);
      setDescricaoDivergencia('');
      await carregarDados();
    } catch (e) {
      console.error(e);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}><div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%' }} /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spaceRem(3) }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spaceRem(2) }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spaceRem(2), marginBottom: '4px' }}>
            <ClipboardList size={28} style={{ color: 'var(--color-accent)' }} />
            <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-fg)', margin: 0 }}>Inventário</h1>
          </div>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)', margin: '4px 0 0' }}>{ativos.length} equipamentos ativos • Inventário {ano}</p>
        </div>
        <div style={{ display: 'flex', gap: spaceRem(2), flexWrap: 'wrap' }}>
          <Button variant="outline" leftIcon={<Download size={16} />} onClick={() => baixarCSV(`labucs-inventario-${ano}.csv`, linhas)}>Exportar CSV</Button>
          <Button variant="outline" leftIcon={<Download size={16} />} onClick={() => baixarXLSX(`labucs-inventario-${ano}.xlsx`, linhas)}>Exportar Excel</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: spaceRem(2) }}>
        {labsVisiveis.map((l) => (
          <div key={l.id} style={{ padding: spaceRem(2), border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg)' }}>
            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-fg-muted)' }}>{l.sigla}</p>
            <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-2xl)', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{totalPorLab[l.id] ?? 0}</p>
            <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-dim)' }}>equipamentos ativos</p>
          </div>
        ))}
      </div>

      <Card style={{ border: '1px solid var(--color-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <CardHeader title={`Inventário ${ano} — ${linhas.length} registro(s)`} />
        <CardContent style={{ display: 'flex', flexWrap: 'wrap', gap: spaceRem(3), alignItems: 'flex-end', borderBottom: '1px solid var(--color-border)', paddingBottom: spaceRem(2), marginBottom: spaceRem(2) }}>
          {global && <Select label="Laboratório" value={filtroLab} onChange={(e) => setFiltroLab(e.target.value)} options={[{ value: 'todos', label: 'Todos' }, ...labsVisiveis.map((l) => ({ value: l.id, label: `${l.sigla} — ${l.nome}` }))]} />}
          <Input placeholder="Buscar (TAG, patrimônio, item...)" value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} style={{ minWidth: 260 }} />
          <Input label="Ano de Referência" type="number" value={ano} onChange={(e) => setAno(e.target.value)} />
        </CardContent>
        <CardContent style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-xs)' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-section)', borderBottom: '1px solid var(--color-border)' }}>
                {['Laboratório', 'Patrimônio', 'TAG', 'Nº Série', 'Item', 'Localização', 'Próx. Calibração', 'Divergências', 'Ações'].map((c) => (
                  <th key={c} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-fg-muted)' }}>Nenhum equipamento ativo encontrado</td></tr>
              ) : (
                linhas.map((linha, i) => {
                  const eq = ativos.find((e) => e.patrimonio === linha['Patrimônio']);
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '8px 10px' }}>{linha['Laboratório']}</td>
                      <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)' }}>{linha['Patrimônio']}</td>
                      <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-accent)' }}>{linha['TAG']}</td>
                      <td style={{ padding: '8px 10px' }}>{linha['Nº Série']}</td>
                      <td style={{ padding: '8px 10px' }}>{linha['Item']}</td>
                      <td style={{ padding: '8px 10px' }}>{linha['Localização']}</td>
                      <td style={{ padding: '8px 10px' }}>{linha['Próx. Calibração'] ? formatarDataBR(linha['Próx. Calibração'] as string) : '—'}</td>
                      <td style={{ padding: '8px 10px' }}>
                        {linha['Divergências Registradas'] ? <Badge variant="warning" size="sm" dot>{linha['Divergências Registradas']}</Badge> : '0'}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <Button variant="ghost" size="sm" leftIcon={<AlertTriangle size={14} />} onClick={() => { setModalDivergencia(eq ?? null); setDescricaoDivergencia(''); }}>Divergência</Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {modalDivergencia && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: spaceRem(3) }} onClick={() => setModalDivergencia(null)}>
          <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '10px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: spaceRem(3), borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ margin: 0 }}>Registrar Divergência</h2>
              <Button variant="ghost" size="sm" onClick={() => setModalDivergencia(null)}><AlertTriangle size={18} /></Button>
            </div>
            <div style={{ padding: spaceRem(3), display: 'flex', flexDirection: 'column', gap: spaceRem(3) }}>
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>
                Equipamento: <strong>{modalDivergencia.tag}</strong> ({modalDivergencia.patrimonio}) — {modalDivergencia.item?.nome}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label htmlFor="divergencia-descricao" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-fg)' }}>Descrição da divergência *</label>
                <textarea id="divergencia-descricao" value={descricaoDivergencia} onChange={(e) => setDescricaoDivergencia(e.target.value)} rows={4} style={{ width: '100%', padding: '10px 12px', fontSize: 'var(--font-size-base)', border: '1px solid var(--color-border-input)', borderRadius: '4px', background: 'var(--color-bg)', color: 'var(--color-fg)', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spaceRem(2), paddingTop: spaceRem(3), borderTop: '1px solid var(--color-border)' }}>
                <Button variant="outline" onClick={() => setModalDivergencia(null)}>Cancelar</Button>
                <Button onClick={registrarDivergencia} loading={salvando} disabled={!descricaoDivergencia.trim()}>Registrar Divergência</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
