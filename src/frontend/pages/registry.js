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

export function paginaFornecedores(app) {
  const st = estadoTelas.fornecedores;
  const pagina = app.fornecedores.listar({ ...st, tamanho: 50 });
  const pode = temPermissao(app, 'fornecedores.gerenciar');
  const html = `
    <div class="pagina-cabecalho"><div><p class="eyebrow">RF16</p><h1>Fornecedores</h1>
    <p class="subtitulo">${pagina.total} fornecedor(es) • calibração, manutenção e serviços externos</p></div>
    <div class="cabecalho-acoes">${pode ? '<button class="btn btn-primario" id="novo-fornecedor">Novo fornecedor</button>' : ''}</div></div>
    ${filtrosBarra(`
      ${campo({ nome: 'busca', rotulo: 'Buscar', tipo: 'text', valor: st.busca, largura: 'half' })}
      ${campo({ nome: 'ativo', rotulo: 'Situação', tipo: 'select', valor: st.ativo, opcoes: [{ valor: '', rotulo: 'Todos' }, { valor: 'true', rotulo: 'Ativos' }, { valor: 'false', rotulo: 'Inativos' }], largura: 'half' })}
    `, { limpar: true })}
    ${tabela([
      { chave: 'razaoSocial', rotulo: 'Razão social' },
      { chave: 'cnpjFormatado', rotulo: 'CNPJ', render: (l) => `<span class="mono">${esc(l.cnpjFormatado)}</span>` },
      { chave: 'telefone', rotulo: 'Telefone' },
      { chave: 'email', rotulo: 'E-mail' },
      { chave: 'totalEventos', rotulo: 'Eventos', render: (l) => String(l.totalEventos) },
      { chave: 'ativo', rotulo: 'Situação', render: (l) => badgeSituacao(l.ativo ? 'ATIVO' : 'INATIVO', l.ativo ? 'Ativo' : 'Inativo') }
    ], pagina.itens, {
      acoes: (l) => pode ? `<button class="btn btn-mini btn-secundario" data-editar-fornecedor="${l.id}">Editar</button>${l.ativo ? `<button class="btn btn-mini btn-perigo" data-inativar-fornecedor="${l.id}">Inativar</button>` : `<button class="btn btn-mini btn-secundario" data-reativar-fornecedor="${l.id}">Reativar</button>`}` : ''
    })}
    ${paginacao(pagina)}
  `;
  return {
    html,
    montar() {
      const form = document.querySelector('[data-form-filtros]');
      form?.addEventListener('submit', (e) => { e.preventDefault(); Object.assign(st, { busca: form.elements.busca.value, ativo: form.elements.ativo.value, pagina: 1 }); recarregar(); });
      document.querySelector('[data-limpar-filtros]')?.addEventListener('click', () => { Object.assign(st, { busca: '', ativo: '', pagina: 1 }); recarregar(); });
      document.querySelectorAll('[data-pagina]').forEach((b) => b.addEventListener('click', () => { st.pagina = Number(b.dataset.pagina); recarregar(); }));
      document.getElementById('novo-fornecedor')?.addEventListener('click', () => abrirFormularioFornecedor(app));
      document.querySelectorAll('[data-editar-fornecedor]').forEach((b) => b.addEventListener('click', () => abrirFormularioFornecedor(app, app.fornecedores.obter(Number(b.dataset.editarFornecedor)))));
      document.querySelectorAll('[data-inativar-fornecedor]').forEach((b) => b.addEventListener('click', async () => {
        const motivo = await pedirMotivo({ titulo: 'Inativar fornecedor', mensagem: 'O fornecedor será inativado, preservando o histórico de eventos.', textoConfirmar: 'Inativar', perigo: true });
        if (!motivo) return;
        try { app.fornecedores.inativar(Number(b.dataset.inativarFornecedor), motivo); toast('Fornecedor inativado.', 'sucesso'); recarregar(); } catch (e) { tratarErro(e); }
      }));
      document.querySelectorAll('[data-reativar-fornecedor]').forEach((b) => b.addEventListener('click', async () => {
        const motivo = await pedirMotivo({ titulo: 'Reativar fornecedor', mensagem: 'Reativar este fornecedor?', textoConfirmar: 'Reativar' });
        if (!motivo) return;
        try { app.fornecedores.reativar(Number(b.dataset.reativarFornecedor), motivo); toast('Fornecedor reativado.', 'sucesso'); recarregar(); } catch (e) { tratarErro(e); }
      }));
    }
  };
}

