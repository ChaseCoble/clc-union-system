ARG REGISTRY=registry.local:5050
FROM ${REGISTRY}/base-webserver:latest

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONPATH=/app

ARG SERVICE_PORT=8000
ENV SERVICE_PORT=${SERVICE_PORT}

EXPOSE ${SERVICE_PORT}

CMD python -m uvicorn backend.main:app --host 0.0.0.0 --port $SERVICE_PORT
