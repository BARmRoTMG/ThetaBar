CREATE TABLE IF NOT EXISTS raw_alerts (
	alert_id SERIAL PRIMARY KEY,
	customer_name VARCHAR(100) NOT NULL,
	customer_id VARCHAR(20) NOT NULL,
	trade_id VARCHAR(30) NOT NULL,
	transaction_time TIMESTAMP NOT NULL,
	risk_level VARCHAR(20) NOT NULL,
	summary TEXT NOT NULL,
	amount NUMERIC(12,2) NOT NULL,
	country VARCHAR(50) NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_alerts (
        daily_alert_id SERIAL PRIMARY KEY,
        customer_name VARCHAR(100) NOT NULL,
        customer_id VARCHAR(20) NOT NULL,
        trade_id VARCHAR(30) NOT NULL,
        transaction_time TIMESTAMP NOT NULL,
        risk_level VARCHAR(20) NOT NULL,
        summary TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        country VARCHAR(50) NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