function abrirFormularioFornecedor(app, dto = null) {
  const campos = [
    { nome: 'razaoSocial', rotulo: 'Razão social', tipo: 'text', obrigatorio: true, largura: 'full' },
    { nome: 'cnpj', rotulo: 'CNPJ', tipo: 'text', obrigatorio: true, largura: 'half', placeholder: '00.000.000/0000-00' },
    { nome: 'telefone', rotulo: 'Telefone', tipo: 'text', obrigatorio: true, largura: 'half', placeholder: '(54) 0000-0000' },
    { nome: 'email', rotulo: 'E-mail', tipo: 'email', obrigatorio: true, largura: 'half' },
    { nome: 'observacoes', rotulo: 'Observações', tipo: 'textarea', largura: 'full' }
  ];
  if (dto) campos.push({ nome: 'motivo', rotulo: 'Motivo da alteração', tipo: 'textarea', obrigatorio: true, largura: 'full' });
  formularioModal({
    titulo: dto ? 'Editar fornecedor' : 'Novo fornecedor',
    campos,
    valores: dto ?? {},
    onSalvar: async (dados) => {
      if (dto) { app.fornecedores.atualizar(dto.id, dados); toast('Fornecedor atualizado.', 'sucesso'); }
      else { app.fornecedores.criar(dados); toast('Fornecedor cadastrado.', 'sucesso'); }
      recarregar();
    }
  });
}

