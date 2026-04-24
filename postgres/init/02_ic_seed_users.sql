INSERT INTO ic_users (username, email, password_hash)
VALUES
(
    'analyst1',
    'analyst1@bank.local',
    '$2b$12$TILQ3b.tzY.Jv.DLK14s3OIhnNfTOcLU2wpjY4G3If5phVjsBpyN6'
),
(
    'analyst2',
    'analyst2@bank.local',
    '$2b$12$TILQ3b.tzY.Jv.DLK14s3OIhnNfTOcLU2wpjY4G3If5phVjsBpyN6'
)
ON CONFLICT (username) DO NOTHING;
