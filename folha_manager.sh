#!/bin/bash

# ==============================================================================
# GESTOR FOLHA PONTO - Sistema Cyberpunk de Gerenciamento
# ==============================================================================
# Versão: 4.0 (Tema Cyberpunk)
# Descrição: Script cyberpunk com menu interativo para gerenciar o sistema
#              de Folha de Ponto em background, incluindo backend, tipos 
#              de lançamento, backup, documentação e gerenciamento de 
#              processos. Entre na Matrix!
# Autor: Sistema AI Cyberpunk
# Data: 2026-05-01
# ==============================================================================

# Cores para interface - Tema Cyberpunk
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;37m'
BRIGHT_GREEN='\033[1;32m'
BRIGHT_CYAN='\033[1;36m'
BRIGHT_WHITE='\033[1;97m'
NEON_GREEN='\033[38;5;46m'
NEON_CYAN='\033[38;5;51m'
NEON_BLUE='\033[38;5;45m'
ORANGE='\033[38;5;214m'
MAGENTA='\033[38;5;201m'
PINK='\033[38;5;213m'
NC='\033[0m' # No Color

# Função para limpar tela e mostrar cabeçalho
show_header() {
    clear
    echo -e "${NEON_CYAN}"
    cat << "EOF"
    ▓█████▄▄▄█████▓ ▄▄▄█████▓ ██▀███   ▄▄▄       ██▓     ██▓     
    ▓█   ▀ ▓  ██▒ ▓▒▓  ██▒ ▓▒▓██ ▒ ██▒▒████▄    ▓██▒    ▓██▒     
    ▒███   ▒ ▓██░ ▒░▒ ▓██░ ▒░▓██ ░▄█ ▒▒██  ▀█▄  ▒██░    ▒██░     
    ▒▓█  ▄ ░ ▓██▓ ░ ░ ▓██▓ ░ ▒██▀██  ░░██▄▄▄▄█ ▒██░    ▒██░     
    ░▒████▒  ▒██▒ ░  ▒██▒ ░ ░▓█ ▓█▀  ▓█   ▓██▒░██████▒░██████▒
    ░░ ▒░ ░  ▒ ░░    ▒ ░░   ░▒▓▒▓▒   ▒▒   ▓▒█░░ ▒░▓  ░░ ▒░▓  ░
     ░ ░  ░    ░       ░      ░▒ ░░    ▒   ▒▒ ░  ░ ░ ▒ ░  ░ ░ ▒ ░
       ░      ░ ░    ░ ░        ░░       ░   ▒     ░ ░  ░   ░ ░  ░
       ░  ░   ░           ░        ░           ░  ░    ░      ░      
EOF
    echo -e "${BRIGHT_CYAN}"
    cat << "EOF"
    ════════════════════════════════════════════════════════════════════
                    G E S T O R   F O L H A   P O N T O
    ════════════════════════════════════════════════════════════════════
EOF
    echo -e "${NEON_GREEN}"
    cat << "EOF"
    Welcome Netrunner, choose an option
EOF
    echo -e "${NC}"
    echo ""
}

# Função para mostrar menu principal
show_main_menu() {
    echo -e "${BRIGHT_CYAN}=================================================${NC}"
    echo -e "${BRIGHT_CYAN}=                     GESTOR FOLHA PONTO                     =${NC}"
    echo -e "${BRIGHT_CYAN}=                       MENU PRINCIPAL                       =${NC}"
    echo -e "${BRIGHT_CYAN}=================================================${NC}"
    echo -e "${BRIGHT_WHITE}  [ 1 ]  Iniciar Sistema (Background)${NC}"
    echo -e "${BRIGHT_WHITE}  [ 2 ]  Status do Sistema${NC}"
    echo -e "${BRIGHT_WHITE}  [ 3 ]  Parar Sistema${NC}"
    echo -e "${BRIGHT_WHITE}  [ 4 ]  Adicionar Tipo de Lançamento${NC}"
    echo -e "${BRIGHT_WHITE}  [ 5 ]  Fazer Backup do Banco de Dados${NC}"
    echo -e "${BRIGHT_WHITE}  [ 6 ]  Atualizar Árvore de Diretórios${NC}"
    echo -e "${BRIGHT_WHITE}  [ 7 ]  Informações do Sistema${NC}"
    echo -e "${BRIGHT_WHITE}  [ 8 ]  Limpar e Otimizar${NC}"
    echo -e "${BRIGHT_WHITE}  [ 9 ]  Sair do Sistema${NC}"
    echo -e "${BRIGHT_CYAN}=================================================${NC}"
    echo ""
}

