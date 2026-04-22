# 📄 Gerador de Folha de Ponto - Secretaria de Educação

![Banner](https://picsum.photos/seed/timesheet-banner/1200/400)

Um sistema moderno e intuitivo desenvolvido para facilitar a geração e o gerenciamento de folhas de frequência para servidores da Secretaria de Estado de Educação. O projeto permite o preenchimento rápido de dados, lançamentos automáticos de ocorrências (férias, abonos, licenças) e gera um documento de **duas páginas** pronto para impressão seguindo o padrão oficial.

---

## ✨ Funcionalidades

- **📋 CRUD Completo de Servidores**: Criação, edição, visualização e exclusão de profissionais.
- **🆕 Matrícula Opcional**: Permite cadastrar servidores sem matrícula (contratados temporários, prestadores de serviço).
- **🗑️ Exclusão de Profissionais**: Remove servidores e suas folhas de ponto associadas com confirmação.
- **🌗 Seleção de Turnos**: Opções de Matutino, Vespertino e Noturno para cada período de trabalho.
- **📅 Calendário Inteligente**: Geração automática de dias com base no mês e ano selecionados.
- **🛠️ Lançamentos Diversos**:
  - Trabalho Normal (padrão automático)
  - Férias, Recesso, Atestado Médico, Licença Médica, Falta, TRE, Abono de Ponto, CPIP, Curso, Abono Aniversário, Feriado, Abono de Ponto Art. 151 Lei.
  - **Suporte a Dois Turnos**: Controle independente por turno (matutino/vespertino)
  - **Controle por Carga Horária**: Segundo turno habilitado automaticamente para 40h
- **📄 Página 2 (Resumo da Frequência)**: 
  - Tabela de resumo com preenchimento de códigos de operação (Inclusão, Alteração, Exclusão).
  - **Renderização Técnica**: Números exibidos em formato "U" (`|_|`), fiel ao formulário oficial.
  - **Tabela de Códigos Integrada**: Referência rápida para gratificações e ocorrências.
- **🖨️ Impressão A4 Completo**: Layout fiel ao modelo oficial da Secretaria de Educação, otimizado para preencher integralmente o papel A4 ao imprimir ou salvar em PDF (Páginas 1 e 2 sem espaços em branco).
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
   - Para dias trabalhados, insira os horários de entrada e saída.
   - Para ocorrências, selecione o tipo correspondente. Os campos de horário ficarão vazios automaticamente.

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
- **Vite**: Ferramenta de build ultra-rápida.

---

## 📁 Estrutura do Projeto

O sistema está organizado de forma modular, separando as responsabilidades de Banco de Dados, Backend (API) e Frontend (React).

```text
FolhapontogoogleAi/
├── 📂 backend/           # API Flask em Python (Rotas, Lógica de Negócio)
│   ├── app.py           # Servidor principal da API
│   └── README.md        # Documentação detalhada do backend
├── 📂 database/          # Persistência de Dados (MySQL)
│   ├── 📂 migrations/   # Scripts de criação de tabelas SQL
│   └── README.md        # Documentação detalhada dos dados
├── 📂 src/               # Código Fonte Frontend (React + TypeScript)
│   ├── 📂 components/   # UI: Formulários, Grades e Previews
│   ├── 📂 services/     # Camada de comunicação com a API (Axios/Fetch)
│   ├── App.tsx          # Orquestrador principal da aplicação
│   ├── types.ts         # Tipagem TypeScript global
│   └── README.md        # Documentação detalhada do frontend
├── 📄 add_entry_type.py # Script para adicionar novos tipos de lançamento
├── 📄 index.html        # Ponto de entrada do navegador (Vite)
├── 📄 package.json      # Dependências do Node.js e scripts do frontend
├── 📄 requirements.txt  # Dependências do Python (Backend)
├── 📄 start_backend.sh  # Script de inicialização (API + Auto-check Docker)
└── 📄 vite.config.ts    # Configurações do bundler Vite
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
