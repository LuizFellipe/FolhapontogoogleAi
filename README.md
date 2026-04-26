# 📄 Gerador de Folha de Ponto - Secretaria de Educação

![Banner](https://picsum.photos/seed/timesheet-banner/1200/400)

Um sistema moderno e intuitivo desenvolvido para facilitar a geração e o gerenciamento de folhas de frequência para servidores da Secretaria de Estado de Educação. O projeto permite o preenchimento rápido de dados, lançamentos automáticos de ocorrências (férias, abonos, licenças) e gera um documento de **duas páginas** pronto para impressão seguindo o padrão oficial.

---

## ✨ Funcionalidades

- **📋 CRUD Completo de Servidores**: Criação, edição, visualização e exclusão de profissionais.
- **🆕 Matrícula Opcional**: Permite cadastrar servidores sem matrícula (contratados temporários, prestadores de serviço).
- **🗑️ Exclusão de Profissionais**: Remove servidores e suas folhas de ponto associadas com confirmação.
- **🧭 Navegação entre Profissionais**: Botões Anterior/Próximo e select dropdown para navegação rápida.
- **📅 Calendário Inteligente**: Geração automática de dias com base no mês e ano selecionados.
- **⚡ Pré Preenchimento Inteligente**: Detecta automaticamente padrões de CPIP e CURSO FORMAÇÃO CONTINUADA de folhas anteriores e replica no novo mês.
- **🧹 Limpar Lançamentos**: Botão para resetar todos os dias do mês para **TRABALHO NORMAL** com um clique.
- **🛠️ Sistema Simplificado de Lançamentos**:
  - Apenas **Dia + Tipo de Lançamento** (sem campos de horário)
  - Trabalho Normal (padrão automático)
  - Férias, Recesso, Atestado Médico, Licença Médica, Falta, TRE, Abono de Ponto, CPIP, Curso, Abono Aniversário, Feriado, Abono de Ponto Art. 151 Lei, Falta Paralisação, Atestado de Comparecimento.
  - **Suporte a Dois Turnos**: Controle independente por turno (matutino/vespertino)
  - **Controle por Carga horária**: Segundo turno habilitado automaticamente para 40h
- **📄 Página 2 (Resumo da Frequência)**: 
  - Tabela de resumo com preenchimento de códigos de operação (Inclusão, Alteração, Exclusão).
  - **Renderização Técnica**: Números exibidos em formato "U" (`|_|`), fiel ao formulário oficial.
  - **Tabela de Códigos Integrada**: Referência rápida para gratificações e ocorrências.
- **🖨️ Impressão A4 Completo**: Layout otimizado para preencher integralmente o papel A4 ao imprimir ou salvar em PDF (Páginas 1 e 2 sem espaços em branco).
- **📱 Responsividade**: Interface adaptável para uso em desktops, tablets e dispositivos móveis.

---

## 📸 Screenshots

### 1. Editor de Lançamentos e Resumo
![Editor](https://picsum.photos/seed/timesheet-editor/800/450)
*Interface limpa para preenchimento de dados, horários e códigos de resumo.*

### 2. Visualização para Impressão (Página 1 e 2)
![Preview](https://picsum.photos/seed/timesheet-preview/800/450)
*Visualização fiel ao documento oficial com as duas páginas prontas para impressão.*

---

## 🚀 Como Usar

1. **Configuração Inicial**:
   - No topo da página, selecione o **Mês** e o **Ano** de referência.
   - Preencha os campos em **Dados do Servidor**, incluindo a seleção dos **Turnos**.

2. **Preenchimento da Grade (Página 1)**:
   - Para cada dia, selecione o **Tipo de Lançamento** correspondente.
   - O sistema oferece opções pré-definidas (Trabalho Normal, Férias, Atestado, etc.).
   - Use os botões **Pré Preenchimento** (para replicar padrões CPIP/CURSO) ou **Limpar** (para resetar).

3. **Resumo da Frequência (Página 2)**:
   - Preencha a tabela de resumo com os códigos de operação e ocorrência necessários para o fechamento do mês.

4. **Geração e Impressão**:
   - Clique no botão **Visualizar** para conferir o layout das duas páginas.
   - Use o ícone de **Impressora** no cabeçalho ou pressione `Ctrl + P` para imprimir ou salvar como PDF.

---

## 🛠️ Tecnologias Utilizadas

- **React 19**: Biblioteca principal para construção da interface.
- **TypeScript**: Tipagem estática para maior segurança e manutenibilidade.
- **Tailwind CSS**: Estilização moderna e utilitária.
- **Lucide React**: Conjunto de ícones consistentes.
- **Motion (Framer Motion)**: Animações suaves de transição entre telas.
- **Vite**: Ferramenta de build ultra-rápida com proxy configurável.

---

## ⚙️ Configuração de Ambiente

O sistema suporta automaticamente dois ambientes através da variável `VITE_ENVIRONMENT`:

### Ambiente Local (Desenvolvimento)
- **Uso**: Script `start_backend.sh` ou desenvolvimento manual
- **Configuração**: `VITE_ENVIRONMENT=local` (padrão)
- **Proxy**: Frontend → `localhost:5000` (backend local)
- **Portas**: Frontend: 3000, Backend: 5000

### Ambiente Docker (Produção/Container)
- **Uso**: `docker-compose up` ou builds Docker
- **Configuração**: `VITE_ENVIRONMENT=docker` (definido nos Dockerfiles)
- **Proxy**: Frontend → `backend:5000` (serviço Docker)
- **Portas**: Frontend: 3000, Backend: 5000

### Configuração Automática
O proxy Vite detecta automaticamente o ambiente e ajusta o target:
```typescript
// vite.config.ts
proxy: {
  '/api': {
    target: env.VITE_ENVIRONMENT === 'docker' 
      ? 'http://backend:5000' 
      : 'http://localhost:5000',
    changeOrigin: true,
  },
}
```

### Variáveis de Ambiente
Copie `.env.example` para `.env` e ajuste conforme necessário:
```bash
# Ambiente (local | docker)
VITE_ENVIRONMENT=local

# Banco de dados
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=SUA_SENHA_AQUI
DB_NAME=folhaponto_db
```

---

## 📁 Estrutura do Projeto

O sistema está organizado de forma modular, separando as responsabilidades de Banco de Dados, Backend (API) e Frontend (React).

```text
FolhapontogoogleAi/
├── 📄 .env               # Variáveis de ambiente (não versionado)
├── 📄 .env.example       # Exemplo de variáveis de ambiente
├── 📄 .gitignore         # Arquivos ignorados pelo Git
├── � add_entry_type.py  # Script para adicionar novos tipos de lançamento
├── 📄 backup.sql         # Backup do banco de dados
├── 📄 docker-compose.prod.yml  # Docker Compose para produção
├── 📄 docker-compose.yml        # Docker Compose para desenvolvimento
├── 📄 Dockerfile          # Imagem Docker para frontend
├── 📄 dump.sql           # Exportação do banco de dados
├── 📄 index.html         # Ponto de entrada HTML
├── 📄 metadata.json      # Metadados do projeto
├── 📄 MODIFICATION_MEMORY.md   # Histórico de modificações
├── 📄 nginx.conf         # Configuração do Nginx
├── 📄 package-lock.json  # Lock de dependências Node.js
├── 📄 package.json       # Dependências e scripts do frontend
├── 📄 README.md          # Documentação principal
├── 📄 README_SETUP.md    # Guia de configuração
├── 📄 requirements.txt   # Dependências Python do backend
├── 📄 start_backend.sh   # Script de inicialização unificado
├── 📄 tree.txt           # Estrutura de arquivos do projeto
├── 📄 tsconfig.json      # Configuração TypeScript
├── 📄 update_tree.py     # Script para atualizar tree.txt
├── 📄 vite.config.ts     # Configuração do Vite
├── 📂 backend/           # API Flask em Python
│   ├── 📄 app.py         # Servidor principal da API
│   ├── 📄 Dockerfile     # Imagem Docker do backend
│   └── 📄 README.md      # Documentação do backend
├── 📂 database/          # Persistência de Dados (MySQL)
│   ├── 📂 migrations/   # Scripts SQL de migração
│   ├── 📄 full_setup.sql # Setup completo com dados exemplo
│   ├── 📄 Dockerfile     # Imagem Docker do MySQL
│   └── 📄 README.md      # Documentação do banco
└── 📂 src/               # Código Fonte Frontend (React + TypeScript)
    ├── 📂 components/   # Componentes React
    │   ├── 📄 EmployeeForm.tsx      # Formulário de servidor
    │   ├── 📄 EmployeeNavigator.tsx # Navegação entre profissionais
    │   ├── 📄 MODIFICATION_MEMORY.md # Histórico de alterações dos componentes
    │   ├── 📄 README.md             # Documentação dos componentes
    │   ├── 📄 SummaryForm.tsx       # Formulário de resumo
    │   ├── 📄 TimesheetGrid.tsx     # Grade de lançamentos
    │   ├── 📄 TimesheetPreview.tsx  # Preview página 1
    │   ├── 📄 TimesheetSummaryPreview.tsx # Preview página 2
    │   └── 📄 tree.txt              # Estrutura de arquivos dos componentes
    ├── � services/     # Comunicação com API
    │   ├── 📄 api.ts     # Funções de API (axios)
    │   └── 📄 README.md  # Documentação dos serviços
    ├── 📄 App.tsx        # Componente principal
    ├── 📄 index.css      # Estilos globais
    ├── 📄 main.tsx       # Ponto de entrada React
    ├── 📄 types.ts       # Tipos TypeScript
    └── 📄 README.md      # Documentação do frontend
```

---

## 📦 Desenvolvimento Local

### 1. Usando Docker Compose (Recomendado)

A maneira mais rápida de subir todo o ambiente (Banco de Dados, Backend e Frontend):

```bash
# Iniciar todos os serviços
docker-compose up -d

# Ver os logs
docker-compose logs -f
```

O sistema estará disponível em:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Monitoramento**: `docker-compose ps`

### 2. Instalação Manual

Se desejar rodar o projeto componente por componente:

```bash
# Clone o repositório
git clone [url-do-repositorio]

# Instale as dependências do frontend
npm install

# Inicie o servidor de desenvolvimento do frontend
npm run dev

# Para o backend, consulte README_SETUP.md
```

---

## 📄 Licença

Este projeto está sob a licença Apache-2.0.

---

*Desenvolvido com ❤️ para facilitar a vida do servidor público.*
