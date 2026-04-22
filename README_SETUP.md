# 🚀 Guia de Instalação - Folha de Ponto com MySQL

Este documento descreve como configurar e executar o sistema de Folha de Ponto com persistência MySQL.

## 📋 Pré-requisitos

- **Node.js** (versão 18 ou superior)
- **Python 3.8+**
- **MySQL Server** (versão 8.0 recomendada)
- **Git**

## 🐳 Configuração Rápida com Docker Compose (Recomendado)

Esta é a forma mais simples de configurar todo o ambiente.

```bash
# 1. Iniciar todos os serviços (Banco, Backend e Frontend)
docker-compose up -d

# 2. Verificar se tudo subiu corretamente
docker-compose ps
```

O Docker Compose irá configurar automaticamente:
- Banco de Dados MySQL na porta 3306.
- Backend Flask na porta 5000.
- Frontend React na porta 3000.
- **Importante:** O banco de dados será inicializado automaticamente com o esquema completo e dados de exemplo através do arquivo `database/full_setup.sql`.

---

## 🗄️ Configuração do Banco de Dados MySQL (Manual)

### 1. Usar Container Docker MySQL

Se você prefere gerenciar apenas o banco via Docker:

```bash
# Iniciar container MySQL na porta 3306
docker run --name meu-mysql \
  -e MYSQL_ROOT_PASSWORD=123456 \
  -e MYSQL_DATABASE=folhaponto_db \
  -p 3306:3306 \
  -d mysql:8.0
```

### 2. Executar Script de Configuração Completa

```bash
# Execute o script SQL para criar as tabelas e dados de exemplo
docker exec -i meu-mysql mysql -u root -p123456 folhaponto_db < database/full_setup.sql
```

### Alternativa: Instalação Local do MySQL

Se preferir instalar MySQL localmente em vez de usar Docker:

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install mysql-server
sudo mysql_secure_installation
```

**macOS (com Homebrew):**
```bash
brew install mysql
brew services start mysql
```

**Windows:**
- Baixe o instalador do site oficial: https://dev.mysql.com/downloads/mysql/

## ⚙️ Configuração do Ambiente

### 1. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo e configure suas credenciais:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas informações:

```env
# MySQL Database Configuration (para Docker)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=folhaponto_db

# Backend API Configuration
API_PORT=5000
API_HOST=0.0.0.0

# VITE_API_URL: deixe VAZIO para desenvolvimento local e acesso LAN.
# O frontend usará URL relativa (/api) e o proxy do Vite roteará para o Flask.
# Preencha apenas se o backend estiver em um host separado (ex.: servidor remoto).
VITE_API_URL=

# Integrações externas (opcionais)
GEMINI_API_KEY=
APP_URL=
```

**Importante:** `VITE_API_URL` deve permanecer **vazio** para que o sistema funcione tanto localmente quanto via rede LAN. Se preenchido com `http://localhost:5000/api`, os navegadores de outras máquinas tentarão conectar ao `localhost` delas mesmas, causando falha nas chamadas à API.

### 2. Instalar Dependências do Frontend

```bash
# Instalar dependências Node.js
npm install
```

### 3. Instalar Dependências do Backend

```bash
# O script de inicialização cuida disso automaticamente
chmod +x start_backend.sh
```

## 🚀 Inicialização do Sistema

### Método 1: Usar Script Automático (Recomendado)

```bash
# Iniciar backend
./start_backend.sh

# Em outro terminal, iniciar frontend
npm run dev
```

**Nota:** O script `start_backend.sh` foi atualizado para verificar automaticamente se o container Docker `meu-mysql` está em execução. Caso o container exista mas esteja parado, o script tentará iniciá-lo antes de subir a API.

### Método 2: Inicialização Manual

**Backend:**
```bash
# Ativar ambiente virtual
source venv/bin/activate

# Instalar dependências (se necessário)
pip install mysql-connector-python python-dotenv flask flask-cors

# Iniciar servidor
cd backend
python app.py
```

**Frontend:**
```bash
# Em outro terminal
npm run dev
```

## 🌐 Acessando o Sistema

### Acesso Local (mesma máquina)
- **Frontend (React):** http://localhost:3000
- **Backend API:** http://localhost:5000
- **Health Check:** http://localhost:5000/api/health

