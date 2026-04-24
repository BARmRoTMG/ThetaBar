import os
import time
import random
import psycopg2
from datetime import datetime
from faker import Faker

fake = Faker()

DB_HOST = os.getenv("DB_HOST", "postgres")
DB_NAME = os.getenv("DB_NAME", "app_db")
DB_USER = os.getenv("DB_USER", "admin")
DB_PASSWORD = os.getenv("DB_PASSWORD", "admin")
SLEEP_SECONDS = int(os.getenv("SLEEP_SECONDS", "30"))

RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
COUNTRIES = ["Israel", "UK", "USA", "Germany", "Spain", "France", "Brazil"]

PATTERNS = [
    "Large cross-border transfer inconsistent with customer profile",
    "Rapid movement of funds through multiple counterparties",
    "Transaction amount exceeds expected customer activity",
    "Possible layering behaviour detected across linked accounts",
    "High-risk jurisdiction invloved in payment chain",
    "Unusual trade timing outside customer normal activity window",
    "Potential structuring paattern across related transactions",
]

def get_connection():
    return psycopg2.connect(
        host=DB_HOST,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
    )

def generate_alert():
    name = fake.name()
    customer_id = str(random.randint(100000000, 999999999))
    trade_id = f"TRD-{random.randint(1000000, 9999999)}"
    transaction_time = datetime.utcnow()
    risk_level = random.choices(
        RISK_LEVELS, weights=[20, 35, 30, 15], k=1
    )[0]
    amount = round(random.uniform(500, 250000), 2)
    country = random.choice(COUNTRIES)
    summary = random.choice(PATTERNS)

    return (
        name, 
        customer_id,
        trade_id,
        transaction_time,
        risk_level,
        summary,
        amount,
        country,
    )

def insert_alert(conn, alert):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO raw_alerts
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
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            alert,
        )
    conn.commit()

def main():
    while True:
        try:
            with get_connection() as conn:
                alert = generate_alert()
                insert_alert(conn, alert)
                print(f"Inserted alert: {alert[2]} | {alert[4]} | {alert[6]}")
        except Exception as e:
            print(f"Error: {e}")

        time.sleep(SLEEP_SECONDS)

if __name__ == "__main__":
    main()