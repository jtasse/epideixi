-- Run once per RDS instance using the master user (e.g. via psql or RDS Query Editor).
-- Replace :db_name if you changed the DatabaseName parameter.

CREATE USER iam_api WITH LOGIN;
GRANT rds_iam TO iam_api;
GRANT CONNECT ON DATABASE epideixi TO iam_api;
GRANT USAGE ON SCHEMA public TO iam_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO iam_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO iam_api;
