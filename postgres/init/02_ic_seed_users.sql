INSERT INTO ic_users (username, email, password_hash, role)
VALUES
(
    'analyst1',
    'analyst1@bank.local',
    '$2b$12$TILQ3b.tzY.Jv.DLK14s3OIhnNfTOcLU2wpjY4G3If5phVjsBpyN6',
    'analyst'
),
(
    'analyst2',
    'analyst2@bank.local',
    '$2b$12$TILQ3b.tzY.Jv.DLK14s3OIhnNfTOcLU2wpjY4G3If5phVjsBpyN6',
    'analyst'
),
(
    'supervisor',
    'supervisor@bank.local',
    '$2b$12$TILQ3b.tzY.Jv.DLK14s3OIhnNfTOcLU2wpjY4G3If5phVjsBpyN6',
    'supervisor'
)
ON CONFLICT (username) DO NOTHING;