### Acesso via Rede Local (LAN)
Substitua `<IP-DO-SERVIDOR>` pelo IP da máquina onde o sistema está rodando (ex.: `192.168.1.100`):
- **Frontend:** http://\<IP-DO-SERVIDOR\>:3000
- **Backend API:** http://\<IP-DO-SERVIDOR\>:5000

Para descobrir o IP do servidor:
```bash
ip a | grep "inet " | grep -v 127.0.0.1
```

#### Liberando o Firewall (UFW)
Se o sistema não for acessível de outras máquinas, verifique e libere as portas no firewall:
```bash
sudo ufw allow 3000/tcp
sudo ufw allow 5000/tcp
sudo ufw status
```

## 📊 Estrutura do Banco de Dados

### Tabelas Criadas:

1. **profissionais** - Dados dos servidores
   - id, nome, matricula, cargo, ua, exercicio, carga_horaria, etc.

2. **folhas_ponto** - Folhas de ponto por mês/ano
   - id, profissional_id, mes, ano, observacoes

3. **lancamentos_diarios** - Lançamentos diários de cada folha
   - id, folha_ponto_id, dia, tipo, horários, observacao

4. **resumo_folha** - Resumo mensal da folha de ponto
   - id, folha_ponto_id, operacao, codigo, carga, etc.

## 🔧 Funcionalidades Implementadas

### ✅ Backend (Flask + MySQL)
- CRUD completo para profissionais
- CRUD completo para folhas de ponto
- Salvamento em lote de lançamentos diários
- Salvamento em lote de resumo
- API RESTful com endpoints em português
- Tratamento de erros e validações

### ✅ Frontend (React + TypeScript)
- Interface original mantida
- Integração com backend via API
- Salvamento automático de dados
- Carregamento de folhas existentes
- Indicadores de status de conexão

### ✅ Funcionalidades de Persistência
- Dados salvos permanentemente no MySQL
- Histórico de folhas de ponto
- Multiusuário (vários profissionais)
- Consultas eficientes com índices

## 🐛 Solução de Problemas

### Backend não inicia:
```bash
# Verificar se o ambiente virtual está ativado
which python

# Verificar dependências
pip list | grep -E "(flask|mysql|dotenv)"

# Verificar conexão com MySQL (Docker)
docker exec -it meu-mysql mysql -u root -p123456 -e "SHOW DATABASES;"

# Verificar tabelas criadas
docker exec -it meu-mysql mysql -u root -p123456 folhaponto_db -e "SHOW TABLES;"
```

### Frontend não conecta ao backend:
```bash
# Verificar se backend está rodando
curl http://localhost:5000/api/health

# Verificar configuração de CORS
# O backend já está configurado para aceitar requisições de qualquer origem
```

### Problemas com Docker MySQL:
```bash
# Verificar se container está rodando
docker ps | grep meu-mysql

# Verificar logs do container
docker logs meu-mysql

# Reiniciar container se necessário
docker restart meu-mysql

# Parar e remover container para recriar
docker stop meu-mysql
docker rm meu-mysql
```

### Erros de permissão MySQL:
```bash
# Conectar ao MySQL e verificar permissões
docker exec -it meu-mysql mysql -u root -p123456 -e "SHOW GRANTS FOR 'root'@'%';"

# Se necessário, recriar o container com permissões corretas
docker stop meu-mysql
docker rm meu-mysql
docker run --name meu-mysql \
  -e MYSQL_ROOT_PASSWORD=123456 \
  -e MYSQL_DATABASE=folhaponto_db \
  -p 3306:3306 \
  -d mysql:8.0
```

## 📝 Notas Importantes

1. **Segurança:** Em produção, use senhas mais fortes e considere SSL
2. **Backup:** Faça backup regular do banco de dados
3. **Performance:** As tabelas já possuem índices para consultas eficientes
4. **Escalabilidade:** A arquitetura suporta múltiplos usuários simultâneos

## 🔄 Fluxo de Trabalho Típico

1. O usuário preenche os dados do profissional
2. Seleciona o mês/ano da folha de ponto
3. Preenche os lançamentos diários
4. Preenche o resumo mensal
5. Clica em "Salvar" - dados são persistidos no MySQL
6. Pode visualizar/imprimir a folha gerada
7. Ao mudar mês/ano, dados existentes são carregados automaticamente

## 📞 Suporte

Caso encontre problemas, verifique:
- Logs do backend (terminal onde o Flask está rodando)
- Logs do frontend (console do navegador)
- Conectividade com o banco de dados
- Configuração das variáveis de ambiente
