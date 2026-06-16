# 📸 Guia para Capturar Screenshots

## Como Gerar Screenshots Reais do Sistema

### Pré-requisitos
- Docker e Docker Compose instalados
- 1-2 minutos de tempo de boot dos containers

### Passos

#### 1. Inicie os Serviços
```bash
cd /home/luiz/Documents/FolhapontogoogleAi
docker-compose down -v  # Limpa dados anteriores (opcional)
docker-compose up -d
sleep 30  # Aguarde containers iniciarem
```

#### 2. Acesse o Sistema
Abra navegador em: **http://localhost:3000**

#### 3. Faça Login
- **Usuário**: `admin`
- **Senha**: `senha123`

#### 4. Capturas Recomendadas

##### Screenshot 1: Tela de Login
- Descrição: Tela escura com formulário verde cyberpunk
- Arquivo sugerido: `docs/screenshots/01-login-screen.png`
- Tamanho: 1200×600px (crop as proporções do card)

##### Screenshot 2: Tela Principal (Editor de Lançamentos)
- Acesso: Após login (profissional pré-populado ou crie um novo)
- Descrição: Grade de 31 dias com dois turnos, dropdown de servidores
- Arquivo sugerido: `docs/screenshots/02-timesheet-editor.png`
- Tamanho: 1200×800px

##### Screenshot 3: Modal de Feriados
- Acesso: Clique no botão 🗓️ **Feriados** no navegador
- Descrição: Modal com lista de feriados e formulário
- Arquivo sugerido: `docs/screenshots/03-holiday-modal.png`
- Tamanho: 800×600px

##### Screenshot 4: Modal de Geração em Lote
- Acesso: Clique em **Gerar Lote** (se houver múltiplos servidores)
- Descrição: Seleção de profissionais, filtro, progresso
- Arquivo sugerido: `docs/screenshots/04-batch-modal.png`
- Tamanho: 1000×700px

##### Screenshot 5: Página 1 (Preview de Impressão)
- Acesso: Clique em **Visualizar** ou abra o modal de preview
- Descrição: Folha A4 com grid de 31 dias, formatação oficial
- Arquivo sugerido: `docs/screenshots/05-page1-preview.png`
- Tamanho: 850×1100px (proporção A4)

##### Screenshot 6: Página 2 (Resumo da Frequência)
- Acesso: Scroll no preview ou visualize página 2
- Descrição: Tabela de resumo com operações e códigos
- Arquivo sugerido: `docs/screenshots/06-page2-summary.png`
- Tamanho: 850×1100px

### Ferramentas Recomendadas

#### Windows/Mac
- **Built-in**: Captura de Tela (Snipping Tool / Cmd+Shift+4)
- **Alternativa**: ShareX ou Greenshot

#### Linux
- **Built-in**: `gnome-screenshot` ou `scrot`
- **Com interface**: Flameshot
```bash
# Captura interativa
flameshot gui
```

#### Navegador
```javascript
// Console do Firefox/Chrome (F12 → Console)
// Captura de tela de alta qualidade
document.documentElement.scrollIntoView();
// Ctrl+Shift+S (Firefox) ou Ctrl+Shift+P → "Capture full page"
```

### Pós-processamento

#### Redimensionar (bash)
```bash
# Redimensionar para 1200px de largura mantendo proporção
convert input.png -resize 1200x output.png
```

#### Adicionar Border
```bash
convert input.png -border 10x10 -bordercolor white output.png
```

#### Comprimir para Web
```bash
# PNG → WebP (melhor compressão)
cwebp -q 85 input.png -o output.webp
```

### Estrutura de Diretórios

```
docs/
└── screenshots/
    ├── 01-login-screen.png          (ou .webp)
    ├── 02-timesheet-editor.png
    ├── 03-holiday-modal.png
    ├── 04-batch-modal.png
    ├── 05-page1-preview.png
    └── 06-page2-summary.png
```

### Atualizar README.md

Após capturar, substitua placeholders:

```markdown
## 📸 Interface em Ação

### Tela de Login
![Autenticação](docs/screenshots/01-login-screen.png)
*Interface escura com tema cyberpunk — credenciais via .env*

### Editor de Lançamentos
![Editor](docs/screenshots/02-timesheet-editor.png)
*Grade de 31 dias com dois turnos, navegação entre profissionais*

### Página 1 — Formulário Oficial
![Página 1](docs/screenshots/05-page1-preview.png)
*Layout A4 fiel ao formulário da SEE*

### Página 2 — Resumo
![Página 2](docs/screenshots/06-page2-summary.png)
*Tabela de operações e códigos de frequência*
```

---

## Automação (Opcional)

Script para capturar screenshots automaticamente via Selenium:

```python
# install: pip install selenium pillow
# Requer geckodriver (Firefox) ou chromedriver

from selenium import webdriver
from PIL import Image
import time

driver = webdriver.Firefox()
driver.get("http://localhost:3000")

# Login
driver.find_element("name", "username").send_keys("admin")
driver.find_element("name", "password").send_keys("senha123")
driver.find_element("xpath", "//button[text()='Entrar']").click()
time.sleep(2)

# Captura
driver.save_screenshot("01-login.png")
```

---

**Nota**: Após capturar e commitar screenshots, atualize `MODIFICATION_MEMORY.md` registrando a mudança.
