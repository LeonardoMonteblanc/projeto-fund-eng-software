import re, os, json

def read(p): return open(p,encoding='utf-8').read().splitlines()

def extract_functions(lines, names):
    out={}
    for i,l in enumerate(lines):
        m=re.match(r'^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(', l)
        if m and m.group(1) in names:
            name=m.group(1)
            j=i+1
            while j < len(lines) and lines[j] != '}':
                j+=1
            if j>=len(lines): raise SystemExit('no end '+name)
            out[name]='\n'.join(lines[i:j+1])
    missing=[n for n in names if n not in out]
    if missing: raise SystemExit('missing functions '+str(missing))
    return out

v1=read('src/frontend/pages/legacy-views.js')
v2=read('src/frontend/pages/legacy-views2.js')
main=read('src/frontend/main.js')

const_head = """import {
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
import { temPermissao, recarregar } from '../session-context.js';"""

def clean(code):
    code=re.sub(r'\btem\(app', 'temPermissao(app', code)
    code=re.sub(r'\btem\(', 'temPermissao(', code)
    code=re.sub(r'\bestado\.', 'estadoTelas.', code)
    return code

def write_page(path, header, blocks):
    open(path,'w',encoding='utf-8').write(header+'\n\n'+'\n\n'.join(clean(b) for b in blocks)+'\n')

# session
f=extract_functions(v1, ['paginaLogin','paginaPainel'])
write_page('src/frontend/pages/session.js', "import { esc } from '../components/ui.js';\nimport { cartaoIndicador, secao } from '../components/common.js';\nimport { temPermissao } from '../session-context.js';", [f['paginaLogin'],f['paginaPainel']])

# equipment
f=extract_functions(v1, ['paginaEquipamentos','camposEquipamento','abrirFormularioEquipamento','paginaEquipamentoDetalhe','paginaItens','camposItem','abrirFormularioItem','abrirFormularioCategoria'])
write_page('src/frontend/pages/equipment.js', const_head+"\nimport { abrirFormularioSolicitacao, abrirRealizarEvento } from './operations.js';", list(f.values()))

# operations
f=extract_functions(v2, ['paginaEventos','paginaEventoNovo','abrirRealizarEvento','paginaSolicitacoes','abrirFormularioSolicitacao','paginaAgenda'])
write_page('src/frontend/pages/operations.js', const_head, list(f.values()))

# registry
f=extract_functions(v2, ['paginaFornecedores','abrirFormularioFornecedor','paginaLaboratorios','abrirFormularioLaboratorio','paginaUsuarios','abrirFormularioUsuario'])
write_page('src/frontend/pages/registry.js', const_head, list(f.values()))

# reports + audit
f=extract_functions(v2, ['paginaRelatorios','paginaAuditoria'])
# RELATORIOS const block
start=next(i for i,l in enumerate(v2) if l.startswith('const RELATORIOS = ['))
end=next(i for i in range(start,len(v2)) if v2[i]=='];')
rel='\n'.join(v2[start:end+1]).replace('const RELATORIOS','export const RELATORIOS')
write_page('src/frontend/pages/reports.js', const_head, [rel, f['paginaRelatorios'], f['paginaAuditoria']])

# settings
f=extract_functions(v2, ['paginaConfig'])
write_page('src/frontend/pages/settings.js', const_head, [f['paginaConfig']])

# privacy
f=extract_functions(v2, ['paginaPrivacidade'])
write_page('src/frontend/pages/privacy.js', const_head, [f['paginaPrivacidade']])

# help from main
f=extract_functions(main, ['paginaAjuda'])
write_page('src/frontend/pages/help.js', "import { esc } from '../components/ui.js';", [f['paginaAjuda']])

# add opcoesEquipamentos to common.js
common=open('src/frontend/components/common.js',encoding='utf-8').read()
if 'export function opcoesEquipamentos' not in common:
    extra = """
export function opcoesEquipamentos(app) {
  const pagina = app.equipamentos.listar({ tamanho: 3000, situacao: 'ATIVO' });
  return pagina.itens.map((e) => ({
    valor: e.id,
    rotulo: `${e.tag} — ${e.item?.nome ?? ''} (${e.laboratorio?.sigla ?? ''})`
  }));
}
"""
    common += extra
    open('src/frontend/components/common.js','w',encoding='utf-8').write(common)
print('pages generated')