# Função para pausar e esperar input
pause() {
    echo -e "\n${NEON_CYAN}[PRESS ENTER TO CONTINUE]${NC}"
    read -r
}

# Função para mostrar mensagem de sucesso
success() {
    echo -e "\n${NEON_GREEN}[SUCCESS] $1 [SUCCESS]${NC}"
}

# Função para mostrar mensagem de erro
error() {
    echo -e "\n${RED}[ERROR] $1 [ERROR]${NC}"
}

# Função para mostrar mensagem de aviso
warning() {
    echo -e "\n${YELLOW}[WARNING] $1 [WARNING]${NC}"
}

# Função para mostrar mensagem de informação
info() {
    echo -e "\n${NEON_BLUE}[INFO] $1 [INFO]${NC}"
}

# ==============================================================================
# FUNÇÃO 1: Iniciar Sistema (Background)
# ==============================================================================
start_backend() {
    show_header
    echo -e "${NEON_CYAN}▶ Initializing Folha Ponto System...${NC}"
    echo -e "${NEON_CYAN}═══════════════════════════════════════════════════════════════${NC}"
    
    # Verificar se o sistema já está rodando
    if check_system_running; then
        warning "System already running!"
        show_system_status
        pause
        return 0
    fi

    # Verificar se o ambiente virtual existe
    if [ ! -d "venv" ]; then
        info "Criando ambiente virtual Python..."
        python3 -m venv venv
        if [ $? -eq 0 ]; then
            success "Ambiente virtual criado com sucesso!"
        else
            error "Falha ao criar ambiente virtual!"
            pause
            return 1
        fi
    fi

    # Ativar ambiente virtual
    info "Ativando ambiente virtual..."
    source venv/bin/activate
    if [ $? -ne 0 ]; then
        error "Falha ao ativar ambiente virtual!"
        pause
        return 1
    fi

    # Verificar e iniciar container MySQL se necessário
    info "Verificando banco de dados MySQL..."
    CONTAINER_NAME="meu-mysql"

    if command -v docker >/dev/null 2>&1; then
        if [ "$(docker ps -aq -f name="$CONTAINER_NAME")" ]; then
            if [ ! "$(docker ps -q -f name="$CONTAINER_NAME")" ]; then
                warning "Contêiner $CONTAINER_NAME encontrado mas parado. Iniciando..."
                docker start "$CONTAINER_NAME"
                sleep 2
            else
                success "Contêiner $CONTAINER_NAME já está em execução."
            fi
        else
            warning "Contêiner '$CONTAINER_NAME' não encontrado no Docker."
            warning "Certifique-se de que o container foi criado com o nome correto."
        fi
    else
        warning "Docker não encontrado. Certifique-se de que o MySQL está rodando manualmente."
    fi

    # Verificar se as dependências do backend estão instaladas
    info "Verificando dependências do backend..."
    if ! python3 -c "import flask, mysql.connector" 2>/dev/null; then
        info "Instalando dependências do backend..."
        pip install mysql-connector-python python-dotenv flask flask-cors
        if [ $? -eq 0 ]; then
            success "Dependências do backend instaladas!"
        else
            error "Falha ao instalar dependências do backend!"
            pause
            return 1
        fi
    fi

    # Verificar se as dependências do frontend estão instaladas
    info "Verificando dependências do frontend..."
    if [ ! -d "node_modules" ]; then
        info "Instalando dependências do frontend..."
        npm install
        if [ $? -eq 0 ]; then
            success "Dependências do frontend instaladas!"
        else
            error "Falha ao instalar dependências do frontend!"
            pause
            return 1
        fi
    fi

    # Salvar PIDs para controle
    PID_FILE="$HOME/.folha_manager_pids"
    
    # Iniciar o backend em background
    info "Iniciando servidor Flask na porta 5000..."
    cd backend
    if lsof -ti :5000 >/dev/null 2>&1; then
        lsof -ti :5000 | xargs kill -9
        sleep 1
    fi
    FLASK_APP=app.py nohup flask run --host=0.0.0.0 --port=5000 > ../backend.log 2>&1 &
    BACKEND_PID=$!
    echo "BACKEND_PID=$BACKEND_PID" > "$PID_FILE"

    # Voltar para o diretório raiz
    cd ..

    # Aguardar um momento para o backend iniciar
    info "Aguardando backend iniciar..."
    sleep 3

    # Verificar se o backend iniciou corretamente
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        error "Falha ao iniciar o backend!"
        rm -f "$PID_FILE"
        pause
        return 1
    fi

    # Iniciar o frontend em background
    info "Iniciando frontend Vite na porta 3000..."
    nohup npm run dev > frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "FRONTEND_PID=$FRONTEND_PID" >> "$PID_FILE"

    # Aguardar um momento para o frontend iniciar
    sleep 3

    # Verificar se o frontend iniciou corretamente
    if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
        error "Falha ao iniciar o frontend!"
        kill "$BACKEND_PID" 2>/dev/null
        rm -f "$PID_FILE"
        pause
        return 1
    fi

    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    success "Sistema Mágico iniciado em background!"
    echo -e "${WHITE}📍 Backend: ${CYAN}http://localhost:5000${NC}"
    echo -e "${WHITE}📍 Frontend: ${CYAN}http://localhost:3000${NC}"
    echo -e "${WHITE}📋 Logs: backend.log e frontend.log${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${PINK}🌸 O sistema está rodando em background! 🌸${NC}"
    echo -e "${PINK}🌸 Você pode voltar ao menu para outras operações! 🌸${NC}"
    echo ""
    
    pause
}

