/**
 * PrivacidadePage — Aviso de privacidade e LGPD (RNF05).
 */

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, Button, spaceRem, PageHeader } from '@/shared/ui/components';
import { ShieldCheck } from 'lucide-react';

const CHAVE_CONSENTIMENTO = 'labucs.consentimento.lgpd.v1';

export function PrivacidadePage() {
  const [consentido, setConsentido] = useState(false);

  useEffect(() => {
    setConsentido(localStorage.getItem(CHAVE_CONSENTIMENTO) === 'true');
  }, []);

  function conceder() {
    localStorage.setItem(CHAVE_CONSENTIMENTO, 'true');
    setConsentido(true);
  }

  function revogar() {
    localStorage.setItem(CHAVE_CONSENTIMENTO, 'false');
    setConsentido(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spaceRem(3), maxWidth: 980 }}>
      <PageHeader
        eyebrow="Conformidade"
        titulo="Privacidade (LGPD)"
        subtitulo="Aviso de privacidade da demonstração LabUcs"
      />

      <Card style={{ border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader title="Aviso de Privacidade" subtitle="Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018)" />
        <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spaceRem(2), fontSize: 'var(--font-size-sm)', color: 'var(--color-fg)', lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}>Esta é uma aplicação de demonstração (POC) do sistema de gestão de equipamentos laboratoriais da Universidade de Caxias do Sul. Os dados apresentados são fictícios e gerados automaticamente para fins acadêmicos da disciplina FBI4010X — Fundamentos de Engenharia de Software.</p>
          <p style={{ margin: 0 }}><strong>Dados tratados:</strong> nome, e-mail e perfil de usuários de demonstração; registros operacionais de laboratórios, itens, equipamentos, eventos, solicitações e fornecedores fictícios.</p>
          <p style={{ margin: 0 }}><strong>Finalidade:</strong> demonstração de funcionalidades do sistema (cadastros, eventos, relatórios, auditoria e indicadores).</p>
          <p style={{ margin: 0 }}><strong>Armazenamento:</strong> todos os dados permanecem no navegador (IndexedDB e localStorage) e não são transmitidos a servidores externos.</p>
          <p style={{ margin: 0 }}><strong>Seus direitos:</strong> você pode exportar seus dados (módulo Backup e Dados) e apagar todos os registros reiniciando a demonstração.</p>
        </CardContent>
      </Card>

      <Card style={{ border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader title="Consentimento" subtitle="Registro local de consentimento para uso dos dados de demonstração" />
        <CardContent style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spaceRem(2) }}>
          <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>
            Status atual: <strong style={{ color: consentido ? 'var(--color-sucesso)' : 'var(--color-warning)' }}>{consentido ? 'Consentimento concedido' : 'Consentimento não concedido'}</strong>
          </p>
          <div style={{ display: 'flex', gap: spaceRem(2) }}>
            <Button onClick={conceder} disabled={consentido}>Conceder Consentimento</Button>
            <Button variant="outline" onClick={revogar} disabled={!consentido}>Revogar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
