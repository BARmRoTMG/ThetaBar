from datetime import datetime
import pendulum
import psycopg2
import logging

from airflow import DAG
from airflow.operators.python import PythonOperator
from utils.loggin_to_db import upload_airflow_logs_to_db

DB_CONFIG = {
    "host": "postgres",
    "dbname": "app_db",
    "user": "admin",
    "password": "admin",
}

logger = logging.getLogger(__name__)

DIVIDER = "-" * 60


def upload_daily_alerts():
    run_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    run_day  = datetime.now().strftime("%Y-%m-%d")

    logger.info(DIVIDER)
    logger.info("DAG          : daily_alert_upload")
    logger.info("Task         : upload_daily_alerts")
    logger.info("Started at   : %s", run_date)
    logger.info("Target date  : %s", run_day)
    logger.info(DIVIDER)

    conn = None
    cur  = None

    try:
        # ── Step 1: Connect ──────────────────────────────────────────
        logger.info("[Step 1/4] Connecting to database '%s' on host '%s'...",
                    DB_CONFIG["dbname"], DB_CONFIG["host"])
        try:
            conn = psycopg2.connect(**DB_CONFIG)
            cur  = conn.cursor()
            logger.info("[Step 1/4] Connection established successfully.")
        except psycopg2.OperationalError as e:
            logger.error("[Step 1/4] FAILED — could not connect to the database.")
            logger.error("           Host   : %s", DB_CONFIG["host"])
            logger.error("           DB     : %s", DB_CONFIG["dbname"])
            logger.error("           Reason : %s", e)
            raise

        # ── Step 2: Check availability ───────────────────────────────
        logger.info("[Step 2/4] Checking available raw alerts for %s...", run_day)
        try:
            cur.execute(
                """
                SELECT risk_level, COUNT(*) AS cnt
                FROM raw_alerts
                WHERE DATE(transaction_time) = CURRENT_DATE
                  AND trade_id NOT IN (SELECT trade_id FROM daily_alerts)
                GROUP BY risk_level
                ORDER BY
                    CASE risk_level
                        WHEN 'CRITICAL' THEN 1
                        WHEN 'HIGH'     THEN 2
                        WHEN 'MEDIUM'   THEN 3
                        WHEN 'LOW'      THEN 4
                        ELSE 5
                    END
                """
            )
            breakdown_rows = cur.fetchall()
        except psycopg2.DatabaseError as e:
            logger.error("[Step 2/4] FAILED — error querying raw_alerts.")
            logger.error("           Reason : %s", e)
            raise

        if not breakdown_rows:
            logger.warning("[Step 2/4] No new raw alerts found for today (%s).", run_day)
            logger.warning("           Possible reasons: simulator is not running, "
                           "all today's alerts are already uploaded, or no transactions "
                           "were generated for today.")
            logger.info(DIVIDER)
            logger.info("Upload skipped — nothing to insert.")
            logger.info(DIVIDER)
            return

        total_available = sum(row[1] for row in breakdown_rows)
        breakdown_str   = " | ".join(f"{level}: {cnt}" for level, cnt in breakdown_rows)
        logger.info("[Step 2/4] Found %d unuploaded alert(s) for today.", total_available)
        logger.info("           Breakdown : %s", breakdown_str)
        logger.info("           Limit     : 30 (highest risk priority first)")

        # ── Step 3: Insert ───────────────────────────────────────────
        logger.info("[Step 3/4] Inserting up to 30 alerts into daily_alerts...")
        try:
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
                  )
                ORDER BY
                    CASE risk_level
                        WHEN 'CRITICAL' THEN 1
                        WHEN 'HIGH'     THEN 2
                        WHEN 'MEDIUM'   THEN 3
                        WHEN 'LOW'      THEN 4
                        ELSE 5
                    END,
                    created_at ASC
                LIMIT 30;
                """
            )
        except psycopg2.DatabaseError as e:
            logger.error("[Step 3/4] FAILED — INSERT into daily_alerts raised a database error.")
            logger.error("           Reason : %s", e)
            raise

        inserted = cur.rowcount
        if inserted == 0:
            logger.warning("[Step 3/4] No rows were inserted.")
            logger.warning("           All %d available alert(s) may already exist in "
                           "daily_alerts (duplicate trade_id).", total_available)
        else:
            logger.info("[Step 3/4] Inserted %d / %d available alert(s).", inserted, total_available)
            if inserted < total_available:
                logger.info("           %d alert(s) were not uploaded (daily limit of 30 reached "
                            "or already present).", total_available - inserted)

        # ── Step 4: Commit ───────────────────────────────────────────
        logger.info("[Step 4/4] Committing transaction...")
        try:
            conn.commit()
            logger.info("[Step 4/4] Transaction committed successfully.")
        except psycopg2.DatabaseError as e:
            logger.error("[Step 4/4] FAILED — commit raised a database error.")
            logger.error("           Reason : %s", e)
            raise

        logger.info(DIVIDER)
        logger.info("Upload complete — %d alert(s) added to daily_alerts.", inserted)
        logger.info(DIVIDER)

    except Exception as e:
        logger.error(DIVIDER)
        logger.error("Upload FAILED — an unhandled exception occurred.")
        logger.error("Reason : %s", e)
        logger.error(DIVIDER)
        if conn:
            try:
                conn.rollback()
                logger.warning("Transaction rolled back.")
            except Exception as rb_err:
                logger.error("Rollback also failed: %s", rb_err)
        raise

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()
        logger.info("Database connection closed.")


with DAG(
    dag_id="daily_alert_upload",
    start_date=datetime(2024, 1, 1, tzinfo=pendulum.timezone("Asia/Jerusalem")),
    schedule="0 12 * * *",
    catchup=False,
    tags=["bank", "alerts", "simulation"],
) as dag:
    upload_task = PythonOperator(
        task_id="upload_daily_alerts_task",
        python_callable=upload_daily_alerts,
        on_success_callback=upload_airflow_logs_to_db,
        on_failure_callback=upload_airflow_logs_to_db,
    )
