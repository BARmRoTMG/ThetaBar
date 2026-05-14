import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Optional

import psycopg2
import psycopg2.extras
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from prometheus_fastapi_instrumentator import Instrumentator


DB_CONFIG = {
    "host": os.getenv("DB_HOST", "postgres"),
    "dbname": os.getenv("DB_NAME", "app_db"),
    "user": os.getenv("DB_USER", "admin"),
    "password": os.getenv("DB_PASSWORD", "admin"),
}

JWT_SECRET = os.getenv("JWT_SECRET", "change-this-secret-in-real-life")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "720"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def get_conn():
    return psycopg2.connect(**DB_CONFIG)


SUPERVISOR_HASH = "$2b$12$TILQ3b.tzY.Jv.DLK14s3OIhnNfTOcLU2wpjY4G3If5phVjsBpyN6"


@asynccontextmanager
async def lifespan(app: FastAPI):
    with get_conn() as conn:
        with conn.cursor() as cur:
            # Idempotent schema migrations
            cur.execute("""
                ALTER TABLE daily_alerts
                ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'new'
            """)
            cur.execute("""
                ALTER TABLE ic_users
                ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'analyst'
            """)
            # Ensure supervisor exists (safe for existing DBs)
            cur.execute(
                """
                INSERT INTO ic_users (username, email, password_hash, role)
                VALUES ('supervisor', 'supervisor@bank.local', %s, 'supervisor')
                ON CONFLICT (username) DO NOTHING
                """,
                (SUPERVISOR_HASH,),
            )
            conn.commit()
    yield


app = FastAPI(title="Investigation Center API", lifespan=lifespan)
Instrumentator().instrument(app).expose(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class AssignRequest(BaseModel):
    daily_alert_id: int
    user_id: Optional[int] = None  # None → assign to current user


# ── Auth helpers ───────────────────────────────────────────────────────────────

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(user: dict) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {
        "sub": str(user["user_id"]),
        "username": user["username"],
        "email": user["email"],
        "exp": expires_at,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT user_id, username, email, role FROM ic_users WHERE user_id = %s",
                (user_id,),
            )
            user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return user


# ── Query helper ───────────────────────────────────────────────────────────────

def fetch_alerts(where_clause: str, params: tuple = ()):
    query = f"""
        SELECT
            da.daily_alert_id,
            da.customer_name,
            da.customer_id,
            da.trade_id,
            da.transaction_time,
            da.risk_level,
            da.summary,
            da.amount,
            da.country,
            da.uploaded_at,
            da.assigned_to_user_id,
            da.status,
            u.username AS assigned_to
        FROM daily_alerts da
        LEFT JOIN ic_users u ON da.assigned_to_user_id = u.user_id
        {where_clause}
        ORDER BY da.uploaded_at DESC, da.daily_alert_id DESC
    """
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, params)
            return cur.fetchall()


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/login")
def login(payload: LoginRequest):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT user_id, username, email, password_hash, role FROM ic_users WHERE username = %s",
                (payload.username,),
            )
            user = cur.fetchone()

    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    safe_user = {k: user[k] for k in ("user_id", "username", "email", "role")}
    return {"access_token": create_token(safe_user), "token_type": "bearer", "user": safe_user}


@app.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    return current_user


@app.get("/users")
def get_users(current_user: dict = Depends(get_current_user)):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT user_id, username, email, role FROM ic_users ORDER BY username"
            )
            return cur.fetchall()


@app.get("/alerts/unassigned")
def get_unassigned_alerts(current_user: dict = Depends(get_current_user)):
    return fetch_alerts("WHERE da.assigned_to_user_id IS NULL AND da.status != 'closed'")


@app.get("/alerts/mine")
def get_my_alerts(current_user: dict = Depends(get_current_user)):
    return fetch_alerts("WHERE da.assigned_to_user_id = %s", (current_user["user_id"],))


@app.get("/alerts/all")
def get_all_alerts(current_user: dict = Depends(get_current_user)):
    return fetch_alerts("")


@app.get("/alerts/closed")
def get_closed_alerts(current_user: dict = Depends(get_current_user)):
    return fetch_alerts("WHERE da.status = 'closed'")


@app.post("/alerts/assign")
def assign_alert(payload: AssignRequest, current_user: dict = Depends(get_current_user)):
    # Analysts may only assign to themselves regardless of payload
    if current_user.get("role") != "supervisor":
        target_user_id = current_user["user_id"]
    else:
        target_user_id = payload.user_id if payload.user_id is not None else current_user["user_id"]

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE daily_alerts
                SET assigned_to_user_id = %s
                WHERE daily_alert_id = %s
                RETURNING daily_alert_id
                """,
                (target_user_id, payload.daily_alert_id),
            )
            updated = cur.fetchone()
            conn.commit()

    if not updated:
        raise HTTPException(status_code=404, detail="Alert not found")

    return {
        "status": "assigned",
        "daily_alert_id": payload.daily_alert_id,
        "assigned_to_user_id": target_user_id,
    }


@app.post("/alerts/{alert_id}/close")
def close_alert(alert_id: int, current_user: dict = Depends(get_current_user)):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE daily_alerts
                SET status = 'closed'
                WHERE daily_alert_id = %s
                RETURNING daily_alert_id
                """,
                (alert_id,),
            )
            updated = cur.fetchone()
            conn.commit()

    if not updated:
        raise HTTPException(status_code=404, detail="Alert not found")

    return {"status": "closed", "daily_alert_id": alert_id}


@app.post("/alerts/get-next")
def get_next_alert(current_user: dict = Depends(get_current_user)):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE daily_alerts
                SET assigned_to_user_id = %s
                WHERE daily_alert_id = (
                    SELECT daily_alert_id
                    FROM daily_alerts
                    WHERE assigned_to_user_id IS NULL
                      AND status != 'closed'
                    ORDER BY
                        CASE
                            WHEN risk_level = 'CRITICAL' THEN 1
                            WHEN risk_level = 'HIGH'     THEN 2
                            WHEN risk_level = 'MEDIUM'   THEN 3
                            ELSE 4
                        END,
                        uploaded_at ASC,
                        daily_alert_id ASC
                    LIMIT 1
                    FOR UPDATE SKIP LOCKED
                )
                RETURNING daily_alert_id
                """,
                (current_user["user_id"],),
            )
            updated = cur.fetchone()
            conn.commit()

    if not updated:
        raise HTTPException(status_code=404, detail="No unassigned alerts available")

    return {
        "status": "assigned",
        "daily_alert_id": updated["daily_alert_id"],
        "assigned_to_user_id": current_user["user_id"],
    }
