#!/bin/bash

# Script para iniciar o backend e frontend da Folha de Ponto
# Ativa o ambiente virtual, inicia o servidor Flask e o frontend Vite

echo "Iniciando sistema Folha de Ponto..."

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
        echo "⚠️ Aviso: Contêiner '$CONTAINER_NAME' não encontrado no Docker."
        echo "Certifique-se de que o container foi criado com o nome correto."
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
FLASK_APP=app.py flask run --host=0.0.0.0 --port=5000 &
BACKEND_PID=$!

# Voltar para o diretório raiz
cd ..

# Aguardar um momento para o backend iniciar
echo "Aguardando backend iniciar..."
sleep 3

# Iniciar o frontend em background
echo "Iniciando frontend Vite na porta 3000..."
npm run dev &
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
