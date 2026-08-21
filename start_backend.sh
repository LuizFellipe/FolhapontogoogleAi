#!/bin/bash

# Script para iniciar o backend e frontend da Folha de Ponto
# Ativa o ambiente virtual, inicia o servidor Flask e o frontend Vite

echo "Iniciando sistema Folha de Ponto..."

# Carregar nvm se disponível
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# ──────────────────────────────────────────────────────────────
# Verificação de pré-requisitos
# ──────────────────────────────────────────────────────────────
MIN_NODE_MAJOR=20

echo "Verificando pré-requisitos do sistema..."

# Python 3
if ! command -v python3 >/dev/null 2>&1; then
    echo "❌ Python3 não encontrado! Instale o Python 3.11+ antes de continuar."
    exit 1
fi

# Docker
if ! command -v docker >/dev/null 2>&1; then
    echo "⚠️ Docker não encontrado. O banco de dados precisará ser gerenciado manualmente."
fi

# Node.js — verificar existência e versão mínima
NEED_NODE_INSTALL=false
if command -v node >/dev/null 2>&1; then
    NODE_CURRENT=$(node --version 2>/dev/null | sed 's/^v//')
    NODE_MAJOR=$(echo "$NODE_CURRENT" | cut -d. -f1)
    if [ "$NODE_MAJOR" -lt "$MIN_NODE_MAJOR" ] 2>/dev/null; then
        echo "⚠️ Node.js v${NODE_CURRENT} detectado, mas o sistema requer v${MIN_NODE_MAJOR}+."
        NEED_NODE_INSTALL=true
    else
        echo "✅ Node.js v${NODE_CURRENT}"
    fi
else
    echo "⚠️ Node.js não encontrado."
    NEED_NODE_INSTALL=true
fi

