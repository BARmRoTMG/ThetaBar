import os
from datetime import datetime, timedelta, timezone

import psycopg2
import psycopg2.extras
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel


app = FastAPI(title="Investigation Center API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


class LoginRequest(BaseModel):
    username: str
    password: str


class AssignRequest(BaseModel):
    daily_alert_id: int


def get_conn():
    return psycopg2.connect(**DB_CONFIG)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def create_token(user: dict) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {
        "sub": str(user["user_id"]),
        "username": user["username"],
        "email": user["email"],
        "exp": expires_at,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT user_id, username, email
                FROM ic_users
                WHERE user_id = %s
                """,
                (user_id,),
            )
            user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists")

    return user


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/login")
def login(payload: LoginRequest):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT user_id, username, email, password_hash
                FROM ic_users
                WHERE username = %s
                """,
                (payload.username,),
            )
            user = cur.fetchone()

    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    safe_user = {
        "user_id": user["user_id"],
        "username": user["username"],
        "email": user["email"],
    }

    return {
        "access_token": create_token(safe_user),
        "token_type": "bearer",
        "user": safe_user,
    }


@app.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    return current_user


@app.get("/alerts/unassigned")
def get_unassigned_alerts(current_user: dict = Depends(get_current_user)):
    return fetch_alerts("WHERE da.assigned_to_user_id IS NULL")


@app.get("/alerts/mine")
def get_my_alerts(current_user: dict = Depends(get_current_user)):
    return fetch_alerts(
        "WHERE da.assigned_to_user_id = %s",
        (current_user["user_id"],),
    )


@app.get("/alerts/all")
def get_all_alerts(current_user: dict = Depends(get_current_user)):
    return fetch_alerts("")


@app.post("/alerts/assign")
def assign_alert(
    payload: AssignRequest,
    current_user: dict = Depends(get_current_user),
):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE daily_alerts
                SET assigned_to_user_id = %s
                WHERE daily_alert_id = %s
                  AND assigned_to_user_id IS NULL
                RETURNING daily_alert_id
                """,
                (current_user["user_id"], payload.daily_alert_id),
            )
            updated = cur.fetchone()
            conn.commit()

    if not updated:
        raise HTTPException(
            status_code=409,
            detail="Alert is already assigned or does not exist",
        )

    return {
        "status": "assigned",
        "daily_alert_id": payload.daily_alert_id,
        "assigned_to_user_id": current_user["user_id"],
    }


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
            COALESCE(u.username, 'UnAssigned') AS assigned_to
        FROM daily_alerts da
        LEFT JOIN ic_users u
            ON da.assigned_to_user_id = u.user_id
        {where_clause}
        ORDER BY da.uploaded_at DESC, da.daily_alert_id DESC
    """

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, params)
            rows = cur.fetchall()

    return rows
