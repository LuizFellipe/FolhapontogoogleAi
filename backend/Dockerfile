# Usar Python 3.11 slim (versão estável com suporte até out/2027)
FROM python:3.11-slim

WORKDIR /app

# Configurar ambiente Docker para consistência

# Instalar apenas dependências de sistema necessárias para o mysql-connector
RUN apt-get update && apt-get install -y --no-install-recommends \
    default-libmysqlclient-dev \
    gcc \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependências Python (cache de layer eficiente)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar o .env e o código do backend
COPY .env .
COPY backend/ .

EXPOSE 5000

ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_DEBUG=false

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/api/health')" || exit 1

# Gunicorn como servidor WSGI de produção
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "60", "--access-logfile", "-", "app:app"]