export function paginaLaboratorios(app) {
  const st = estadoTelas.laboratorios;
  const pagina = app.laboratorios.listar({ ...st, tamanho: 50 });
  const pode = temPermissao(app, 'laboratorios.gerenciar');
  const html = `
    <div class="pagina-cabecalho"><div><p class="eyebrow">RF07</p><h1>Laboratórios</h1>
    <p class="subtitulo">${pagina.total} laboratório(s) • isolamento de dados, custos e relatórios</p></div>
    <div class="cabecalho-acoes">${pode ? '<button class="btn btn-primario" id="novo-lab">Novo laboratório</button>' : ''}</div></div>
    ${filtrosBarra(`
      ${campo({ nome: 'busca', rotulo: 'Buscar', tipo: 'text', valor: st.busca, largura: 'half' })}
      ${campo({ nome: 'ativo', rotulo: 'Situação', tipo: 'select', valor: st.ativo, opcoes: [{ valor: '', rotulo: 'Todos' }, { valor: 'true', rotulo: 'Ativos' }, { valor: 'false', rotulo: 'Inativos' }], largura: 'half' })}
    `, { limpar: true })}
    ${tabela([
      { chave: 'sigla', rotulo: 'Sigla', render: (l) => `<strong>${esc(l.sigla)}</strong>` },
      { chave: 'nome', rotulo: 'Nome' },
      { chave: 'localizacao', rotulo: 'Localização', render: (l) => esc(l.localizacao ?? '—') },
      { chave: 'responsavelTecnico', rotulo: 'Responsável técnico', render: (l) => `${esc(l.responsavelTecnico ?? '—')}${l.ramal ? `<small class="subtexto">Ramal ${esc(l.ramal)}</small>` : ''}` },
      { chave: 'equipamentosAtivos', rotulo: 'Ativos', render: (l) => `${l.equipamentosAtivos} / ${l.totalEquipamentos}` },
      { chave: 'receitaMensal', rotulo: 'Receita mensal', render: (l) => l.receitaMensalCentavos === null ? '<span class="subtexto">não informada</span>' : esc(fmtMoeda(l.receitaMensalCentavos)) },
      { chave: 'ativo', rotulo: 'Situação', render: (l) => badgeSituacao(l.ativo ? 'ATIVO' : 'INATIVO', l.ativo ? 'Ativo' : 'Inativo') }
    ], pagina.itens, {
      acoes: (l) => pode ? `<button class="btn btn-mini btn-secundario" data-editar-lab="${l.id}">Editar</button>${l.ativo ? `<button class="btn btn-mini btn-perigo" data-inativar-lab="${l.id}">Inativar</button>` : `<button class="btn btn-mini btn-secundario" data-reativar-lab="${l.id}">Reativar</button>`}` : ''
    })}
    ${paginacao(pagina)}
  `;
  return {
    html,
    montar() {
      const form = document.querySelector('[data-form-filtros]');
      form?.addEventListener('submit', (e) => { e.preventDefault(); Object.assign(st, { busca: form.elements.busca.value, ativo: form.elements.ativo.value, pagina: 1 }); recarregar(); });
      document.querySelector('[data-limpar-filtros]')?.addEventListener('click', () => { Object.assign(st, { busca: '', ativo: '', pagina: 1 }); recarregar(); });
      document.querySelectorAll('[data-pagina]').forEach((b) => b.addEventListener('click', () => { st.pagina = Number(b.dataset.pagina); recarregar(); }));
      document.getElementById('novo-lab')?.addEventListener('click', () => abrirFormularioLaboratorio(app));
      document.querySelectorAll('[data-editar-lab]').forEach((b) => b.addEventListener('click', () => abrirFormularioLaboratorio(app, app.laboratorios.obter(Number(b.dataset.editarLab)))));
      document.querySelectorAll('[data-inativar-lab]').forEach((b) => b.addEventListener('click', async () => {
        const motivo = await pedirMotivo({ titulo: 'Inativar laboratório', mensagem: 'Só é possível inativar laboratórios sem equipamentos vinculados.', textoConfirmar: 'Inativar', perigo: true });
        if (!motivo) return;
        try { app.laboratorios.inativar(Number(b.dataset.inativarLab), motivo); toast('Laboratório inativado.', 'sucesso'); recarregar(); } catch (e) { tratarErro(e); }
      }));
      document.querySelectorAll('[data-reativar-lab]').forEach((b) => b.addEventListener('click', async () => {
        const motivo = await pedirMotivo({ titulo: 'Reativar laboratório', mensagem: 'Reativar este laboratório?', textoConfirmar: 'Reativar' });
        if (!motivo) return;
        try { app.laboratorios.reativar(Number(b.dataset.reativarLab), motivo); toast('Laboratório reativado.', 'sucesso'); recarregar(); } catch (e) { tratarErro(e); }
      }));
    }
  };
}

function abrirFormularioLaboratorio(app, dto = null) {
  const campos = [
    { nome: 'nome', rotulo: 'Nome', tipo: 'text', obrigatorio: true, largura: 'full' },
    { nome: 'sigla', rotulo: 'Sigla', tipo: 'text', obrigatorio: true, largura: 'half' },
    { nome: 'codigo', rotulo: 'Código', tipo: 'text', obrigatorio: true, largura: 'half' },
    { nome: 'localizacao', rotulo: 'Localização', tipo: 'text', largura: 'half' },
    { nome: 'responsavelTecnico', rotulo: 'Responsável técnico', tipo: 'text', largura: 'half' },
    { nome: 'ramal', rotulo: 'Ramal', tipo: 'text', largura: 'half' },
    { nome: 'receitaMensalCentavos', rotulo: 'Receita mensal (R$) — para RF15', tipo: 'dinheiro', largura: 'half' }
  ];
  if (dto) campos.push({ nome: 'motivo', rotulo: 'Motivo da alteração', tipo: 'textarea', obrigatorio: true, largura: 'full' });
  formularioModal({
    titulo: dto ? `Editar ${dto.sigla}` : 'Novo laboratório',
    campos,
    valores: dto ? { ...dto, receitaMensalCentavos: valorReais(dto.receitaMensalCentavos) } : {},
    onSalvar: async (dados) => {
      if (dto) { app.laboratorios.atualizar(dto.id, dados); toast('Laboratório atualizado.', 'sucesso'); }
      else { app.laboratorios.criar(dados); toast('Laboratório cadastrado.', 'sucesso'); }
      recarregar();
    }
  });
}

