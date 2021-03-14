require('dotenv').config();
const { WebClient } = require('@slack/web-api');
const moment = require('moment');
const throat = require('throat');
const _ = require('lodash');

const slack = new WebClient(process.env.SLACK_TOKEN);

const base = require('airtable').base(process.env.AIRTABLE_BASE);

async function updateAirtable() {
  return new Promise((resolve, reject) => {
    console.log(process.env.AIRTABLE_BASE);
    base('CRM')
      .select({
        // maxRecords: 3,
        view: 'Joined Slack',
      })
      .eachPage(
        async function page(records, fetchNextPage) {
          // This function (`page`) will get called for each page of records.
          await Promise.all(
            records.map(
              throat(1, async (record) => {
                const memberId = record.get('Slack Member ID');
                const lastActiveRecord = record.get('Slack Last Active Date');
                const lastActiveDate = lastActiveRecord
                  ? moment(lastActiveRecord)
                  : undefined;
                // console.log(memberId, lastActiveDate);
                if (
                  !lastActiveDate ||
                  lastActiveDate < moment().startOf('day')
                ) {
                  const { presence } = await slack.users.getPresence({
                    user: memberId,
                  });
                  // console.log(memberId, lastActiveDate.toDate(), presence);
                  if (presence === 'active') {
                    await record.updateFields({
                      'Slack Last Active Date': moment().format('YYYY-MM-DD'),
                      'Last updated by Bot': moment().format('YYYY-MM-DD'),
                    });
                  }
                  await new Promise((resolve) => setTimeout(resolve, 300)); // wait a bit for rate limit
                }
              })
            )
          );
          fetchNextPage();
        },
        function done(err) {
          if (err) {
            return reject(err);
          }
          return resolve();
        }
      );
  });
}

exports.handler = async function (_event, context) {
  console.log('start');
  try {
    await updateAirtable();
  } catch (err) {
    console.log(err);
  }
};
