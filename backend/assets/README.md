# Molde cadastral SIGEP

A consulta usa `REPEATABLE READ` e `WITH CONSISTENT SNAPSHOT`, somente com SELECTs. Não definir `readonly=True` no Connector/Python: MariaDB pode anunciar prefixo `5.5.5`, fazendo o conector rejeitar esse parâmetro antes de enviar SQL. Regressão exercita a validação real do conector com esse handshake.

`sigep-ficha.pdf` contém somente grades vetoriais, rótulos estáticos, Helvetica e brasão extraído do modelo SIGEP. Nenhum nome, matrícula, documento, endereço, observação pessoal ou curso é copiado. O gerador lê este asset; não precisa de PDFs importados em produção. O Dockerfile já copia a pasta junto com o backend.

Recriação, a partir da raiz do projeto:

```bash
venv/bin/python backend/assets/build_sigep_template.py sigep/roger.00369004.pdf
```

O script copia desenhos e textos de uma lista permitida, criando duas variantes: com e sem cabeçalho de cursos. Datas e numeração são geradas em tempo de emissão. As linhas dos cursos também são desenhadas pelo gerador; o cabeçalho dos cursos só aparece quando há registros.

Campos seguem coordenadas em pontos de `backend/ficha_cadastral.py`. Textos usam tamanho original, reduzem até 5 pt e recebem reticências quando excedem espaço. Coleções continuam em páginas adicionais; campos vazios não recebem valores inventados. A importação atual não guarda coluna de origem dos componentes nem CH por página: componentes são listados na coluna direita, sem reconstruir agrupamentos perdidos. Páginas extras repetem identificação e consomem somente registros restantes.

Testes, a partir da raiz:

```bash
venv/bin/python -m unittest discover -s backend -p 'test_*.py'
./node_modules/.bin/tsx --test src/services/fichaCadastral.test.ts
```

Regressão de navegador com API sintética, sem gravações no banco:

```bash
VITE_APP_USERNAME=pdf-test VITE_APP_PASSWORD=pdf-test npm run dev -- --host 127.0.0.1 --port 5173
python3 scripts/test_ficha_cadastral_ui.py http://127.0.0.1:5173
```

Exige Playwright/Chromium instalado. Comparação com o PDF original é opcional nos testes backend: arquivos baixados em `sigep/` não fazem parte dos assets de produção.