# ==============================================================================
# FUNÇÕES AUXILIARES - GERENCIAMENTO DE PROCESSOS
# ==============================================================================

# Verificar se o sistema está rodando
check_system_running() {
    PID_FILE="$HOME/.folha_manager_pids"
    if [ ! -f "$PID_FILE" ]; then
        return 1
    fi
    
    source "$PID_FILE"
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null && [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Mostrar status do sistema
show_system_status() {
    PID_FILE="$HOME/.folha_manager_pids"
    
    if [ ! -f "$PID_FILE" ]; then
        echo -e "${RED}🐛 Sistema Mágico não está rodando${NC}"
        return 1
    fi
    
    source "$PID_FILE"
    
    echo -e "${WHITE}📋 Status dos Processos Mágicos:${NC}"
    echo ""
    
    # Verificar backend
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo -e "${GREEN}✓ Backend (PID: $BACKEND_PID) - Rodando${NC}"
        echo -e "${CYAN}  📍 URL: http://localhost:5000${NC}"
    else
        echo -e "${RED}✗ Backend - Parado${NC}"
    fi
    
    # Verificar frontend
    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        echo -e "${GREEN}✓ Frontend (PID: $FRONTEND_PID) - Rodando${NC}"
        echo -e "${CYAN}  📍 URL: http://localhost:3000${NC}"
    else
        echo -e "${RED}✗ Frontend - Parado${NC}"
    fi
    
    echo ""
    echo -e "${WHITE}📋 Arquivos de Log:${NC}"
    echo -e "${GRAY}  📄 backend.log - Log do servidor Flask${NC}"
    echo -e "${GRAY}  📄 frontend.log - Log do servidor Vite${NC}"
}

# Parar sistema
stop_system() {
    PID_FILE="$HOME/.folha_manager_pids"
    
    if [ ! -f "$PID_FILE" ]; then
        warning "Nenhum processo do Sistema Mágico encontrado!"
        return 1
    fi
    
    source "$PID_FILE"
    
    echo -e "${YELLOW}🛑 Parando Sistema Mágico...${NC}"
    
    # Parar backend
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill "$BACKEND_PID"
        echo -e "${GREEN}✓ Backend parado (PID: $BACKEND_PID)${NC}"
    else
        echo -e "${ORANGE}⚠ Backend já estava parado${NC}"
    fi
    
    # Parar frontend
    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        kill "$FRONTEND_PID"
        echo -e "${GREEN}✓ Frontend parado (PID: $FRONTEND_PID)${NC}"
    else
        echo -e "${ORANGE}⚠ Frontend já estava parado${NC}"
    fi
    
    # Remover arquivo de PIDs
    rm -f "$PID_FILE"
    
    success "Sistema Mágico parado com sucesso!"
}

# ==============================================================================
# FUNÇÃO 2: Status do Sistema Mágico
# ==============================================================================
system_status() {
    show_header
    echo -e "${MAGENTA}🗝️ Status do Sistema Mágico${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    show_system_status
    
    echo ""
    pause
}

# ==============================================================================
# FUNÇÃO 3: Parar Sistema Mágico
# ==============================================================================
stop_system_menu() {
    show_header
    echo -e "${MAGENTA}🛑 Parar Sistema Mágico${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    if ! check_system_running; then
        error "O Sistema Mágico não está rodando!"
        pause
        return 1
    fi
    
    show_system_status
    echo ""
    echo -e "${YELLOW}Tem certeza que deseja parar o Sistema Mágico? (S/N)${NC}"
    read -r confirm
    
    if [[ "$confirm" =~ ^[Ss]$ ]]; then
        stop_system
    else
        info "Operação cancelada."
    fi
    
    pause
}
# ==============================================================================
# FUNÇÃO 4: Adicionar Tipo de Lançamento
# ==============================================================================
add_entry_type() {
    show_header
    echo -e "${MAGENTA}🌷 Adicionar Novo Tipo de Lançamento${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    
    # Verificar se o script Python existe
    if [ ! -f "add_entry_type.py" ]; then
        error "Script add_entry_type.py não encontrado!"
        pause
        return 1
    fi

    # Verificar se Python3 está disponível
    if ! command -v python3 >/dev/null 2>&1; then
        error "Python3 não está instalado ou não está no PATH!"
        pause
        return 1
    fi

    info "Executando script de adição de tipo de lançamento..."
    echo ""
    
    # Executar o script Python
    python3 add_entry_type.py
    
    if [ $? -eq 0 ]; then
        success "Tipo de lançamento adicionado com sucesso!"
    else
        error "Falha ao adicionar tipo de lançamento!"
    fi
    
    pause
}

# ==============================================================================
# FUNÇÃO 5: Backup do Banco de Dados
# ==============================================================================
backup_db() {
    show_header
    echo -e "${MAGENTA}🍰 Backup do Banco de Dados${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    
    # Verificar se o script Python existe
    if [ ! -f "backup_db.py" ]; then
        error "Script backup_db.py não encontrado!"
        pause
        return 1
    fi

    # Verificar se Python3 está disponível
    if ! command -v python3 >/dev/null 2>&1; then
        error "Python3 não está instalado ou não está no PATH!"
        pause
        return 1
    fi

    info "Executando script de backup do banco de dados..."
    echo ""
    
    # Executar o script Python
    python3 backup_db.py
    
    if [ $? -eq 0 ]; then
        success "Backup realizado com sucesso!"
    else
        error "Falha ao realizar backup!"
    fi
    
    pause
}

# ==============================================================================
# FUNÇÃO 6: Atualizar Árvore de Diretórios
# ==============================================================================
update_tree() {
    show_header
    echo -e "${MAGENTA}� Atualizar Árvore de Diretórios${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    
    # Verificar se o script Python existe
    if [ ! -f "update_tree.py" ]; then
        error "Script update_tree.py não encontrado!"
        pause
        return 1
    fi

    # Verificar se Python3 está disponível
    if ! command -v python3 >/dev/null 2>&1; then
        error "Python3 não está instalado ou não está no PATH!"
        pause
        return 1
    fi

    info "Executando script de atualização de árvore..."
    echo ""
    
    # Executar o script Python
    python3 update_tree.py
    
    if [ $? -eq 0 ]; then
        success "Árvore de diretórios atualizada com sucesso!"
    else
        error "Falha ao atualizar árvore de diretórios!"
    fi
    
    pause
}

# ==============================================================================
# FUNÇÃO 7: Informações do Sistema
# ==============================================================================
show_system_info() {
    show_header
    echo -e "${MAGENTA}⏰ Informações do Sistema Mágico${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    
    echo -e "${WHITE}📋 Status dos Componentes Mágicos:${NC}"
    echo ""
    
    # Verificar Docker
    if command -v docker >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Docker${NC} - Instalado"
        if docker ps >/dev/null 2>&1; then
            echo -e "${GREEN}✓ Container MySQL${NC} - Rodando"
        else
            echo -e "${RED}✗ Container MySQL${NC} - Parado ou não encontrado"
        fi
    else
        echo -e "${RED}✗ Docker${NC} - Não instalado"
    fi
    
    # Verificar Python
    if command -v python3 >/dev/null 2>&1; then
        PYTHON_VERSION=$(python3 --version 2>&1)
        echo -e "${GREEN}✓ Python3${NC} - $PYTHON_VERSION"
    else
        echo -e "${RED}✗ Python3${NC} - Não instalado"
    fi
    
    # Verificar Node.js
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version 2>&1)
        echo -e "${GREEN}✓ Node.js${NC} - $NODE_VERSION"
    else
        echo -e "${RED}✗ Node.js${NC} - Não instalado"
    fi
    
    # Verificar npm
    if command -v npm >/dev/null 2>&1; then
        NPM_VERSION=$(npm --version 2>&1)
        echo -e "${GREEN}✓ npm${NC} - $NPM_VERSION"
    else
        echo -e "${RED}✗ npm${NC} - Não instalado"
    fi
    
    echo ""
    echo -e "${WHITE}📁 Estrutura de Diretórios Mágicos:${NC}"
    echo ""
    
    # Verificar diretórios importantes
    if [ -d "venv" ]; then
        echo -e "${GREEN}✓ venv/${NC} - Ambiente virtual Python"
    else
        echo -e "${YELLOW}⚠ venv/${NC} - Não criado"
    fi
    
    if [ -d "node_modules" ]; then
        echo -e "${GREEN}✓ node_modules/${NC} - Dependências Node.js"
    else
        echo -e "${YELLOW}⚠ node_modules/${NC} - Não instalado"
    fi
    
    if [ -d "backend" ]; then
        echo -e "${GREEN}✓ backend/${NC} - Diretório do backend"
    else
        echo -e "${RED}✗ backend/${NC} - Não encontrado"
    fi
    
    if [ -d "src" ]; then
        echo -e "${GREEN}✓ src/${NC} - Diretório do frontend"
    else
        echo -e "${RED}✗ src/${NC} - Não encontrado"
    fi
    
    if [ -d "database" ]; then
        echo -e "${GREEN}✓ database/${NC} - Diretório do banco"
    else
        echo -e "${RED}✗ database/${NC} - Não encontrado"
    fi
    
    echo ""
    echo -e "${WHITE}🔗 URLs do Sistema Mágico:${NC}"
    echo ""
    echo -e "${CYAN}• Frontend: http://localhost:3000${NC}"
    echo -e "${CYAN}• Backend:  http://localhost:5000${NC}"
    
    # Mostrar status do sistema se estiver rodando
    echo ""
    if check_system_running; then
        echo -e "${GREEN}🌸 Sistema Mágico está rodando! 🌸${NC}"
        show_system_status
    else
        echo -e "${ORANGE}⏰ Sistema Mágico está parado${NC}"
    fi
    
    echo ""
    pause
}

# ==============================================================================
# FUNÇÃO 8: Limpar e Otimizar
# ==============================================================================
clean_and_optimize() {
    show_header
    echo -e "${MAGENTA}🧹 Limpar e Otimizar o País das Maravilhas${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    
    echo -e "${YELLOW}Opções de limpeza mágica:${NC}"
    echo ""
    echo -e "${WHITE}1.${NC} Limpar cache do npm"
    echo -e "${WHITE}2.${NC} Limpar ambiente virtual Python"
    echo -e "${WHITE}3.${NC} Limpar arquivos temporários"
    echo -e "${WHITE}4.${NC} Limpar logs do sistema"
    echo -e "${WHITE}5.${NC} Limpar tudo (inclusive sistema rodando)"
    echo -e "${WHITE}6.${NC} Voltar ao menu mágico"
    echo ""
    
    read -p "Escolha uma opção [1-6]: " choice
    
    case $choice in
        1)
            info "Limpando cache do npm..."
            npm cache clean --force 2>/dev/null
            success "Cache do npm limpo!"
            ;;
        2)
            if [ -d "venv" ]; then
                warning "Removendo ambiente virtual..."
                rm -rf venv
                success "Ambiente virtual removido!"
            else
                warning "Ambiente virtual não encontrado."
            fi
            ;;
        3)
            info "Limpando arquivos temporários..."
            find . -name "*.pyc" -delete 2>/dev/null
            find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null
            find . -name ".DS_Store" -delete 2>/dev/null
            success "Arquivos temporários limpos!"
            ;;
        4)
            info "Limpando logs do sistema..."
            rm -f backend.log frontend.log
            rm -f "$HOME/.folha_manager_pids"
            success "Logs do sistema limpos!"
            ;;
        5)
            warning "Limpando tudo..."
            # Parar sistema se estiver rodando
            if check_system_running; then
                stop_system
            fi
            npm cache clean --force 2>/dev/null
            if [ -d "venv" ]; then
                rm -rf venv
            fi
            if [ -d "node_modules" ]; then
                rm -rf node_modules
            fi
            find . -name "*.pyc" -delete 2>/dev/null
            find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null
            find . -name ".DS_Store" -delete 2>/dev/null
            rm -f backend.log frontend.log
            rm -f "$HOME/.folha_manager_pids"
            success "Limpeza completa realizada!"
            ;;
        6)
            return
            ;;
        *)
            error "Opção inválida!"
            ;;
    esac
    
    pause
}

