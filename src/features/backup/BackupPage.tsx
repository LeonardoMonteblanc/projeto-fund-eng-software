/**
 * BackupPage — Backup, exportação, importação e restauração (RNF07).
 */

import { useState, useCallback } from 'react';
import { getDB, clearDB } from '@/shared/db';
import { resetDatabase } from '@/shared/seed';
import { Card, CardHeader, CardContent, Button, spaceRem, PageHeader } from '@/shared/ui/components';
import { registrarLog } from '@/shared/audit';
import { DatabaseBackup, Download, Upload, RotateCcw } from 'lucide-react';
import { CHAVE_BACKUPS } from '@/shared/constants';

const STORES = ['users', 'labs', 'categorias', 'subcategorias', 'itens', 'equipamentos', 'eventos', 'fornecedores', 'solicitacoes', 'auditoria', 'config'] as const;

interface BackupArquivo {
  versao: number;
  geradoEm: string;
  stores: Record<string, any[]>;
}

export function BackupPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [trabalhando, setTrabalhando] = useState(false);
  const [backupsSalvos, setBackupsSalvos] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_BACKUPS) ?? '[]');
    } catch {
      return [];
    }
  });

  const gerarBackup = useCallback(async () => {
    setTrabalhando(true);
    setErro(null);
    setStatus(null);
    try {
      const db = await getDB();
      const stores: Record<string, any[]> = {};
      for (const store of STORES) {
        stores[store] = await db.getAll(store);
      }
      const backup: BackupArquivo = { versao: 1, geradoEm: new Date().toISOString(), stores };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `labucs-backup-${backup.geradoEm.split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const lista = [...backupsSalvos, { nome: link.download, geradoEm: backup.geradoEm, totalStores: Object.keys(stores).length }];
      setBackupsSalvos(lista);
      localStorage.setItem(CHAVE_BACKUPS, JSON.stringify(lista));

      await registrarLog(db, { tabela: 'sistema', registroId: 'backup', acao: 'BACKUP', dadosNovos: { totalStores: Object.keys(stores).length } });
      setStatus(`Backup gerado com ${Object.keys(stores).length} tabelas.`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao gerar backup.');
    } finally {
      setTrabalhando(false);
    }
  }, [backupsSalvos]);

  const restaurarBackup = useCallback(async (arquivo: File) => {
    setTrabalhando(true);
    setErro(null);
    setStatus(null);
    try {
      const texto = await arquivo.text();
      const backup: BackupArquivo = JSON.parse(texto);
      if (!backup.stores || backup.versao !== 1) throw new Error('Arquivo de backup inválido.');
      if (!confirm('Restaurar este backup substituirá TODOS os dados atuais. Continuar?')) { setTrabalhando(false); return; }
      await clearDB();
      const db = await getDB();
      for (const store of STORES) {
        if (backup.stores[store]) {
          const tx = db.transaction(store, 'readwrite');
          await Promise.all((backup.stores[store] ?? []).map((v: any) => tx.store.put(v)));
          await tx.done;
        }
      }
      await registrarLog(db, { tabela: 'sistema', registroId: 'backup', acao: 'RESTAURAR', dadosNovos: { arquivo: arquivo.name } });
      setStatus('Backup restaurado com sucesso. Recarregue a página.');
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao restaurar backup.');
      setTrabalhando(false);
    }
  }, []);

  const reiniciarDemo = useCallback(async () => {
    if (!confirm('Reiniciar a demonstração apagará todos os dados e regenerará a base inicial. Continuar?')) return;
    setTrabalhando(true);
    setErro(null);
    setStatus(null);
    try {
      await resetDatabase();
      setStatus('Demonstração reiniciada com a base inicial. Recarregue a página.');
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao reiniciar a demonstração.');
      setTrabalhando(false);
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spaceRem(3), maxWidth: 980 }}>
      <PageHeader
        eyebrow="Administração"
        titulo="Backup e Dados"
        subtitulo="Backup automático diário (RNF07), exportação, importação e reinício da demonstração"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: spaceRem(2) }}>
        <Card style={{ border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
          <CardHeader title="Gerar Backup" subtitle="Exporta todas as tabelas em um arquivo JSON." />
          <CardContent>
            <Button leftIcon={<Download size={16} />} onClick={gerarBackup} loading={trabalhando}>Baixar Backup Completo (JSON)</Button>
          </CardContent>
        </Card>

        <Card style={{ border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
          <CardHeader title="Restaurar Backup" subtitle="Substitui os dados atuais por um backup JSON." />
          <CardContent>
            <label style={{ display: 'inline-flex' }}>
              <Button leftIcon={<Upload size={16} />} onClick={() => document.getElementById('arquivo-backup')?.click()} disabled={trabalhando}>Selecionar Arquivo</Button>
              <input id="arquivo-backup" type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) restaurarBackup(f); e.target.value = ''; }} />
            </label>
          </CardContent>
        </Card>

        <Card style={{ border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
          <CardHeader title="Reiniciar Demonstração" subtitle="Apaga tudo e regenera a base inicial (seed)." />
          <CardContent>
            <Button variant="danger" leftIcon={<RotateCcw size={16} />} onClick={reiniciarDemo} loading={trabalhando}>Reiniciar Demonstração</Button>
          </CardContent>
        </Card>
      </div>

      {status && <p style={{ margin: 0, padding: '10px 12px', backgroundColor: 'var(--color-sucesso-bg)', border: '1px solid var(--color-sucesso)', borderRadius: '4px', color: 'var(--color-sucesso)', fontSize: 'var(--font-size-sm)' }}>{status}</p>}
      {erro && <p style={{ margin: 0, padding: '10px 12px', backgroundColor: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)', borderRadius: '4px', color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>{erro}</p>}

      <Card style={{ border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader title="Histórico de Backups (navegador)" subtitle={`${backupsSalvos.length} backup(s) gerado(s) nesta máquina`} />
        <CardContent>
          {backupsSalvos.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--color-fg-muted)', fontSize: 'var(--font-size-sm)' }}>Nenhum backup gerado ainda nesta máquina.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {backupsSalvos.map((b: any, i: number) => (
                <li key={i} style={{ fontSize: 'var(--font-size-sm)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{b.nome}</span>
                  <span style={{ color: 'var(--color-fg-muted)', marginLeft: '12px' }}>Gerado em {new Date(b.geradoEm).toLocaleString('pt-BR')}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
