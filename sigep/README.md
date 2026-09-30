# Extrator de Fichas Cadastrais - SIGEP

Script para automatizar a extração em massa de Fichas Cadastrais de servidores
no sistema SIGEP, a partir de uma listagem geral
em PDF.

## O que o script faz

Para cada servidor listado em `servidores.csv`, o `raspar_fichas.py`:

1. Acessa o menu **02.Cadastro** do SIGEP
2. Digita o nome do servidor no campo de busca e clica em **Buscar**
3. Entre os resultados retornados, identifica o correto comparando a
   **matrícula** (evita pegar o registro errado em caso de homônimos)
4. Abre a ficha do servidor encontrado
5. Gera a **Ficha Cadastral** em PDF (refazendo internamente a mesma
   requisição que o botão "Imprimir Ficha Cadastral" dispara) e confirma
   que a resposta é realmente um PDF
6. Salva o arquivo como `primeironome.matricula.pdf` na pasta do projeto
   (ex: `fulano.01234567.pdf`)

Ao final (inclusive se interrompido com Ctrl+C), imprime um resumo com
quantos arquivos foram gerados nesta execução, quantos já existiam (pulados)
e quais servidores precisam de revisão manual (não encontrados, matrícula
divergente ou resposta inválida do SIGEP).

## Lógica de funcionamento

O script é organizado em quatro etapas principais, chamadas em sequência
pelo `main()` para cada linha do CSV:

### 1. `carregar_servidores()`
Lê `servidores.csv` e retorna uma lista de dicionários `{matricula, nome}`.
É a fonte de verdade de quem precisa ter a ficha extraída.

### 2. `buscar_e_abrir(page, matricula_esperada, nome)`
Faz a busca e a desambiguação:
- Navega até `cadastro.jsp` (via `abrir_cadastro`), preenche o campo de
  busca com o `nome` e clica em **Buscar**. Se o campo de busca não aparecer
  (sessão expirada, redirecionou para o login), o script **pausa** e pede
  para você logar de novo e apertar ENTER — em vez de falhar todos os
  servidores restantes.
- Após uma pausa básica (`DELAY_MS`, 1 s), espera aparecer na lista o link
  com a **matrícula esperada** (até `BUSCA_TIMEOUT_MS`, 15 s). Não basta
  qualquer resultado: a página pode ainda exibir links antigos enquanto a
  busca carrega. Se não aparecer, o servidor é reportado como não
  encontrado, junto com os resultados que apareceram (para diagnóstico).
- O SIGEP responde com uma lista de links, um por resultado, no formato
  `MATRÍCULA NOME (UNIDADE)` — cada link tem um atributo
  `href="javascript:AbreDados(<idServidor>,'<codigoUnidade>')"`.
  Esses dois valores (`idServidor` e `codigoUnidade`) são os identificadores
  internos que o SIGEP usa para abrir a ficha; eles não aparecem em lugar
  nenhum visível na tela, só dentro desse atributo.
- Para cada link retornado, a função extrai a matrícula do texto exibido e
  compara (normalizada, sem pontos/traços) com a matrícula esperada vinda do
  CSV. Isso resolve o problema de nomes truncados ou homônimos: mesmo que a
  busca por nome traga mais de um resultado, só o que tiver a matrícula
  correta é aceito.
- Quando encontra a correspondência, clica no link (abrindo a ficha na
  própria página), espera o botão "Imprimir Ficha Cadastral" aparecer (até
  `FICHA_TIMEOUT_MS`, 15 s), faz mais uma pausa de 1 s e retorna a tupla
  `(idServidor, codigoUnidade)`. Se a ficha não carregar, é um erro.
- **Busca vazia → `SemCadastro`**: sem resultado, o SIGEP mostra só um link
  modelo (`AbreDados(98);`, sem unidade), que já existe antes da busca. Se
  por `SEM_RESULTADO_MS` (5 s) só esse link aparecer, levanta `SemCadastro`:
  servidor ainda não cadastrado no SIGEP ou não está mais lotado na unidade.
  Não é falha — fica no CSV e é tentado de novo na próxima execução.
