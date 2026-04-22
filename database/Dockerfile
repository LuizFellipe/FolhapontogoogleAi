FROM mysql:8.0

# Copia o dump completo para o diretório de inicialização do MySQL.
# O entrypoint oficial do MySQL executa automaticamente todos os arquivos
# .sql/.sh presentes em /docker-entrypoint-initdb.d apenas na primeira
# inicialização (quando o volume de dados está vazio).
COPY full_setup.sql /docker-entrypoint-initdb.d/full_setup.sql

# O banco folhaponto_db é criado pelo próprio full_setup.sql (CREATE DATABASE IF NOT EXISTS).
# A variável MYSQL_DATABASE nos docker-compose garante que o MySQL inicie
# corretamente mesmo antes do script rodar.
