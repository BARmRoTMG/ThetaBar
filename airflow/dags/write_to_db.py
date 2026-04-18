from datetime import datetime
from airflow import DAG
from airflow.operators.python import PythonOperator
import psycopg2

def write_to_db():
    # Everything involving the connection must stay inside this function
    conn = psycopg2.connect(
        host="postgres",
        database="app_db",
        user="admin",
        password="admin"
    )
    cur = conn.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS test (msg TEXT);")
    cur.execute("INSERT INTO test VALUES ('hello from airflow');")
    conn.commit()
    cur.close()
    conn.close()

with DAG (
    dag_id="write_to_db",
    start_date=datetime(2026, 1, 1),
    schedule="@daily",
    catchup=False,
) as dag:
    
    task = PythonOperator(
        task_id="write_to_db",
        python_callable=write_to_db,
    )