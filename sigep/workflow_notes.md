# SIGEP - Passo a passo extração de Ficha Cadastral (rascunho para automação)

## Objetivo
Para cada servidor listado em ListagemGeral.pdf: buscar no SIGEP, abrir a ficha,
imprimir/gerar PDF da Ficha Cadastral e salvar como `primeironome.matricula.pdf`
na pasta do projeto (ex: `fulano.01234567.pdf`).

## Ambiente
- URL base: https://sigep.se.df.gov.br/
- Pós-login redireciona para: https://sigep.se.df.gov.br/home.jsp
- Login é manual (feito pelo usuário no navegador via Playwright MCP)
- Usuário logado neste teste: <USUÁRIO GESTOR> (Perfil: Equipe Gestora, Unidade CEP ETG, código 990210000029)

## Navegação principal (menu superior)
- 01.Início -> home.jsp
- 02.Cadastro -> cadastro.jsp   <-- usar este para buscar servidor
- 03.Lançamento -> evento.jsp
- 04.Modulação (submenu)
- 05.Gestão (submenu)
- 06.Remanejamento (submenu)
- 07.Relatórios (submenu)
- 08.Publicações (submenu)
- 09.Utilitários (submenu)
- Sair -> closeSession.jsp

## Passos planejados (a confirmar na prática)
1. Clicar em "02.Cadastro" (link para cadastro.jsp)
2. Localizar campos de busca "Nome" / "Sobrenome" (a confirmar rótulos exatos)
3. Digitar nome e sobrenome do servidor (extraídos da lista do PDF)
4. Clicar em "Buscar"
5. Na lista de resultados, clicar no nome do servidor
6. Na ficha do servidor, clicar em "Imprimir Ficha Cadastral"
7. Capturar o pop-up/nova aba que abre com o PDF
8. Salvar o PDF em /home/luiz/Documents/sigep/ com nome `primeironome.matricula.pdf`
   (ver regra na seção "4. Nome de arquivo")

## Lista de servidores (extraída de ListagemGeral.pdf, 136 registros, unidade CEP ETG)
Ver arquivo original para lista completa. Observações:
- Há linhas repetidas (mesma pessoa, mesma matrícula, atuações diferentes) - ex: SERVIDOR EXEMPLO A (2x), SERVIDOR EXEMPLO B (2x) - removidas no CSV
- Alguns nomes aparecem cortados na listagem (nomes compostos longos truncados na coluna), ex: "JOSE DAS NEVES PEREIRA DO", "ANA BEATRIZ MOREIRA DE", "MARIA DAS GRACAS LIMA DOS", "PAULA CRISTINA SANTOS DO ESPIRITO" - precisa verificar nome completo ao buscar (pode ser necessário buscar só por parte do nome)

## Observações técnicas confirmadas (piloto: FULANO DE TAL SOUZA)

### 1. Busca (cadastro.jsp)
- Campo único de busca: `<input>` com placeholder "Informe a matrícula, nome, sobrenome ou CPF."
  (não são dois campos nome/sobrenome separados)
- Digitar o nome completo (ou parte dele) e clicar no botão "Buscar"
- Resultado aparece como lista de links abaixo do campo, formato:
  `<matrícula> <NOME DO SERVIDOR> (UNIDADE)`
  ex: `0123.456-7 FULANO DE TAL SOUZA (GUARA CEP ETG/Fone:)`
- O link tem href javascript: `javascript:AbreDados(<idServidor>,'<codigoUnidade>');`
  ex: `AbreDados(162957,'990210000029')`
  -> **idServidor** (162957) e **codigoUnidade** (990210000029) são os parâmetros-chave
     necessários para gerar a ficha depois. Não precisam ser extraídos manualmente da URL:
     dá pra clicar no link normalmente.
- Se houver homônimos, múltiplos links aparecem na lista - precisa desambiguar pela matrícula.
  A matrícula exibida no resultado tem o mesmo formato da coluna "Matrícula" do ListagemGeral.pdf
  (ex: "0123.456-7" nos dois). O script compara ambas normalizadas (só dígitos: "01234567")
  para não depender da pontuação.

### 2. Abrir ficha e imprimir
- Ao clicar no resultado, a própria página cadastro.jsp é atualizada (SPA-like, sem navegação)
  mostrando as abas "Dados Pessoais / Complementares / Habilitação-Qualificação / Dados Funcionais"
  e o botão "Imprimir Ficha Cadastral" aparece.
