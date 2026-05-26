ARG REGISTRY=local.registry:5050

FROM ${REGISTRY}/base-webserver:latest

WORKDIR /app

# Copy requirements first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Fail fast if SECURE_LOC  not mounted — config validates on import
ENV PYTHONPATH=/app
ARG SERVICE_PORT=8000

EXPOSE $SERVICE_PORT

CMD python -m uvicorn backend.main:app --host 0.0.0.0 --port $SERVICE_PORT
