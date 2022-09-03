# airtable_sync

This repository contains a couple functions used to synchronize data between systems (notably Slack and Airtable).

Most of them runs 

# Usage

The functions are deployed to AWS Lambda and execute automatically at interval.

The functions use the [Serverless framework](https://www.serverless.com/) to facilitate the deployment to AWS lambda.

## Executing the lambdas locally

```
cd slack_to_airtable
sls invoke local -f sync
```

If you use a different AWS profile than the default, add `--aws-profile ccm`

## Deploying a new version

If you have local changes that you wish to deploy:
```
sls deploy
```
(` --aws-profile ccm` if you use a different profile)


## Secrets

Secrets (password, etc...) are stored in the [Parameter Store of AWS Systems Manager](https://us-west-2.console.aws.amazon.com/systems-manager/parameters). They are then passed on by serverless to the function as env variables. See the [Serverless docs](https://www.serverless.com/framework/docs/providers/aws/guide/variables/#reference-variables-using-the-ssm-parameter-store) for more.

## Sync Airtable and Slack

### Functions

- `sync`: checks if a given user in Airtable is a member of the Slack group
- `active`: updates the "Slack Last Active Date" column in Airtable
- `backup`: can be used manually to download a copy of Airtable has a JSON file (useful before making big changes)
- `channels`: [not currently in use]. Used to sync what channels users belonged to
- `attendance`: [not currently in use]. Was used to manually sync HoA attendance files to Airtable

## PostgreSQL database

superuser: postgres (shouldn't be used, except for administration)
readwrite user: ccm_readwrite
readonly user: ccm_readonly
(reference for the permission scheme: https://aws.amazon.com/blogs/database/managing-postgresql-users-and-roles/)

Connect to the database using psql:
```bash
psql -h ccm-db.c51ekbqkhdej.us-west-2.rds.amazonaws.com -d postgres -U ccm_readwrite -W
```

To obtain the password, check the Parameter Store in AWS Systems Manager.