- Clicar em "Imprimir Ficha Cadastral" dispara um POST para `/FichaFuncional` com body
  `application/x-www-form-urlencoded`:
  `idServidorFichaFunc=<idServidor>&codigoUnidade=<codigoUnidade>`
  e abre uma NOVA ABA com essa resposta.
- A resposta é o PDF puro (`Content-Type: application/pdf`), servido com `Content-Disposition`
  não forçando download - o Chrome intercepta e renderiza no visualizador nativo de PDF da
  extensão, então a nova aba NÃO expõe o PDF bruto de forma trivial via "salvar como".

### 3. Como extrair o PDF de fato (IMPORTANTE - armadilha encontrada)
- ❌ Não dá para pegar o body via `browser_network_request` no request de navegação (index da
  requisição original) - o DevTools Network.getResponseBody retorna o HTML wrapper do visualizador
  interno do Chrome (`pdf_embedder.css` / `<embed type="application/x-google-chrome-pdf">`),
  não os bytes reais do PDF.
- ❌ Um novo GET simples para a mesma URL (`fetch(location.href)`) NÃO reproduz o conteúdo -
  o endpoint exige POST com os parâmetros de sessão/form, então um GET solto devolve um PDF
  vazio/em branco.
- ✅ **Método que funcionou**: refazer a MESMA requisição (POST com o mesmo body) via
  `page.evaluate` (fetch dentro do contexto da página, reaproveitando cookies de sessão
  automaticamente), convertendo a resposta em Data URL base64 via `FileReader.readAsDataURL`,
  e usando o parâmetro `filename` da ferramenta `browser_evaluate` do Playwright MCP para salvar
  o resultado em um arquivo de texto no disco (evita colar strings base64 enormes manualmente,
  que causa erros de transcrição).
  Depois, um script Python decodifica o prefixo `data:application/pdf;base64,` e grava os bytes
  finais em `.pdf`.
- Trecho de JS usado (via `browser_evaluate`, function param):
  ```js
  async () => {
    const resp = await fetch('https://sigep.se.df.gov.br/FichaFuncional', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'idServidorFichaFunc=<ID>&codigoUnidade=<UNIDADE>'
    });
    const blob = await resp.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }
  ```
  com `filename: ".tmp_ficha_base64.txt"` (nota: o arquivo é salvo relativo à raiz do projeto,
  não dentro de `.playwright-mcp/`).
- NÃO tentar extrair cookies de sessão manualmente (`page.context().cookies()`) via
  `browser_run_code_unsafe` fora do contexto de página - bloqueado pelo classificador de
  permissões do Claude Code (ação sensível: materialização de credenciais). Fazer o fetch
  sempre dentro do `page.evaluate`/`browser_evaluate`, que herda a sessão automaticamente sem
  expor os valores dos cookies.

### 4. Nome de arquivo
- Regra definida: `<primeironome>.<matricula>.pdf`
  - primeiro nome: sem acentos (ç -> c), só letras, minúsculo
  - matrícula: só dígitos (pontos/traço removidos)
  - ex: "FULANO DE TAL SOUZA" / "0123.456-7" -> `fulano.01234567.pdf`
- Como a matrícula é única, isso resolve de uma vez nomes truncados na listagem e servidores
  com mais de uma matrícula (cada uma gera seu próprio arquivo).
- (Regra antiga do piloto era `nomecompleto.fichacadastral.pdf`; o arquivo do piloto foi
  renomeado para o novo padrão.)

### 5. Robustez do script (ajustes após revisão)
- Após "Buscar": pausa de 1 s e espera (até 15 s) aparecer o link com a **matrícula esperada** -
  não basta qualquer link `AbreDados`: na 1ª execução real o script achava links antigos da
  página logo após a busca e marcava todos como "não encontrado".
- Após clicar no resultado: espera (até 15 s) o botão "Imprimir Ficha Cadastral" + pausa de 1 s
  antes do POST. Se a ficha não carregar, o servidor vira erro (não gera PDF errado).
- Constantes ajustáveis no topo do script: `BUSCA_TIMEOUT_MS`, `FICHA_TIMEOUT_MS`, `DELAY_MS`.
- `python3 extrair_fichas.py N` processa só os N próximos pendentes (teste).
- Se `cadastro.jsp` não mostrar o campo de busca (sessão expirada -> login), pausa e pede
  novo login no terminal.
- Valida HTTP ok e que os bytes começam com `%PDF` antes de salvar.
- Grava em `.pdf.tmp` e renomeia (sem PDFs truncados em caso de interrupção).
- Ctrl+C ainda imprime o resumo (gerados / pulados / falhas).