- Se houver resultados mas nenhum bater com a matrícula esperada, lança
  `RuntimeError` — o servidor é registrado como falha e o script segue.

### 3. `baixar_ficha_pdf(page, id_servidor, codigo_unidade)` / `post_pdf(page, endpoint, body)`
Gera o PDF de fato. Isso existe porque **clicar no botão "Imprimir Ficha
Cadastral" pela UI não é suficiente**: ele abre uma nova aba onde o Chrome
renderiza o PDF no seu visualizador nativo, e esse visualizador não expõe os
bytes originais do arquivo para o Playwright capturar diretamente.

A solução foi descobrir, observando as requisições de rede durante o clique
manual, que o botão apenas dispara um `POST` para o endpoint interno
`/FichaFuncional` com o corpo `idServidorFichaFunc=<id>&codigoUnidade=<cod>`,
e a resposta já é o PDF puro (`Content-Type: application/pdf`). A função
refaz exatamente essa chamada via `fetch()` executado dentro do contexto da
própria página (`page.evaluate`), o que reaproveita os cookies de sessão
automaticamente — sem precisar manipular login ou tokens manualmente.

A resposta binária do PDF é convertida para uma *data URL* base64
(`FileReader.readAsDataURL`) dentro do navegador, retornada como string para
o Python, e então decodificada de volta para bytes com `base64.b64decode`.
Antes de gravar, a função verifica que a resposta HTTP foi bem-sucedida e
que os bytes começam com `%PDF` — se a sessão tiver caído ou a ficha não
tiver carregado, o SIGEP pode devolver HTML ou um PDF vazio, e isso vira
uma falha reportada em vez de um arquivo inválido salvo em disco.
Esse caminho (bytes → base64 → string → bytes) é necessário porque a ponte
entre o JavaScript do navegador e o Python do Playwright só transporta dados
serializáveis como JSON (texto), não bytes binários brutos.

A mecânica genérica (fetch POST → base64 → validação `%PDF`) fica em
`post_pdf()`, reaproveitada pelo `verificar_novos.py` para a listagem.

### 4. `main()` — orquestração
Para cada servidor do CSV:
- Calcula o nome de arquivo esperado (`nome_arquivo`): primeiro nome sem
  acentos e em minúsculas + matrícula só com dígitos, ex:
  `FULANO DE TAL SOUZA` / `0123.456-7` → `fulano.01234567.pdf`.
  Como a matrícula é única, dois vínculos da mesma pessoa geram arquivos
  distintos.
- Se o arquivo já existe, pula (permite retomar execuções interrompidas sem
  refazer trabalho).
- Caso contrário, chama `buscar_e_abrir` e, se encontrou o servidor certo,
  chama `baixar_ficha_pdf` e grava o resultado em disco (primeiro num
  `.pdf.tmp`, depois renomeado — assim uma interrupção nunca deixa um PDF
  truncado que seria pulado nas próximas execuções).
- Qualquer erro (busca sem resultado, matrícula não encontrada, falha de
  rede etc.) é capturado e registrado numa lista de falhas, sem interromper
  o processamento dos demais servidores.
- Ao final (também após Ctrl+C), imprime um resumo: quantos foram gerados,
  quantos já existiam, quem está **sem cadastro** no SIGEP (listado à parte)
  e a lista de falhas que precisam de revisão manual.

O uso de `launch_persistent_context` (em vez de abrir uma sessão anônima) faz
o Chromium guardar cookies/local storage em `.browser_profile/`, para que o
login manual feito na primeira execução possa ser reaproveitado nas
seguintes, enquanto a sessão do SIGEP continuar válida.

## Arquivos do projeto

