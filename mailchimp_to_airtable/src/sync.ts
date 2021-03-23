require('dotenv').config();
const airtable = require('airtable');
import throat from 'throat';
import * as moment from 'moment';
const mailchimp = require('@mailchimp/mailchimp_marketing');

const base = airtable.base(process.env.AIRTABLE_BASE);
mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_API_KEY,
  server: 'us17',
});

const LIST_ID = '71f4c0393d';

async function findStatusInMailchimp(email: string) {
  const options = {
    listId: LIST_ID,
  };
  const { exact_matches } = await mailchimp.searchMembers.search(
    email,
    options
  );
  const firstMatch =
    exact_matches && exact_matches.members && exact_matches.members[0];
  if (!firstMatch) return 'Unknown';
  return firstMatch.status === 'subscribed' ? 'Subscribed' : 'Unsubscribed';
}

async function syncAirtable() {
  return new Promise((resolve, reject) => {
    base('CRM')
      .select({
        // maxRecords: 10,
        view: 'Grid view',
      })
      .eachPage(
        async function page(records: any, fetchNextPage: Function) {
          // This function (`page`) will get called for each page of records.
          await Promise.all(
            records.map(
              throat(1, async (record: any) => {
                const email = record.get('Email');
                console.log(email);
                const status = await findStatusInMailchimp(email);
                console.log(status);
                await record.updateFields({
                  'MailChimp Status': status,
                  'Last updated by Bot': moment().format('YYYY-MM-DD'),
                });
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
  return 'success';
}
