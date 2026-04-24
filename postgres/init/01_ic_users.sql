CREATE TABLE IF NOT EXISTS ic_users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE daily_alerts
ADD COLUMN IF NOT EXISTS assigned_to_user_id INT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_daily_alerts_assigned_user'
    ) THEN
        ALTER TABLE daily_alerts
        ADD CONSTRAINT fk_daily_alerts_assigned_user
        FOREIGN KEY (assigned_to_user_id)
        REFERENCES ic_users(user_id)
        ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_daily_alerts_assigned_to_user_id
ON daily_alerts(assigned_to_user_id);

CREATE INDEX IF NOT EXISTS idx_daily_alerts_risk_level
ON daily_alerts(risk_level);

CREATE INDEX IF NOT EXISTS idx_daily_alerts_uploaded_at
ON daily_alerts(uploaded_at);