export function paginaUsuarios(app) {
  const st = estadoTelas.usuarios;
  const pagina = app.usuarios.listar({ ...st, tamanho: 50 });
  const pode = temPermissao(app, 'usuarios.gerenciar');
  const html = `
    <div class="pagina-cabecalho"><div><p class="eyebrow">RF06</p><h1>Usuários e perfis</h1>
    <p class="subtitulo">${pagina.total} usuário(s) • perfil único por usuário, conforme RF06/RNF02</p></div>
    <div class="cabecalho-acoes">${pode ? '<button class="btn btn-primario" id="novo-usuario">Novo usuário</button>' : ''}</div></div>
    ${filtrosBarra(`
      ${campo({ nome: 'busca', rotulo: 'Buscar', tipo: 'text', valor: st.busca, largura: 'half' })}
      ${campo({ nome: 'perfil', rotulo: 'Perfil', tipo: 'select', valor: st.perfil, opcoes: [{ valor: '', rotulo: 'Todos' }, ...opcoesPerfil()], largura: 'half' })}
      ${campo({ nome: 'ativo', rotulo: 'Situação', tipo: 'select', valor: st.ativo, opcoes: [{ valor: '', rotulo: 'Todos' }, { valor: 'true', rotulo: 'Ativos' }, { valor: 'false', rotulo: 'Inativos' }], largura: 'half' })}
    `, { limpar: true })}
    ${tabela([
      { chave: 'nome', rotulo: 'Nome' },
      { chave: 'email', rotulo: 'E-mail' },
      { chave: 'perfilRotulo', rotulo: 'Perfil' },
      { chave: 'laboratorioSigla', rotulo: 'Laboratório', render: (l) => esc(l.laboratorioSigla ?? 'Global') },
      { chave: 'ativo', rotulo: 'Situação', render: (l) => badgeSituacao(l.ativo ? 'ATIVO' : 'INATIVO', l.ativo ? 'Ativo' : 'Inativo') },
      { chave: 'ultimoAcessoEm', rotulo: 'Último acesso', render: (l) => esc(fmtDataHora(l.ultimoAcessoEm)) }
    ], pagina.itens, {
      vazio: 'Nenhum usuário encontrado.',
      acoes: (l) => pode ? `<button class="btn btn-mini btn-secundario" data-editar-usuario="${l.id}">Editar</button><button class="btn btn-mini btn-secundario" data-senha="${l.id}">Senha</button>${l.ativo ? `<button class="btn btn-mini btn-perigo" data-inativar-usuario="${l.id}">Inativar</button>` : `<button class="btn btn-mini btn-secundario" data-reativar-usuario="${l.id}">Reativar</button>`}<button class="btn btn-mini btn-perigo" data-anonimizar="${l.id}" ${l.anonimizado ? 'disabled' : ''}>Anonimizar</button>` : ''
    })}
    ${paginacao(pagina)}
  `;
  return {
    html,
    montar() {
      const form = document.querySelector('[data-form-filtros]');
      form?.addEventListener('submit', (e) => { e.preventDefault(); Object.assign(st, { busca: form.elements.busca.value, perfil: form.elements.perfil.value, ativo: form.elements.ativo.value, pagina: 1 }); recarregar(); });
      document.querySelector('[data-limpar-filtros]')?.addEventListener('click', () => { Object.assign(st, { busca: '', perfil: '', ativo: '', pagina: 1 }); recarregar(); });
      document.querySelectorAll('[data-pagina]').forEach((b) => b.addEventListener('click', () => { st.pagina = Number(b.dataset.pagina); recarregar(); }));
      document.getElementById('novo-usuario')?.addEventListener('click', () => abrirFormularioUsuario(app));
      document.querySelectorAll('[data-editar-usuario]').forEach((b) => b.addEventListener('click', () => abrirFormularioUsuario(app, app.usuarios.obter(Number(b.dataset.editarUsuario)))));
      document.querySelectorAll('[data-senha]').forEach((b) => b.addEventListener('click', () => {
        const id = Number(b.dataset.senha);
        const usuario = app.usuarios.obter(id);
        formularioModal({
          titulo: `Redefinir senha — ${usuario.nome}`,
          campos: [{ nome: 'novaSenha', rotulo: 'Nova senha', tipo: 'password', obrigatorio: true, largura: 'full', ajuda: '8 a 128 caracteres, com ao menos uma letra e um número.' }],
          onSalvar: async (dados) => { await app.usuarios.redefinirSenha(id, dados.novaSenha); toast('Senha redefinida.', 'sucesso'); }
        });
      }));
      document.querySelectorAll('[data-inativar-usuario]').forEach((b) => b.addEventListener('click', async () => {
        const motivo = await pedirMotivo({ titulo: 'Inativar usuário', mensagem: 'O usuário perderá o acesso, mas seus registros serão preservados.', textoConfirmar: 'Inativar', perigo: true });
        if (!motivo) return;
        try { app.usuarios.inativar(Number(b.dataset.inativarUsuario), motivo); toast('Usuário inativado.', 'sucesso'); recarregar(); } catch (e) { tratarErro(e); }
      }));
      document.querySelectorAll('[data-reativar-usuario]').forEach((b) => b.addEventListener('click', async () => {
        const motivo = await pedirMotivo({ titulo: 'Reativar usuário', mensagem: 'Reativar o acesso deste usuário?', textoConfirmar: 'Reativar' });
        if (!motivo) return;
        try { app.usuarios.reativar(Number(b.dataset.reativarUsuario), motivo); toast('Usuário reativado.', 'sucesso'); recarregar(); } catch (e) { tratarErro(e); }
      }));
      document.querySelectorAll('[data-anonimizar]').forEach((b) => b.addEventListener('click', async () => {
        const motivo = await pedirMotivo({ titulo: 'Anonimizar usuário (LGPD)', mensagem: 'Os dados pessoais serão substituídos e o usuário será desativado. A auditoria preserva o ID. Esta ação é irreversível.', textoConfirmar: 'Anonimizar', perigo: true, rotulo: 'Fundamento da anonimização (mín. 10 caracteres)' });
        if (!motivo) return;
        try { app.usuarios.anonimizar(Number(b.dataset.anonimizar), motivo); toast('Usuário anonimizado.', 'sucesso'); recarregar(); } catch (e) { tratarErro(e); }
      }));
    }
  };
}

