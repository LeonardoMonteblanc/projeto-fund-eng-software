import {
  ESTADOS_RETORNO, PERFIS, SITUACOES_EQUIPAMENTO, SITUACOES_EVENTO,
  TIPOS_EVENTO, TIPO_EVENTO_ROTULO
} from '../../shared/constants.js';
import {
  abrirModal, badge, badgeSinal, badgeSituacao, badgeStatusPrazo, baixarArquivo, campo, esc,
  fecharModal, fmtData, fmtDataHora, fmtMoeda, fmtNumero, formatarCelula, hoje, iniciais,
  lerCampos, marcarErros, paginacao, tabela, toast, tratarErro, confirmar
} from '../components/ui.js';
import {
  cartaoIndicador, filtrosBarra, formularioModal, linkEquipamento, opcoesCategoria,
  opcoesEquipamentos, opcoesFornecedor, opcoesItem, opcoesLab, opcoesPerfil, opcoesSinal,
  opcoesSituacaoEquipamento, opcoesSituacaoEvento, opcoesSituacaoSolicitacao,
  opcoesSubcategoria, opcoesTipoEvento, pedirMotivo, rotuloPerfil, secao, valorReais
} from '../components/common.js';
import { estadoTelas } from '../state.js';
import { temPermissao, recarregar } from '../session-context.js';

