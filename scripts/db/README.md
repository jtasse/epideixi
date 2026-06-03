# Database scripts (AWS RDS)

Use these steps after deploying with `DeployDatabase=true`. The API runtime uses the IAM-enabled role `iam_api`; the master password is only for initial administration.

## Prerequisites

- Stack deployed with RDS outputs: **DatabaseEndpoint**, **DatabasePort**, **DatabaseIamUsername**
- Master password available from SSM Parameter Store (`epideixi_db_password` by default)
- Network path to RDS (VPN, bastion, or Session Manager port forwarding)

## 1. Create the IAM database user

Connect as the master user (`DatabaseMasterUsername`, default `epideixi_admin`) and run:

```bash
psql "host=<DatabaseEndpoint> port=<DatabasePort> dbname=epideixi user=epideixi_admin sslmode=require"
```

Then execute [create-iam-db-user.sql](create-iam-db-user.sql) (creates `iam_api` with `rds_iam`).

Or use the RDS Query Editor in the AWS Console with the same SQL file.

## 2. Apply EF Core migrations

From a machine that can reach RDS, use password auth as the master user (IAM is not used for `dotnet ef`):

```bash
cd apps/api
set Database__Host=<DatabaseEndpoint>
set Database__Port=5432
set Database__Name=epideixi
set Database__Username=epideixi_admin
set Database__Password=<master-password>
set Database__UseIamAuth=false
dotnet ef database update
```

On Linux/macOS, use `export` instead of `set`.

After migrations exist, the Lambda API uses `iam_api` with `Database__UseIamAuth=true` (set automatically by SAM when `DeployDatabase=true`).

## 3. Verify

Call `GET /api/records` on the deployed API with a valid Cognito JWT. Create a record with `POST /api/records` and confirm it persists across Lambda invocations.
