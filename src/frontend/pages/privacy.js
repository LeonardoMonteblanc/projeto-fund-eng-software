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

export function paginaPrivacidade(app) {
  const dados = app.lgpd.meusDados();
  const u = dados.usuario;
  return {
    html: `
      <div class="pagina-cabecalho"><div><p class="eyebrow">RNF05 · LGPD</p><h1>Privacidade e seus dados</h1>
      <p class="subtitulo">Aviso de privacidade e direitos do titular neste POC local.</p></div></div>
      <div class="duas-colunas">
        ${secao('Aviso de privacidade', `<dl class="dados">
          <dt>Finalidade</dt><dd>${esc(dados.aviso.finalidade)}</dd>
          <dt>Dados tratados</dt><dd>${dados.aviso.dadosTratados.map(esc).join(', ')}</dd>
          <dt>Base legal</dt><dd>${esc(dados.aviso.baseLegal)}</dd>
          <dt>Armazenamento</dt><dd>${esc(dados.aviso.armazenamento)}</dd>
          <dt>Retenção</dt><dd>${esc(dados.aviso.retencao)}</dd>
          <dt>Direitos</dt><dd>${esc(dados.aviso.direitos)}</dd>
        </dl>`)}
        ${secao('Seus dados', `<dl class="dados">
          <dt>Nome</dt><dd>${esc(u.nome)}</dd>
          <dt>E-mail</dt><dd>${esc(u.email)}</dd>
          <dt>Perfil</dt><dd>${esc(u.perfilRotulo)}</dd>
          <dt>Laboratório</dt><dd>${esc(u.laboratorioSigla ?? 'Global')}</dd>
          <dt>Eventos registrados</dt><dd>${dados.eventosRegistrados}</dd>
          <dt>Solicitações</dt><dd>${dados.solicitacoes.length}</dd>
        </dl>
        <div class="form-acoes"><button class="btn btn-secundario" id="baixar-meus-dados">Baixar meus dados (JSON)</button></div>
        <hr />
        <h3>Alterar senha</h3>
        <form id="form-senha" class="formulario-compacto">
          ${campo({ nome: 'atual', rotulo: 'Senha atual', tipo: 'password', obrigatorio: true, largura: 'full' })}
          ${campo({ nome: 'nova', rotulo: 'Nova senha', tipo: 'password', obrigatorio: true, largura: 'full', ajuda: '8 a 128 caracteres, com letra e número.' })}
          <p class="erro-geral" data-erro-geral></p>
          <button class="btn btn-primario">Alterar senha</button>
        </form>`)}
      </div>
    `,
    montar() {
      document.getElementById('baixar-meus-dados')?.addEventListener('click', () => {
        baixarArquivo(`meus-dados-${u.id}.json`, 'application/json', JSON.stringify(dados, null, 2));
      });
      document.getElementById('form-senha')?.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        const form = evento.currentTarget;
        try {
          await app.auth.alterarSenha(form.elements.atual.value, form.elements.nova.value);
          toast('Senha alterada.', 'sucesso');
          form.reset();
        } catch (e) { form.querySelector('[data-erro-geral]').textContent = e.message; }
      });
    }
  };
}
