# Processador de Grade Horária (CSV para JSON)

Este repositório contém o script em Python [`processar_gh.py`](file:///home/luiz/Documents/FolhapontogoogleAi/gh/processar_gh.py), responsável pela conversão, consolidação e atualização incremental de dados de **Grade Horária (GH)** a partir de arquivos `.csv` para arquivos estruturados em `.json`.

---

## 📌 1. Visão Geral e Objetivo

O objetivo principal do script é automatizar a leitura dos relatórios periódicos de Grade Horária exportados em formato CSV, unificando os dados de cada semestre e ano em um único arquivo JSON correspondente.

Além da conversão simples, o script atua de forma **incremental e versionada**: quando um novo arquivo do mesmo semestre e ano é adicionado (por exemplo, uma nova exportação com alterações de professores ou status de carências), o script:
1. Detecta quais arquivos já foram lidos anteriormente.
2. Identifica os arquivos novos por ordem cronológica de data.
3. Adiciona novas carências que ainda não constavam no banco de dados.
4. Identifica carências já existentes que sofreram modificações, preservando o estado anterior em um **snapshot completo de histórico** antes de atualizar com os novos dados.

---

## 📁 2. Padrões de Nomenclatura de Arquivos

### Arquivos CSV de Entrada
Os arquivos CSV devem seguir o padrão:
```text
GH.<semestre>.sem.<dia>.<mes>.<ano>.csv
```
**Exemplos:**
- `GH.1.sem.29.09.2026.csv` (1º Semestre de 2026, exportado em 29/09/2026)
- `GH.2.sem.29.09.2026.csv` (2º Semestre de 2026, exportado em 29/09/2026)
- `GH.2.sem.10.10.2026.csv` (2º Semestre de 2026, exportado em 10/10/2026 - versão posterior)

### Arquivos JSON de Saída
O script gera (ou atualiza) um arquivo consolidado por semestre e ano:
```text
GH.<semestre>.sem.<ano>.json
```
**Exemplos:**
- `GH.1.sem.2026.json`
- `GH.2.sem.2026.json`

---

## 🧹 3. Tratamento e Normalização de Dados

Durante a leitura de cada CSV, o script aplica regras de sanitização para padronizar as variações encontradas nos relatórios:

| Coluna Original no CSV | Chave no JSON (`snake_case`) | Tratamento Aplicado |
| :--- | :--- | :--- |
| `CÓD. CARÊNCIA` | `cod_carencia` | Chave primária. Espaços extras removidos. |
| `CÓD. CARÊNCIA PAI` | `cod_carencia_pai` | Vazio convertido para `null`. |
| `NOME DA CARGA HORÁRIA` | `nome_carga_horaria` | Texto normalizado. |
| `PERÍODO` | `periodo` | Intervalo de datas preservado. |
| `TIPO` | `tipo` | Ex.: "Provisória", "Temporária". |
| `PROFESSOR TITULAR` | `professor_titular` | `"Não informado"` convertido para `null`. |
| `PROFESSOR SUBSTITUTO` | `professor_substituto` | Prefixo `"Carência suprida por:"` removido. `"-"` e `"Não possui"` convertidos para `null`. |
| `COMPONENTE PRINCIPAL` | `componente_principal` | Espaços excedentes e quebras limpos. |
| `SITUAÇÃO` | `situacao` | Status da carência (ex.: "Aprovada", "Convocação - Em Exercício", etc.). |
| `AÇÕES` | *(Descartada)* | Colunas vazias ou irrelevantes são ignoradas. |

Outras proteções embutidas:
- Suporte nativo a **UTF-8 com BOM** (`utf-8-sig`).
- Remoção automática de linhas vazias ou em branco.

---

## 🔄 4. Funcionamento Incremental e Versionamento (Diff)

O fluxo de execução do script segue as seguintes etapas:

```
                  Varredura de Arquivos CSV
                             │
                             ▼
         Agrupamento por (Semestre, Ano) e Ordenação Cronológica
                             │
                             ▼
              O arquivo JSON de saída já existe?
                   /                    \
                 Sim                    Não
                 /                        \
      Carrega JSON existente       Cria nova estrutura base
                 \                        /
                  \                      /
                   ▼                    ▼
             Verifica lista de 'arquivos_processados'
                             │
                             ▼
              Para cada arquivo CSV ainda NÃO processado:
                             │
    ┌────────────────────────┴────────────────────────┐
    │                                                 │
    ▼                                                 ▼
[Nova Carência]                             [Carência Existente]
Adiciona ao JSON com                       Compara todos os campos.
"historico": []                            Houve alguma alteração?
                                                /           \
                                              Sim           Não
                                              /               \
                               [Gera Snapshot no Histórico]   [Ignora]
                               Salva estado anterior, data
                               e arquivo de origem.
                               Atualiza campos com novos dados.
                             │
                             ▼
          Atualiza metadados:
          - "ultima_atualizacao"
          - "arquivos_processados"
                             │
                             ▼
                 Grava arquivo JSON final
```

### Estrutura do Snapshot de Histórico
Quando um registro existente tem qualquer campo alterado, o script registra na lista `historico`:
```json
{
  "data_modificacao": "2026-10-10",
  "arquivo_modificacao": "GH.2.sem.10.10.2026.csv",
  "registro_anterior": {
    "cod_carencia": "70444",
    "cod_carencia_pai": null,
    "nome_carga_horaria": "2.36_M_NUTRIÇÃO_24H",
    "periodo": "21/09/2026 a 25/09/2026",
    "tipo": "Provisória",
    "professor_titular": "VANESSA MOREIRA DE LIMA BRAZ",
    "professor_substituto": null,
    "componente_principal": "ESTÁGIO SUPERVISIONADO (24)",
    "situacao": "Aprovada"
  }
}
```

---

## 📄 5. Estrutura do Arquivo JSON Gerado

Exemplo real do formato produzido em `GH.<semestre>.sem.<ano>.json`:

```json
{
  "ano": 2026,
  "semestre": 2,
  "ultima_atualizacao": "2026-09-29",
  "arquivos_processados": [
    "GH.2.sem.29.09.2026.csv"
  ],
  "carencias": [
    {
      "cod_carencia": "70444",
      "cod_carencia_pai": null,
      "nome_carga_horaria": "2.36_M_NUTRIÇÃO_24H",
      "periodo": "21/09/2026 a 25/09/2026",
      "tipo": "Provisória",
      "professor_titular": "VANESSA MOREIRA DE LIMA BRAZ",
      "professor_substituto": "MONIKE INGLYD FREITAS DIAS (07366738735)",
      "componente_principal": "ESTÁGIO SUPERVISIONADO (24)",
      "situacao": "Convocação - Carência Finalizada",
      "historico": []
    }
  ]
}
```

---

## 🚀 6. Como Executar

### Pré-requisitos
- Python 3.8 ou superior.
- Nenhuma dependência externa necessária (utiliza exclusivamente a biblioteca padrão: `csv`, `json`, `pathlib`, `re`, `datetime`, `argparse`).

### Comandos de Execução

1. **Processar o diretório atual:**
   ```bash
   python3 processar_gh.py
   ```

2. **Processar um diretório específico:**
   ```bash
   python3 processar_gh.py --dir /caminho/para/pasta_com_csvs
   ```
   Ou com o atalho `-d`:
   ```bash
   python3 processar_gh.py -d ./dados
   ```

---

## 💡 7. Exemplo Prático de Uso no Dia a Dia

1. **Cenário Inicial**:
   Você tem apenas `GH.2.sem.29.09.2026.csv`. Executa `python3 processar_gh.py`.
   - Gera `GH.2.sem.2026.json` com 111 carências e `"arquivos_processados": ["GH.2.sem.29.09.2026.csv"]`.

2. **Segunda Execução (Sem novos arquivos)**:
   Executa `python3 processar_gh.py` novamente.
   - O script detecta que o arquivo já foi processado e encerra sem refazer trabalho ou duplicar dados (idempotência).

3. **Chegada de Atualização**:
   Você adiciona `GH.2.sem.10.10.2026.csv` na pasta e executa `python3 processar_gh.py`.
   - O script ignora o arquivo de 29/09 (já processado).
   - Lê o arquivo de 10/10.
   - Detecta quais carências são novas e quais foram alteradas (ex.: carência que teve professor substituto convocado).
   - Armazena o estado antigo no histórico de cada carência alterada e aplica as novidades.
   - Atualiza `ultima_atualizacao` para `"2026-10-10"` e inclui `GH.2.sem.10.10.2026.csv` na lista `arquivos_processados`.
