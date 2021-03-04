# climatechangemakers

## Executing the lambdas locally

```
sls invoke local -f sync
```

If you use a different AWS profile than the default, add `--aws-profile ccm`

## Sync Airtable and Slack

## PostgreSQL database

superuser: postgres (shouldn't be used, except for administration)
readwrite user: ccm_readwrite
readonly user: ccm_readonly
(reference for the permission scheme: https://aws.amazon.com/blogs/database/managing-postgresql-users-and-roles/)

Connect to the database using psql:
psql -h ccm-db.c51ekbqkhdej.us-west-2.rds.amazonaws.com -d postgres -U ccm_readwrite -W

To obtain the password, check the Parameter Store in AWS Systems Manager.

### Database schema

```SQL
CREATE TABLE contacts (
  email VARCHAR(256),
  airtable_id VARCHAR(256),
  first_name VARCHAR(256),
  last_name VARCHAR(256),
  slack_member_id VARCHAR(256),
  signup_date TIMESTAMPTZ,
  slack_joined_date TIMESTAMPTZ,
  slack_last_active_date TIMESTAMPTZ,
  state VARCHAR(32),
  referred_by VARCHAR(256),
  1_1_status VARCHAR(256),
  1_1_greeter VARCHAR(256),
  is_experienced BOOLEAN,
);
CREATE UNIQUE INDEX idx_airtable_id ON contacts (airtable_id);
ALTER TABLE contacts ADD CONSTRAINT unique_airtable_id UNIQUE USING INDEX idx_airtable_id;
```
