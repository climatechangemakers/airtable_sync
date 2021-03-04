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