## Decisões confirmadas com o usuário
- Nomes truncados na listagem (ex: "JOSE DAS NEVES PEREIRA DO"): buscar por esse texto
  parcial mesmo assim (o campo de busca do SIGEP aceita nome parcial) - a matrícula é usada
  para confirmar/desambiguar o resultado certo.
- Duplicatas na listagem (mesmo nome, mesma matrícula = linha repetida): gerar 1 ficha por pessoa
  (dedup automático por matrícula+nome já feito no `servidores.csv`).
- Homônimos / múltiplos resultados na busca: desambiguar comparando a matrícula do
  `ListagemGeral.pdf` com a matrícula mostrada em cada resultado da busca.
- Nome de arquivo: `primeironome.matricula.pdf`.
- BELTRANA DE TAL DA SILVA: confirmado que possui 2 cadastros (0111.111-1 e 0222.222-2);
  extrair as duas fichas (`beltrana.01111111.pdf` e `beltrana.02222222.pdf`).
- Execução: usuário optou por receber um **script Python standalone** (fora do Claude) para rodar
  por conta própria depois, em vez de eu rodar as 136 extrações uma a uma nesta sessão.

## Caso especial (resolvido)
- BELTRANA DE TAL DA SILVA aparece 2x na listagem com matrículas DIFERENTES
  (0111.111-1 - VICE-DIRETOR e 0222.222-2). Confirmado pelo usuário: é a mesma servidora com
  2 cadastros. Com o padrão `primeironome.matricula.pdf` cada matrícula gera seu próprio arquivo,
  sem colisão.

## Artefatos entregues
- `ListagemGeral.pdf` - listagem original fornecida pelo usuário (136 linhas, unidade CEP ETG)
- `servidores.csv` - matrícula+nome extraídos e deduplicados (134 linhas), usado como input do script
- `extrair_fichas.py` - script Python standalone (Playwright, sync API) que automatiza os passos
  2-8 do fluxo acima para todos os servidores do CSV. Uso documentado no cabeçalho do próprio
  arquivo (`pip install playwright && playwright install chromium && python3 extrair_fichas.py`).
  Usa perfil persistente do Chromium (`.browser_profile/`) para reaproveitar login entre execuções.
- `fulano.01234567.pdf` - ficha do piloto, já validada (renomeada para o novo padrão).

## Status
- [x] Login manual realizado
- [x] Testar fluxo completo com 1 servidor (piloto) - FULANO DE TAL SOUZA OK
- [x] Confirmar seletores e comportamento do popup de impressão
- [x] Definir regra de normalização do nome do arquivo
- [x] Escrever script de automação (`extrair_fichas.py`, loop sobre os 134 nomes do CSV)
- [x] Resolver caso BELTRANA DE TAL DA SILVA (2 cadastros -> 2 fichas)
- [x] Revisão do script: esperas explícitas, detecção de sessão expirada, validação do PDF,
      gravação atômica, resumo no Ctrl+C, novo padrão de nome de arquivo
- [x] Execução completa (23/09/2026): 134/134 fichas geradas, 0 falhas. Conferido nome +
      matrícula dentro de cada PDF contra o `servidores.csv` - sem divergências.
- Obs: a sessão do SIGEP NÃO persiste entre execuções (cookie de sessão some ao fechar o
  Chromium) - cada execução pede login. O script espera o ENTER sem recarregar a página.
- [x] Parser de fichas (26/09/2026): aba Componentes_Curriculares corrigida. A área tem 2
      sub-colunas: x 210-370 = um item por linha (nome de unidade `CENTRO DE ...` quebra em 2
      linhas e é unido); x >= 370 = lista por vírgula que quebra entre linhas (unida antes de
      dividir). Itens repetidos por matrícula são removidos. Saída: 175 componentes, 0 fragmentos.

## Listagem do Cadastro Geral (verificar_novos.py)
- Menu 07.Relatórios > Listagem do Cadastro Geral = `rltListaGeral.jsp`, form `frmRlt`
  POST `EmitirRelatorioGeral` target=_blank. Campos: `tipo=1` (Todas),
  `selCodigoRegional=005` (CRE Guará), `codigoUnidade=990210000029` (CEP ETG).
- Não precisa clicar na tela: `fetch` POST na sessão logada devolve `application/pdf`
  direto (mesma técnica do /FichaFuncional). Confirmado: todas as linhas "GUARA / CEP ETG".
- Layout atual (09/2026): matrícula sem pontuação ("02430444"); script aceita os dois formatos
  e grava no CSV pontuado. Nome longo encosta no cargo com 1 espaço ("... CONTEMP") -> removido.
