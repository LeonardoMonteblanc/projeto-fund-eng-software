# Relatório de importação da base real

Gerado em 2026-11-08T18:02:59.300Z por `scripts/importar-base-real.js`.

## Cobertura

| Laboratório | Equipamentos | Com calibração | Sem calibração |
| --- | ---: | ---: | ---: |
| LASFI | 86 | 85 | 1 |
| LAMEC | 61 | 58 | 3 |
| LCMEC | 589 | 588 | 1 |
| LMC | 58 | 57 | 1 |
| LAMAT | 174 | 169 | 5 |
| LAPA | 321 | 311 | 10 |
| LCOR | 162 | 98 | 64 |
| LAPAM | 227 | 219 | 8 |
| LBTEC | 33 | 33 | 0 |
| LQFS | 200 | 108 | 92 |
| **Total** | **1911** | **1726** | **185** |

## Distribuição por categoria

| Categoria | Equipamentos |
| --- | ---: |
| Volume/Viscosidade/Massa Específica | 875 |
| Temperatura | 470 |
| Massa | 178 |
| Outros | 168 |
| Dimensional | 64 |
| Eletricidade/Tempo/Frequência | 63 |
| Pressão/Vazão/Nível | 40 |
| Força/Torque/Dureza | 34 |
| Ópticos | 10 |
| Acústica/Vibração | 9 |

## Lacunas encontradas na base de origem

- **1860** equipamentos sem número de patrimônio.
- **1873** equipamentos sem número de série identificável no texto.
- **185** equipamentos sem data de calibração registrada (célula vazia ou "-").
- A planilha de origem **não contém** data de aquisição, valor de aquisição nem data de colocação em uso.
- **21** TAGs repetidas entre laboratórios (ex.: `BAL 01`); a unicidade de TAG foi aplicada **por laboratório**, com desambiguação por sufixo dentro do mesmo laboratório.
- O CA de calibração não existe na planilha; foi derivado por categoria e marcado em `parametrosEstimados`. Deve ser revisado antes de registrar novas calibrações.
- A periodicidade foi convertida de anos para meses (1,5 anos = 18 meses).

## Fontes complementares

- **FG 020**: 162 registros de dados, 466 registros de status de calibração e 164 registros de manutenção preventiva. Usado para enriquecer o LCOR (patrimônio, A/D, certificado, observações e periodicidade).
- **FG 006**: 10 calibrações históricas da `BAL 01` do LCOR, com Erro, U, CA e resultado — único conjunto da base com resultados metrológicos reais.

## Decisões de modelagem

- **Item** é o modelo abstrato (nome + fabricante); **Equipamento** é a unidade física com TAG e laboratório.
- TAG, patrimônio e série únicos: patrimônio/série são globais quando informados; TAG é única **por laboratório**, pois a base real reutiliza a mesma TAG em laboratórios distintos.
- Registros importados podem estar **PARCIAL**: a aplicação exibe as pendências e exige complementação antes de operações que dependam do campo.
- Nenhuma data, patrimônio, série ou valor foi inventado. Campos não presentes permanecem nulos.

## Linhas não reconhecidas como equipamento: 13

Amostra:

- Linha 4: | Identificação | Equipamento | Marca | Faixa e pontos de calibração | Última Calibração | Frequência de Calibração (Anos)
- Linha 94: | Identificação | Equipamento | Marca | Faixa e pontos de calibração | Última Calibração | Frequência de Calibração (Anos)
- Linha 163: | Identificação | Equipamento | Marca | Faixa e pontos de calibração | Última Calibração | Frequência de Calibração (Anos)
- Linha 787: | Identificação | Equipamento | Marca | Faixa e pontos de calibração | Última Calibração | Frequência de Calibração (Anos)
- Linha 849: | Identificação | Equipamento | Marca | Faixa e pontos de calibração | Última Calibração | Frequência de Calibração (Anos)
- Linha 1079: | Identificação | Equipamento | Marca | Faixa e pontos de calibração | Última Calibração | Frequência de Calibração (Anos)
- Linha 1436: | Identificação | Equipamento | Marca | Faixa e pontos de calibração | Última Calibração | Frequência de Calibração (Anos)
- Linha 1542: | Identificação | Equipamento | Marca | Faixa e pontos de calibração | Última Calibração | Frequência de Calibração (Anos)
- Linha 1781: | Identificação | Equipamento | Marca | Faixa e pontos de calibração | Última Calibração | Frequência de Calibração (Anos)
- Linha 1818: | Identificação | Equipamento | Marca | Faixa e pontos de calibração | Última Calibração | Frequência de Calibração (Anos)
- Linha 2154: Laboratório | Responsável Técnico | E-mail | Ramal | Bloco | Sala
- Linha 2167: Categorias | Temperatura | Massa | Força/Torque/Dureza | Eletricidade/Tempo/Frequência | Dimensional | Ópticos | Pressão/Vazão/Nível | Volume/Viscosidade/ Massa
- Linha 2168: Subcategorias | Controlador de Temperatura | Peso Padrão | Célula de Carga | Timer | Paquímetro | Espectrômetro de emissão óptica | Manômetro | Pipeta Volumétri
