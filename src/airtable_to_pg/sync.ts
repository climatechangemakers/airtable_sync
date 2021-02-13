require('dotenv').config();
import { getPostgresClient } from './pg';
const airtable = require('airtable');
// const moment = require('moment');
import throat from 'throat';
// const _ = require('lodash');

// process.env.SALESFORCE_SECURITY_TOKEN

const base = airtable.base(process.env.AIRTABLE_BASE);

async function upsertRecord(record: any) {
  const pg = await getPostgresClient();

  const { id: airtable_id } = record;
  const first_name = record.get('First Name');
  const last_name = record.get('Last Name');
  const email = record.get('Email');
  const slack_member_id = record.get('Slack Member ID');
  const slack_joined_date = record.get('Slack Joined Date')
    ? new Date(record.get('Slack Joined Date'))
    : undefined;
  const slack_last_active_date = record.get('Slack Last Active Date')
    ? new Date(record.get('Slack Last Active Date'))
    : undefined;
  const state = record.get('State');
  const signup_date = record.get('Signup Date')
    ? new Date(record.get('Signup Date'))
    : undefined;

  const input = [
    email,
    airtable_id,
    first_name,
    last_name,
    slack_member_id,
    signup_date,
    slack_joined_date,
    slack_last_active_date,
    state,
  ];

  const query = `
  INSERT INTO contacts (
    email,
    airtable_id,
    first_name,
    last_name,
    slack_member_id,
    signup_date,
    slack_joined_date,
    slack_last_active_date,
    state
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  ON CONFLICT (airtable_id)
  DO
  UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    signup_date = EXCLUDED.signup_date,
    slack_member_id = EXCLUDED.slack_member_id,
    slack_joined_date = EXCLUDED.slack_joined_date,
    slack_last_active_date = EXCLUDED.slack_last_active_date,
    state = EXCLUDED.state
  ;`;

  await pg.query(query, input);

  console.log(`Updated 1 record`);
}

async function syncAirtable() {
  return new Promise((resolve, reject) => {
    base('CRM')
      .select({
        // maxRecords: 3,
        view: 'Grid view',
      })
      .eachPage(
        async function page(records: any, fetchNextPage: Function) {
          // This function (`page`) will get called for each page of records.
          await Promise.all(
            records.map(
              throat(5, async (record: any) => {
                await upsertRecord(record);
              })
            )
          );

          // To fetch the next page of records, call `fetchNextPage`.
          // If there are more records, `page` will get called again.
          // If there are no more records, `done` will get called.
          fetchNextPage();
        },
        function done(err: Error) {
          if (err) {
            return reject(err);
          }
          return resolve(null);
        }
      );
  });
}

export async function handler(_event: any, context: any) {
  context.callbackWaitsForEmptyEventLoop = false;
  await syncAirtable();
  const client = await getPostgresClient();
  await client.end();
  return 'success';
}
