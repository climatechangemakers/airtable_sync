import throat from 'throat';
import { getPostgresClient } from './pg';
// const moment = require('moment');
require('dotenv').config();
const airtable = require('airtable');
// const _ = require('lodash');

const base = airtable.base(process.env.AIRTABLE_BASE);

async function upsertRecord(record: any) {
  const pg = await getPostgresClient();

  const { id: airtableId } = record;
  const firstName = record.get('First Name');
  const lastName = record.get('Last Name');
  const email = record.get('Email');
  const slackMemberId = record.get('Slack Member ID');
  const slackJoinedDate = record.get('Slack Joined Date')
    ? new Date(record.get('Slack Joined Date'))
    : undefined;
  const slackLastActiveDate = record.get('Slack Last Active Date')
    ? new Date(record.get('Slack Last Active Date'))
    : undefined;
  const state = record.get('State');
  const signupDate = record.get('Signup Date')
    ? new Date(record.get('Signup Date'))
    : undefined;
  const referredBy = record.get('Referred By');
  const onOnOneStatus = record.get('1:1 Status');
  const onOnOneGreeter = record.get('1:1 Greeter');
  const isExperienced = record.get('Experience?') === 'Yes';
  const mailchimpStatus = record.get('MailChimp Status?');

  const input = [
    email,
    airtableId,
    firstName,
    lastName,
    slackMemberId,
    signupDate,
    slackJoinedDate,
    slackLastActiveDate,
    state,
    referredBy,
    onOnOneStatus,
    onOnOneGreeter,
    isExperienced,
    mailchimpStatus,
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
    state,
    referred_by,
    one_on_one_status,
    one_on_one_greeter,
    is_experienced,
    mailchimp_status
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
    state = EXCLUDED.state,
    referred_by = EXCLUDED.referred_by,
    one_on_one_status = EXCLUDED.one_on_one_status,
    one_on_one_greeter = EXCLUDED.one_on_one_greeter,
    is_experienced = EXCLUDED.is_experienced,
    mailchimp_status = EXCLUDED.mailchimp_status
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