function abrirFormularioUsuario(app, dto = null) {
  const labs = opcoesLab(app);
  const campos = [
    { nome: 'nome', rotulo: 'Nome', tipo: 'text', obrigatorio: true, largura: 'half' },
    { nome: 'email', rotulo: 'E-mail', tipo: 'email', obrigatorio: true, largura: 'half' },
    { nome: 'perfil', rotulo: 'Perfil', tipo: 'select', opcoes: opcoesPerfil(), obrigatorio: true, largura: 'half' },
    { nome: 'laboratorioId', rotulo: 'Laboratório (obrigatório para Gestor de Lab. e Técnico)', tipo: 'select', opcoes: [{ valor: '', rotulo: '— Global —' }, ...labs], largura: 'half' }
  ];
  if (!dto) campos.push({ nome: 'senha', rotulo: 'Senha inicial', tipo: 'password', obrigatorio: true, largura: 'half', ajuda: '8 a 128 caracteres, com letra e número.' });
  else campos.push({ nome: 'motivo', rotulo: 'Motivo da alteração', tipo: 'textarea', obrigatorio: true, largura: 'full' });
  formularioModal({
    titulo: dto ? `Editar ${dto.nome}` : 'Novo usuário',
    campos,
    valores: dto ?? {},
    textoSalvar: dto ? 'Salvar alterações' : 'Cadastrar usuário',
    onSalvar: async (dados) => {
      if (dto) { await app.usuarios.atualizar(dto.id, dados); toast('Usuário atualizado.', 'sucesso'); }
      else { await app.usuarios.criar(dados); toast('Usuário cadastrado.', 'sucesso'); }
      recarregar();
    }
  });
}