export async function paginaConfig(app, abaForcada = null) {
  if (abaForcada) estadoTelas.config.aba = abaForcada;
  const info = app.config.obter();
  const backups = await app.config.backups();
  const p = info.parametros;
  const aba = estadoTelas.config.aba ?? 'parametros';
  const html = `
    <div class="pagina-cabecalho"><div><p class="eyebrow">RNF04 · RNF07 · RNF11</p><h1>Configuração e dados</h1>
    <p class="subtitulo">Parâmetros, backups locais, importação/exportação e reinício da demonstração.</p></div></div>
    <div class="abas">
      <button class="aba ${aba === 'parametros' ? 'aba-ativa' : ''}" data-aba="parametros">Parâmetros</button>
      <button class="aba ${aba === 'backup' ? 'aba-ativa' : ''}" data-aba="backup">Backups e dados</button>
      <button class="aba ${aba === 'sobre' ? 'aba-ativa' : ''}" data-aba="sobre">Sobre a base</button>
    </div>
    ${aba === 'parametros' ? `
      <form id="form-config" class="formulario-pagina">
        <div class="grid-campos">
          ${campo({ nome: 'nomeSistema', rotulo: 'Nome do sistema', tipo: 'text', valor: p.nomeSistema, largura: 'full' })}
          ${campo({ nome: 'diasAlertaVencimento', rotulo: 'Dias de antecedência do alerta', tipo: 'number', valor: p.diasAlertaVencimento, min: 1, max: 365, largura: 'half' })}
          ${campo({ nome: 'timeoutSessaoMinutos', rotulo: 'Timeout de inatividade (min)', tipo: 'number', valor: p.timeoutSessaoMinutos, min: 1, max: 480, largura: 'half' })}
          ${campo({ nome: 'retencaoBackupDias', rotulo: 'Retenção de backups (dias)', tipo: 'number', valor: p.retencaoBackupDias, min: 1, max: 90, largura: 'half' })}
          ${campo({ nome: 'motivo', rotulo: 'Motivo da alteração', tipo: 'textarea', obrigatorio: true, largura: 'full' })}
        </div>
        <p class="erro-geral" data-erro-geral></p>
        <div class="form-acoes"><button class="btn btn-primario">Salvar parâmetros</button></div>
      </form>
      <div class="aviso-inline aviso-info">O POC não possui servidor: os parâmetros valem apenas neste navegador.</div>
    ` : aba === 'backup' ? `
      <div class="duas-colunas">
        ${secao('Backups locais', `
          <p class="subtexto">Snapshots no IndexedDB. A retenção padrão é de 7 dias.</p>
          <div class="tabela-envolucro"><table class="tabela tabela-compacta"><thead><tr><th>Data</th><th>Motivo</th><th>Tamanho</th><th></th></tr></thead><tbody>
          ${backups.map((b) => `<tr><td>${esc(fmtDataHora(b.criadoEm))}</td><td>${esc(b.motivo)}</td><td>${esc(b.tamanho)}</td><td><button class="btn btn-mini btn-secundario" data-restaurar="${esc(b.id)}">Restaurar</button></td></tr>`).join('') || '<tr><td colspan="4">Nenhum backup.</td></tr>'}
          </tbody></table></div>
          <div class="form-acoes"><button class="btn btn-secundario" id="criar-backup">Criar backup agora</button></div>
        `)}
        ${secao('Exportar e importar', `
          <p class="subtexto">Exporte um JSON completo (equipamentos, eventos, usuários e auditoria) ou importe um arquivo gerado por este POC.</p>
          <div class="form-acoes">
            <button class="btn btn-primario" id="exportar-dados">Exportar JSON</button>
            <label class="btn btn-secundario" for="arquivo-import">Importar JSON</label>
            <input id="arquivo-import" type="file" accept="application/json,.json" hidden />
          </div>
          <hr />
          <p class="subtexto">Reiniciar recria a base real importada e os dados de demonstração. Um backup é criado antes.</p>
          <button class="btn btn-perigo" id="reiniciar">Reiniciar demonstração</button>
        `)}
      </div>
    ` : `
      <div class="duas-colunas">
        ${secao('Base de dados', `<dl class="dados">
          <dt>Origem</dt><dd>${esc(info.contagens ? 'Base real + demonstração' : '—')}</dd>
          <dt>Fontes</dt><dd class="mono">EQUIP.xlsx • FG 020 • FG 006</dd>
          <dt>Equipamentos</dt><dd>${info.contagens.equipamentos}</dd>
          <dt>Itens</dt><dd>${info.contagens.itens}</dd>
          <dt>Eventos</dt><dd>${info.contagens.eventos}</dd>
          <dt>Usuários</dt><dd>${info.contagens.usuarios}</dd>
          <dt>Armazenamento</dt><dd class="mono">${esc(info.armazenamento)}</dd>
        </dl>`)}
        ${secao('Limitações do POC', `<ul class="lista-limites">
          <li>Dados por navegador: não há sincronização entre dispositivos.</li>
          <li>Autenticação local de demonstração; sem servidor de identidade.</li>
          <li>IP registrado como <span class="mono">local (POC estático)</span>.</li>
          <li>Sem integração com ERP, patrimônio ou importação automática de planilhas.</li>
          <li>Campos ausentes na origem permanecem nulos e são exibidos como pendências.</li>
        </ul>`)}
      </div>
    `}
  `;

  return {
    html,
    montar() {
      document.querySelectorAll('[data-aba]').forEach((b) => b.addEventListener('click', () => { estadoTelas.config.aba = b.dataset.aba; recarregar(); }));
      const form = document.getElementById('form-config');
      form?.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        try {
          app.config.atualizar({
            nomeSistema: form.elements.nomeSistema.value,
            diasAlertaVencimento: Number(form.elements.diasAlertaVencimento.value),
            timeoutSessaoMinutos: Number(form.elements.timeoutSessaoMinutos.value),
            retencaoBackupDias: Number(form.elements.retencaoBackupDias.value),
            motivo: form.elements.motivo.value
          });
          toast('Parâmetros salvos.', 'sucesso');
          recarregar();
        } catch (e) {
          form.querySelector('[data-erro-geral]').textContent = e.message;
          if (e.campos) for (const [nome, msg] of Object.entries(e.campos)) {
            const el = form.elements[nome]; el?.classList.add('invalido');
            const span = form.querySelector(`[data-erro="${nome}"]`); if (span) span.textContent = msg;
          }
        }
      });
      document.getElementById('criar-backup')?.addEventListener('click', async () => {
        const motivo = await pedirMotivo({ titulo: 'Criar backup', mensagem: 'Informe o motivo do backup manual.', textoConfirmar: 'Criar backup', valor: 'Backup manual' });
        if (!motivo) return;
        try { await app.config.criarBackup(motivo); toast('Backup criado.', 'sucesso'); recarregar(); } catch (e) { tratarErro(e); }
      });
      document.querySelectorAll('[data-restaurar]').forEach((b) => b.addEventListener('click', async () => {
        const motivo = await pedirMotivo({ titulo: 'Restaurar backup', mensagem: 'O estado atual será substituído por este snapshot. Um backup do estado atual será criado antes.', textoConfirmar: 'Restaurar', perigo: true, valor: 'Restauração de backup' });
        if (!motivo) return;
        try { await app.config.restaurarBackup(b.dataset.restaurar, motivo); toast('Backup restaurado.', 'sucesso'); recarregar(); } catch (e) { tratarErro(e); }
      }));
      document.getElementById('exportar-dados')?.addEventListener('click', async () => {
        try {
          const r = await app.config.exportarDados();
          baixarArquivo(r.nomeArquivo, r.mime, r.texto);
          toast('Arquivo exportado.', 'sucesso');
        } catch (e) { tratarErro(e); }
      });
      document.getElementById('arquivo-import')?.addEventListener('change', async (evento) => {
        const arquivo = evento.target.files?.[0];
        if (!arquivo) return;
        const texto = await arquivo.text();
        const confirmado = await confirmar({ titulo: 'Importar dados', mensagem: `Importar <strong>${esc(arquivo.name)}</strong>? O estado atual será substituído (backup automático antes).`, textoConfirmar: 'Importar', perigo: true });
        if (!confirmado) return;
        try { await app.config.importarDados(texto, `Importação de ${arquivo.name}`); toast('Dados importados.', 'sucesso'); recarregar(); } catch (e) { tratarErro(e); }
      });
      document.getElementById('reiniciar')?.addEventListener('click', async () => {
        const motivo = await pedirMotivo({ titulo: 'Reiniciar demonstração', mensagem: 'Todos os dados atuais serão substituídos pela base real + demonstração. Esta ação não afeta o repositório.', textoConfirmar: 'Reiniciar', perigo: true, valor: 'Reinício da demonstração' });
        if (!motivo) return;
        try { await app.config.reiniciar(motivo); toast('Demonstração reiniciada.', 'sucesso'); recarregar(); } catch (e) { tratarErro(e); }
      });
    }
  };
}
