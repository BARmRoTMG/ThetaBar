from datetime import datetime
import psycopg2

from airflow import DAG
from airflow.operators.python import PythonOperator

DB_CONFIG = {
    "host": "postgres",
    "dbname": "app_db",
    "user": "admin",
    "password": "admin",
}

def upload_daily_alerts():
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO daily_alerts
        (
            customer_name,
            customer_id,
            trade_id,
            transaction_time,
            risk_level,
            summary,
            amount,
            country
        )
        SELECT
            customer_name,
            customer_id,
            trade_id,
            transaction_time,
            risk_level,
            summary,
            amount,
            country
        FROM raw_alerts
        WHERE DATE(transaction_time) = CURRENT_DATE
          AND trade_id NOT IN (
              SELECT trade_id FROM daily_alerts
          );
        """
    )

    conn.commit()
    cur.close()
    conn.close()

with DAG(
    dag_id="daily_alert_upload",
    start_date=datetime(2024, 1, 1),
    schedule="@daily",
    catchup=False,
    tags=["bank", "alerts", "simulation"],
) as dag:
    upload_task = PythonOperator(
        task_id="upload_daily_alerts_task",
        python_callable=upload_daily_alerts,
    )
