CREATE TABLE IF NOT EXISTS airflow_logs (
    log_id BIGSERIAL PRIMARY KEY,

    source_system VARCHAR(50) NOT NULL DEFAULT 'AIRFLOW',

    dag_id VARCHAR(255) NOT NULL,
    task_id VARCHAR(255) NOT NULL,
    run_id TEXT NOT NULL,
    try_number INT NOT NULL,

    log_timestamp TIMESTAMP NULL,
    log_level VARCHAR(20) NULL,

    message TEXT NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_airflow_logs_source_system
ON airflow_logs(source_system);

CREATE INDEX IF NOT EXISTS idx_airflow_logs_dag_id
ON airflow_logs(dag_id);

CREATE INDEX IF NOT EXISTS idx_airflow_logs_task_id
ON airflow_logs(task_id);

CREATE INDEX IF NOT EXISTS idx_airflow_logs_run_id
ON airflow_logs(run_id);

CREATE INDEX IF NOT EXISTS idx_airflow_logs_log_level
ON airflow_logs(log_level);

CREATE INDEX IF NOT EXISTS idx_airflow_logs_created_at
ON airflow_logs(created_at);