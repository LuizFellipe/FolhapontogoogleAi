# EducaSync — Extração de Folhas de Ponto

Ferramenta em Python para leitura, extração automatizada e estruturação de dados cadastrais de servidores a partir de folhas de frequência/ponto em formato PDF.

---

## 📌 Visão Geral

O **EducaSync** processa documentos PDF de frequência escolar/funcional (servidores efetivos e temporários) gerados pelo sistema educacional e converte os cabeçalhos de ponto em registros JSON consolidados, estruturados e normalizados.

### Dados Extraídos por Servidor

Cada registro no JSON resultante contém os seguintes campos:

| Campo | Tipo | Descrição | Exemplo |
| :--- | :--- | :--- | :--- |
| `matricula` | `string` | Matrícula funcional (inclui dígitos e DV, ex: `X`) | `"0026010X"` |
| `nome` | `string` | Nome completo do servidor | `"SERVIDORA EXEMPLO N"` |
| `cargo_especialidade` | `string \| null` | Cargo ou especialidade descrita na folha | `"PROFESSOR DE EDUC. BASICA 25-PQ5"` |
| `disciplina` | `string \| null` | Disciplina de atuação ou projeto de lotação | `"INFORMATICA"` |
| `carga_horaria` | `integer \| null` | Carga horária semanal (C.H.) | `40` |
| `funcao` | `string \| null` | Cargo de chefia/função exercida (quando aplicável) | `"SUPERVISOR"` |
| `vinculo` | `string` | Vínculo funcional (`"efetivo"` ou `"temporario"`) | `"efetivo"` |
| `arquivo` | `string` | Nome do arquivo PDF de origem | `"09.efetivos.pdf"` |

---

## 📁 Estrutura do Projeto

```text
educasync/
├── educa_folha/                # Diretório contendo as folhas de ponto em PDF
│   ├── 09.efetivos.pdf         # Folhas de ponto dos servidores efetivos
│   └── 09.temporarios.pdf      # Folhas de ponto dos servidores temporários
├── extrair_folhas.py           # Script principal de extração e parsing
├── dados_folha_ponto.json      # Arquivo de saída consolidado (gerado pelo script)
├── requirements.txt            # Dependências Python (PyMuPDF)
└── README.md                   # Documentação do projeto
```

---

## ⚙️ Pré-requisitos e Instalação

- **Python 3.8+**
- Gerenciador de pacotes **pip**

### 1. Criar e ativar o ambiente virtual (recomendado)

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Instalar dependências

```bash
pip install -r requirements.txt
```

> **Nota:** A única dependência externa principal é a biblioteca [`PyMuPDF`](https://pymupdf.readthedocs.io/) (`pymupdf>=1.24.0`), utilizada para renderização e extração de texto de alta velocidade a partir dos PDFs.

---

## 🚀 Como Usar

### Via menu do sistema (recomendado)

Na raiz do projeto, rode `./folha_manager.sh` e escolha **[ 11 ] Extrair Folhas de Ponto (EducaSync)**. A opção instala o PyMuPDF no `venv` se necessário e gera `docs/dados_folha_ponto.json`, que o endpoint `GET /api/educasync/dados` lê com prioridade sobre `educasync/dados_folha_ponto.json` (usado apenas como fallback). Basta recarregar a aba EducaSync no sistema.

> **Dados sensíveis:** os PDFs de `educa_folha/` e os `dados_folha_ponto.json` estão no `.gitignore` — ficam só na máquina local/servidor e não são versionados.

### Execução Básica (padrão)

Por padrão, o script busca os arquivos PDF na pasta `educa_folha/` e gera o arquivo `dados_folha_ponto.json` na raiz:

```bash
python3 extrair_folhas.py
```

### Opções de Linha de Comando (CLI)

Você pode personalizar pastas, arquivos de saída e verbosidade de logs:

```bash
python3 extrair_folhas.py [OPÇÕES]
```

| Parâmetro | Atalho | Descrição | Padrão |
| :--- | :--- | :--- | :--- |
| `--input-dir` | `-i` | Diretório onde estão os PDFs | `educa_folha` |
| `--output` | `-o` | Caminho do arquivo JSON de saída | `dados_folha_ponto.json` |
| `--verbose` | `-v` | Exibe alertas (WARNING) para registros sem disciplina/função | Desativado |
| `--debug` | | Exibe logs detalhados, incluindo registros com CH zero | Desativado |

### Exemplos de Comandos

```bash
# Executar apontando para outra pasta e outro arquivo de saída
python3 extrair_folhas.py -i caminho/para/pdfs -o relatorio.json

# Executar com logs detalhados de validação
python3 extrair_folhas.py --verbose
```

---

## 🔍 Como o Script Funciona Internamente

1. **Varredura e Descoberta:**
   - O script mapeia todos os arquivos `.pdf` contidos no diretório de entrada informado (`--input-dir`).

2. **Parsing por Página:**
   - Utiliza `pymupdf.open()` para inspecionar cada página individualmente.
   - Identifica páginas de ponto procurando os delimitadores `"Folha de Frequência"` e `"Matrícula:"`.

3. **Extração com Expressões Regulares (Regex):**
   - **Matrícula:** Captura o identificador alfanumérico (mesma linha ou subsequente).
   - **Nome / Cargo / Disciplina / Carga Horária / Função:** Isola cada campo respeitando delimitadores de seção no cabeçalho.
   - **Limpeza de Texto:** Remove quebras de linha indevidas, espaços não separáveis (`\xa0`) e espaços duplicados.

4. **Identificação de Vínculo:**
   - Detecta automaticamente se o servidor é `efetivo` ou `temporario` a partir do nome do arquivo (`temporar`, `efetiv`) ou da descrição do cargo.

5. **Consolidação e Métricas de Integridade:**
   - Salva a lista de objetos em formato JSON (`ensure_ascii=False`, formatado com indentação de 2 espaços).
   - Exibe no terminal o **Resumo de Integridade**, informando total de servidores, registros completos, registros sem disciplina/função e casos de carga horária ausente ou zerada.

---

## 📦 Como Usar Como Módulo em Outro Sistema

Se você deseja levar o **EducaSync** para dentro de outro projeto/sistema:

### 1. Copie apenas a pasta do módulo
Copie a pasta `educasync/` para o diretório de módulos ou raiz do outro sistema:
*(⚠️ Não copie `.venv/` nem pastas com cache `__pycache__`)*.

```text
meu_sistema/
├── app/
│   └── main.py
├── modulos/
│   └── educasync/
│       ├── __init__.py
│       └── extrair_folhas.py
└── requirements.txt
```

### 2. Adicione a dependência no outro sistema
No `requirements.txt` do projeto de destino, adicione:
```text
pymupdf>=1.24.0
```

### 3. Importe e use diretamente no código
```python
from pathlib import Path
from educasync import processar_pdf

# Extrair dados de um arquivo PDF específico
caminho = Path("caminho/para/folha_de_ponto.pdf")
registros = processar_pdf(caminho)

for r in registros:
    print(r["matricula"], r["nome"], r["disciplina"], r["carga_horaria"])
```