# ==============================================================================
# FUNÇÃO PRINCIPAL - LOOP DO SISTEMA
# ==============================================================================
main() {
    # Verificar se estamos no diretório correto
    if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
        echo -e "${RED}[ERROR] This script must be executed in the project root directory!${NC}"
        echo -e "${YELLOW}[CURRENT DIR] $(pwd)${NC}"
        exit 1
    fi

    while true; do
        show_header
        
        # Mostrar status do sistema no menu
        if check_system_running; then
            echo -e "${NEON_GREEN}[SYSTEM ONLINE]${NC}"
        else
            echo -e "${YELLOW}[SYSTEM OFFLINE]${NC}"
        fi
        echo ""
        
        show_main_menu
        
        read -p "${NEON_CYAN}[SELECT OPTION 1-9]: ${NC}" choice
        
        case $choice in
            1)
                start_backend
                ;;
            2)
                system_status
                ;;
            3)
                stop_system_menu
                ;;
            4)
                add_entry_type
                ;;
            5)
                backup_db
                ;;
            6)
                update_tree
                ;;
            7)
                show_system_info
                ;;
            8)
                clean_and_optimize
                ;;
            9)
                show_header
                echo -e "${BRIGHT_CYAN}[SYSTEM SHUTDOWN] Thank you for using Gestor Folha Ponto!${NC}"
                echo -e "${NEON_GREEN}[DISCONNECTED] Connection terminated${NC}"
                # Parar sistema se estiver rodando
                if check_system_running; then
                    echo ""
                    warning "Stopping system before shutdown..."
                    stop_system
                fi
                exit 0
                ;;
            *)
                error "Invalid option! Please choose an option from 1 to 9."
                pause
                ;;
        esac
    done
}

# ==============================================================================
# INICIALIZAÇÃO
# ==============================================================================
# Verificar dependências básicas
check_dependencies() {
    local missing_deps=()
    
    if ! command -v python3 >/dev/null 2>&1; then
        missing_deps+=("python3")
    fi
    
    if ! command -v node >/dev/null 2>&1; then
        missing_deps+=("node")
    fi
    
    if ! command -v npm >/dev/null 2>&1; then
        missing_deps+=("npm")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        echo -e "${RED}[ERROR] Missing dependencies: ${missing_deps[*]}${NC}"
        echo -e "${YELLOW}[ACTION REQUIRED] Please install dependencies before continuing.${NC}"
        exit 1
    fi
}

# Executar verificação de dependências
check_dependencies

# Iniciar o programa
main "$@"
