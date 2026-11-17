/**
 * ConfigPage — Parâmetros do sistema (RNF04, RNF07, F12).
 */

import { useState, useEffect, useCallback } from 'react';
import { getDB } from '@/shared/db';
import type { Config } from '@/shared/domain';
import { Card, CardHeader, CardContent, Button, Input, Select, spaceRem, PageHeader } from '@/shared/ui/components';
import { agoraISO } from '@/shared/utils';
import { registrarLog } from '@/shared/audit';
import { Settings } from 'lucide-react';

export function ConfigPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const db = await getDB();
      const atual = await db.get('config', 'global');
      setConfig(atual ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    setSalvando(true);
    setSalvo(false);
    try {
      const db = await getDB();
      const anterior = await db.get('config', 'global');
      const dados: Config = { ...config, atualizadoEm: agoraISO() };
      await db.put('config', dados);
      await registrarLog(db, { tabela: 'configuracoes', registroId: 'global', acao: 'ATUALIZAR', dadosAnteriores: anterior ?? null, dadosNovos: dados });
      setSalvo(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}><div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%' }} /></div>;

  if (!config) return <p style={{ color: 'var(--color-fg-muted)' }}>Configuração não encontrada.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spaceRem(3), maxWidth: 980 }}>
      <PageHeader
        eyebrow="Administração"
        titulo="Configurações"
        subtitulo="Parâmetros globais do sistema (restrito ao Administrador)"
      />

      <Card style={{ border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader title="Parâmetros Gerais" />
        <CardContent>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spaceRem(3) }}>
            <Input label="Nome do Sistema" value={config.nomeSistema} onChange={(e) => setConfig({ ...config, nomeSistema: e.target.value })} fullWidth style={{ gridColumn: '1 / -1' }} />
            <Input label="Dias de Alerta de Vencimento" type="number" min={1} value={config.diasAlertaVencimento} onChange={(e) => setConfig({ ...config, diasAlertaVencimento: Number(e.target.value) || 30 })} fullWidth />
            <Input label="Timeout de Sessão (minutos)" type="number" min={1} value={config.timeoutSessaoMinutos} onChange={(e) => setConfig({ ...config, timeoutSessaoMinutos: Number(e.target.value) || 30 })} fullWidth />
            <Input label="Retenção de Backup (dias)" type="number" min={1} value={config.retencaoBackupDias} onChange={(e) => setConfig({ ...config, retencaoBackupDias: Number(e.target.value) || 7 })} fullWidth />
            <Input label="Máx. Tentativas de Login" type="number" min={1} value={config.maxTentativasLogin} onChange={(e) => setConfig({ ...config, maxTentativasLogin: Number(e.target.value) || 5 })} fullWidth />
            <Input label="Bloqueio de Login (segundos)" type="number" min={1} value={config.bloqueioLoginSegundos} onChange={(e) => setConfig({ ...config, bloqueioLoginSegundos: Number(e.target.value) || 120 })} fullWidth />
            <Select label="Moeda" value={config.moeda} onChange={(e) => setConfig({ ...config, moeda: e.target.value })} options={[{ value: 'BRL', label: 'BRL — Real Brasileiro' }, { value: 'USD', label: 'USD — Dólar' }, { value: 'EUR', label: 'EUR — Euro' }]} fullWidth />
            <Select label="Auto-aprovação de Solicitações" value={config.permitirAutoAprovacao ? 'true' : 'false'} onChange={(e) => setConfig({ ...config, permitirAutoAprovacao: e.target.value === 'true' })} options={[{ value: 'false', label: 'Desativada (recomendado)' }, { value: 'true', label: 'Ativada' }]} fullWidth hint="Permite que solicitações sejam aprovadas automaticamente pelo sistema." />
            {salvo && <p style={{ gridColumn: '1 / -1', margin: 0, padding: '10px 12px', backgroundColor: 'var(--color-sucesso-bg)', border: '1px solid var(--color-sucesso)', borderRadius: '4px', color: 'var(--color-sucesso)', fontSize: 'var(--font-size-sm)' }}>Parâmetros salvos com sucesso.</p>}
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: spaceRem(2), paddingTop: spaceRem(3), borderTop: '1px solid var(--color-border)' }}>
              <Button type="submit" loading={salvando}>Salvar Parâmetros</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
