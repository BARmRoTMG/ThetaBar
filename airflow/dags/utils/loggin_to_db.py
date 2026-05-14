import os
import re
import logging
import psycopg2
from datetime import datetime

logger = logging.getLogger(__name__)

DB_CONFIG = {
    "host": "postgres",
    "dbname": "app_db",
    "user": "admin",
    "password": "admin",
}

LOG_PATTERN = re.compile(
    r"^\[(?P<timestamp>.*?)\]\s+\{.*?\}\s+(?P<level>INFO|WARNING|ERROR|DEBUG|CRITICAL)\s+-\s+(?P<message>.*)$"
)

def parse_log_line(line: str):
    match = LOG_PATTERN.match(line.strip())

    if not match:
        return None, None, line.strip()

    raw_timestamp = match.group("timestamp")
    log_level = match.group("level")
    message = match.group("message")

    parsed_timestamp = None

    try:
        parsed_timestamp = datetime.fromisoformat(raw_timestamp.replace("Z", "+00:00"))
    except Exception:
        parsed_timestamp = None

    return parsed_timestamp, log_level, message


def upload_airflow_logs_to_db(context):
    dag_id = context["dag"].dag_id
    task_id = context["task"].task_id
    run_id = context["run_id"]
    try_number = context["ti"].try_number

    log_path = context["ti"].log_filepath

    if not os.path.exists(log_path):
        logger.warning("Airflow log file not found: %s", log_path)
        return

    rows = []

    with open(log_path, "r", encoding="utf-8", errors="ignore") as file:
        for line in file:
            clean_line = line.strip()

            if not clean_line:
                continue

            log_timestamp, log_level, message = parse_log_line(clean_line)

            rows.append(
                (
                    "AIRFLOW",
                    dag_id,
                    task_id,
                    run_id,
                    try_number,
                    log_timestamp,
                    log_level,
                    message,
                )
            )

    if not rows:
        logger.warning("No log rows found to upload for %s.%s", dag_id, task_id)
        return

    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    cur.executemany(
        """
        INSERT INTO airflow_logs
        (
            source_system,
            dag_id,
            task_id,
            run_id,
            try_number,
            log_timestamp,
            log_level,
            message
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        rows,
    )

    conn.commit()
    cur.close()
    conn.close()

    logger.info(
        "Uploaded %s Airflow log lines to Postgres for dag_id=%s task_id=%s run_id=%s",
        len(rows),
        dag_id,
        task_id,
        run_id,
    )