# Auto-instalar Node via nvm se necessário
if [ "$NEED_NODE_INSTALL" = true ]; then
    echo "Instalando Node.js v${MIN_NODE_MAJOR} via nvm..."

    # Instalar nvm se não existe
    if [ ! -s "$NVM_DIR/nvm.sh" ]; then
        echo "Instalando nvm..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash 2>&1
        [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    fi

    if [ -s "$NVM_DIR/nvm.sh" ]; then
        nvm install "$MIN_NODE_MAJOR" && nvm use "$MIN_NODE_MAJOR" && nvm alias default "$MIN_NODE_MAJOR"
        if [ $? -eq 0 ]; then
            echo "✅ Node.js $(node --version) instalado via nvm!"
            # Forçar reinstalação dos node_modules com o novo Node
            if [ -d "node_modules" ]; then
                echo "Reinstalando node_modules com Node $(node --version)..."
                rm -rf node_modules package-lock.json
            fi
        else
            echo "❌ Falha ao instalar Node.js v${MIN_NODE_MAJOR} via nvm!"
            exit 1
        fi
    else
        echo "❌ Falha ao instalar nvm. Instale Node.js v${MIN_NODE_MAJOR}+ manualmente."
        exit 1
    fi
fi

# npm
if ! command -v npm >/dev/null 2>&1; then
    echo "❌ npm não encontrado! Instale o Node.js v${MIN_NODE_MAJOR}+ com npm."
    exit 1
fi

echo "✅ Todos os pré-requisitos verificados!"

# Verificar se o ambiente virtual existe
if [ ! -d "venv" ]; then
    echo "Criando ambiente virtual..."
    python3 -m venv venv
fi

# Ativar ambiente virtual
echo "Ativando ambiente virtual..."
source venv/bin/activate

# Verificar e iniciar container MySQL se necessário
echo "Verificando banco de dados MySQL..."
CONTAINER_NAME="meu-mysql"

if command -v docker >/dev/null 2>&1; then
    if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
        if [ ! "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
            echo "Contêiner $CONTAINER_NAME encontrado mas parado. Iniciando..."
            docker start $CONTAINER_NAME
        else
            echo "Contêiner $CONTAINER_NAME já está em execução."
        fi
    else
        echo "Contêiner '$CONTAINER_NAME' não encontrado. Criando via docker compose..."
        docker compose up -d db
        if [ $? -ne 0 ]; then
            echo "❌ Falha ao criar contêiner $CONTAINER_NAME!"
            exit 1
        fi
        echo "✅ Contêiner $CONTAINER_NAME criado com sucesso."
    fi

    # Aguardar o container ficar pronto antes de prosseguir
    echo "Aguardando banco de dados ficar pronto..."
    WAIT_SECONDS=0
    MAX_WAIT=120
    DB_READY=false

    # Verificar se o container possui healthcheck configurado
    HAS_HEALTHCHECK=$(docker inspect --format='{{if .State.Health}}yes{{else}}no{{end}}' $CONTAINER_NAME 2>/dev/null)

    while [ $WAIT_SECONDS -lt $MAX_WAIT ]; do
        if [ "$HAS_HEALTHCHECK" = "yes" ]; then
            # Container com healthcheck — usar status nativo
            HEALTH=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME 2>/dev/null)
            if [ "$HEALTH" = "healthy" ]; then
                DB_READY=true
                break
            fi
        else
            # Container sem healthcheck — testar conectividade diretamente
            if docker exec $CONTAINER_NAME mysqladmin ping -u root -p"${DB_PASSWORD:-123456}" --silent 2>/dev/null; then
                DB_READY=true
                break
            fi
        fi
        sleep 3
        WAIT_SECONDS=$((WAIT_SECONDS + 3))
    done

    if [ "$DB_READY" = true ]; then
        echo "✅ Banco de dados pronto!"
    else
        echo "❌ Timeout aguardando banco de dados ficar pronto (${MAX_WAIT}s)."
        exit 1
    fi
else
    echo "⚠️ Aviso: Docker não encontrado. Certifique-se de que o MySQL está rodando manualmente."
fi

# Verificar se as dependências do backend estão instaladas
if ! python3 -c "import flask, mysql.connector" 2>/dev/null; then
    echo "Instalando dependências do backend..."
    pip install mysql-connector-python python-dotenv flask flask-cors
fi

# Verificar se as dependências do frontend estão instaladas
if [ ! -d "node_modules" ]; then
    echo "Instalando dependências do frontend..."
    npm install
fi

# Função para limpar processos ao sair
cleanup() {
    echo "Encerrando processos..."
    jobs -p | xargs -r kill
    exit 0
}

# Configurar trap para capturar Ctrl+C
trap cleanup SIGINT SIGTERM

# Matar processo anterior na porta 5000 se existir
if lsof -ti :5000 >/dev/null 2>&1; then
    echo "Porta 5000 em uso. Encerrando processo anterior..."
    lsof -ti :5000 | xargs kill -9
    sleep 1
fi

# Iniciar o backend em background
echo "Iniciando servidor Flask na porta 5000..."
cd backend
FLASK_APP=app.py flask run --host=0.0.0.0 --port=5000 > /dev/null 2>&1 &
BACKEND_PID=$!

# Voltar para o diretório raiz
cd ..

# Aguardar um momento para o backend iniciar
echo "Aguardando backend iniciar..."
sleep 3

# Matar processos anteriores nas portas 3000-3010 se existirem
for PORT in $(seq 3000 3010); do
    if lsof -ti :$PORT >/dev/null 2>&1; then
        echo "Porta $PORT em uso. Encerrando processo anterior..."
        lsof -ti :$PORT | xargs kill -9
    fi
done
sleep 1

# Iniciar o frontend em background
echo "Iniciando frontend Vite na porta 3000..."
npm run dev > /dev/null 2>&1 &
FRONTEND_PID=$!

echo ""
echo "✅ Sistema iniciado com sucesso!"
echo "📍 Backend: http://localhost:5000"
echo "📍 Frontend: http://localhost:3000"
echo ""
echo "Pressione Ctrl+C para encerrar ambos os processos"
echo ""

# Manter o script rodando
wait
