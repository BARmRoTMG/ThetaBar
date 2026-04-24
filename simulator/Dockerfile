FROM python:3.11-slim

WORKDIR /app

RUN pip install psycopg2-binary faker

COPY alerts_simulator.py /app/alerts_simulator.py

CMD ["python", "/app/alerts_simulator.py"]