| Arquivo | Descrição |
|---|---|
| `ListagemGeral.pdf` | Listagem original da unidade (fonte dos nomes/matrículas) |
| `servidores.csv` | Matrícula + nome extraídos e deduplicados do PDF acima — é o **input** do raspador (fora do git, dados pessoais) |
| `verificar_novos.py` | Baixa `listagem.geral.DD.MM.YYYY.pdf` (POST `/EmitirRelatorioGeral`), anexa matrículas novas ao `servidores.csv` e avisa quem saiu. Rodar antes do raspador |
| `raspar_fichas.py` | Raspador (Playwright): baixa as fichas do SIGEP |
| `extrair_fichas.py` | Parser: lê as fichas PDF e gera `ficha.cadastral.DD.MM.YYYY.xlsx` e `.json` |
| `workflow_notes.md` | Anotações detalhadas de como o fluxo do SIGEP funciona (útil se o site mudar e o script precisar de ajustes) |
| `<primeironome>.<matricula>.pdf` | Saída do raspador e input do parser: uma ficha por matrícula (ex: `fulano.01234567.pdf`) |

## Pré-requisitos

- Python 3.8+
- Playwright para Python

Instalação:

```bash
pip install playwright
playwright install chromium
```

## Como usar

```bash
python3 raspar_fichas.py        # todos os pendentes
python3 raspar_fichas.py 3      # só os 3 próximos pendentes (bom para testar)
python3 raspar_fichas.py --status  # só lista quem está no CSV sem ficha (offline, sem login)
```

1. Uma janela do Chromium abrirá na página de login do SIGEP (URL definida em `raspar_fichas.py`).
2. **Faça login manualmente** com suas credenciais (o script não sabe login/senha).
3. Volte ao terminal e pressione **ENTER** quando o login estiver concluído.
4. O script processa a lista inteira automaticamente, imprimindo o progresso
   linha a linha (`[12/134] NOME (matrícula)... OK`, `SEM CADASTRO NO SIGEP`
   ou `NAO ENCONTRADO`).

A sessão do navegador fica salva em `.browser_profile/` (perfil persistente).
Na prática, o cookie de sessão do SIGEP não sobrevive ao fechamento do
navegador, então cada execução pede login — o script espera o ENTER sem
recarregar a página, dando tempo de logar com calma. Se a sessão expirar no meio da execução,
o script pausa e pede novo login no terminal.

### Reexecução / retomar de onde parou

O script **pula automaticamente** servidores cujo PDF de saída já existe na
pasta. Isso significa que:
- É seguro interromper (Ctrl+C) e rodar de novo depois — ele não repete
  trabalho já feito e o resumo é impresso mesmo assim.
- Se quiser forçar a regeração de uma ficha específica, apague o `.pdf`
  correspondente antes de rodar novamente.

## Atualizando a lista de servidores

```bash
python3 verificar_novos.py                              # baixa listagem de hoje (login manual)
python3 verificar_novos.py listagem.geral.27.09.2026.pdf # só compara PDF já baixado
python3 raspar_fichas.py                                # baixa fichas dos novos
```

`verificar_novos.py` gera a Listagem do Cadastro Geral (CRE Guará / CEP ETG)
via POST `/EmitirRelatorioGeral`, salva `listagem.geral.DD.MM.YYYY.pdf`, lê as
matrículas com `pdftotext -layout` e compara **por matrícula** com o CSV:
- **Novos**: anexados ao `servidores.csv` (matrícula pontuada, cargo grudado
  ao nome removido).
- **Não estão mais na listagem**: só avisa, nunca remove (ex: licença médica —
  a pessoa pode voltar).

Aceita matrícula com pontuação (`0243.044-4`, layout antigo) ou sem
(`02430444`, layout atual). Detalhes da descoberta em `workflow_notes.md`.

## Lançar eventos da Folha de Ponto (03.Lançamento)

`lancar_eventos.py` lê o **Relatório de Eventos** do sistema (`GET /api/sigep/eventos`, mesmos ranges do
ReportsModal) e, por matrícula, confere os "Registros Localizados" no SIGEP:

- mesmo evento + mesma data inicial e final → confere a Obs: igual aos turnos → flag `JA_EXISTIA`;
  vazia/diferente → abre o registro, grava a Obs certa → flag `LANCADO` (`--reconferir` revisa também os já `JA_EXISTIA`)
- ausente → Novo → Incluir → Tipo de Evento (casado por **nome**) → Observações = turno (`MAT VESP`) → Gravar →
  rebusca e, se apareceu, flag `LANCADO`
- exceções de Obs por matrícula em `obs_sigep.json` (local, fora do git: `{"<matrícula>": "MAT VESP"}`) (ex: redução de carga horária — assina só `MAT` na folha, SIGEP `MAT VESP`)
- sobreposição parcial → `CONFLITO` (não lança, revisar à mão). Ignorados: férias (SIGEP exige PAF) e abono aniversário (não existe no SIGEP).

A flag (`POST /api/sigep/eventos/sync`) aparece na coluna **SIGEP** do relatório com a data.
Roda na máquina local (Chromium com janela; login manual) contra a API de dev ou produção.

```bash
python3 lancar_eventos.py --selftest                    # testes das regras
python3 lancar_eventos.py                               # menu (API local :5000)
python3 lancar_eventos.py --api http://servidor:5000/api
```

Menu: pede mês/ano (ENTER = mês atual), abre o Chromium pro login (uma vez só) e lista os servidores
com eventos no mês (`·` pendente, `✓` sincronizado, `-` ignorado). Comandos: `4`, `1,4,7` ou `2-5` rodam
esses servidores, `t` roda todos os pendentes, `v 4` mostra os eventos, `l` recarrega, `m` troca o mês,
`c` liga/desliga o ENTER antes de cada Gravar. Cada execução pergunta o modo: **[s]imular** (dry-run: só
compara e marca os que já existem, padrão) ou **[l]ançar** no SIGEP.

## Limitações conhecidas

- **Nomes truncados**: o PDF de listagem corta nomes muito longos (ex:
  "JOSE DAS NEVES PEREIRA DO"). O SIGEP aceita busca por nome parcial,
  então a busca ainda funciona — a matrícula é o critério real de
  confirmação, não o nome completo.
- **Linhas repetidas na listagem**: quando o PDF traz a mesma matrícula e
  nome mais de uma vez, é a mesma pessoa — as repetições já foram removidas
  do CSV.
- **Mesma pessoa com matrículas diferentes** (ex: BELTRANA DE TAL DA
  SILVA, com 2 cadastros: 0111.111-1 e 0222.222-2): cada matrícula gera sua
  própria ficha (`beltrana.01111111.pdf` e `beltrana.02222222.pdf`), já que a
  matrícula faz parte do nome do arquivo.
- **Timeouts**: se o SIGEP estiver muito lento, buscas que demorem mais que
  `BUSCA_TIMEOUT_MS` são reportadas como "não encontrado". Nesse caso, basta
  rodar de novo (só os que faltam serão processados) ou aumentar a constante
  no topo do script.
- **Dependência da estrutura do site**: o script depende de seletores e do
  endpoint interno `/FichaFuncional` do SIGEP. Se o sistema for atualizado,
  os seletores/parâmetros podem precisar de ajuste — ver `workflow_notes.md`
  para o detalhamento técnico de como cada etapa foi descoberta.

## Parser de fichas (`extrair_fichas.py`)

Lê os PDFs `<primeironome>.<matricula>.pdf` da pasta (ignorando `Emitir*` e
`Listagem*`) com `pdftotext -bbox-layout` e gera, na mesma pasta,
`ficha.cadastral.DD.MM.YYYY.xlsx` (uma aba por entidade: servidores, cargas,
habilitações, componentes curriculares e cursos) e o `.json` equivalente.

```bash
sudo apt install poppler-utils
pip install beautifulsoup4 openpyxl
python3 extrair_fichas.py [pasta]   # padrão: pasta atual
```
