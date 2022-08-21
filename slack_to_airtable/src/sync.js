require('dotenv').config();
const { WebClient } = require('@slack/web-api');
const moment = require('moment');
const throat = require('throat');
const _ = require('lodash');

const slack = new WebClient(process.env.SLACK_TOKEN);

const base = require('airtable').base(process.env.AIRTABLE_BASE);

function parseUserResponse(members) {
  const shortList = members.map((member) => {
    const { id, profile, name, updated, is_bot, deleted } = member;
    if (is_bot) {
      return;
    }
    const { email, display_name, real_name } = profile;
    const updatedDate = moment.unix(updated).format('YYYY-MM-DD');
    return {
      id,
      deleted,
      email,
      name,
      real_name,
      display_name,
      updatedDate,
    };
  });
  return _.compact(shortList);
}

async function updateAirtable(slackUsers) {
  console.log(`looking at base: ${process.env.AIRTABLE_BASE}`);
  return new Promise((resolve, reject) => {
    base('CRM')
      .select({
        // maxRecords: 10,
        view: 'Grid view',
      })
      .eachPage(
        async function page(records, fetchNextPage) {
          // This function (`page`) will get called for each page of records.
          await Promise.all(
            records.map(
              throat(1, async (record) => {
                const email = record.get('Email').toLowerCase().trim();
                const emails = [email];
                emails.concat(record.get('Secondary Email') || []);

                const firstName = record.get('First Name');
                const lastName = record.get('Last Name');
                const name = `${firstName} ${lastName}`.toLowerCase();
                const slackJoinedDate = record.get('Slack Joined Date');
                const slackMatch = slackUsers.find((slackUser) => {
                  if (!slackUser.email) {
                    return;
                  }
                  slackEmail = slackUser.email.toLowerCase();
                  slackName =
                    slackUser.real_name && slackUser.real_name.toLowerCase();
                  return emails.includes(slackEmail) || slackName === name;
                });
                // console.log(email, slackJoinedDate, slackMatch);
                if (slackMatch && !slackJoinedDate) {
                  try {
                    await record.updateFields({
                      'Slack Joined Date': slackMatch.updatedDate,
                      'Slack Member ID': slackMatch.id,
                      Slack: 'Joined Slack',
                      'Last updated by Bot': moment().format('YYYY-MM-DD'),
                    });
                    console.log(`updated record for: ${email}`);
                  } catch (err) {
                    console.log(err);
                  }
                }
              })
            )
          );

          // To fetch the next page of records, call `fetchNextPage`.
          // If there are more records, `page` will get called again.
          // If there are no more records, `done` will get called.
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

async function getSlackUsers() {
  const allSlackUsers = [];
  let keep_going = true;
  let cursor = undefined;
  while (keep_going) {
    const { response_metadata, members } = await slack.users.list({ cursor });
    const { next_cursor } = response_metadata;
    console.log(`records: ${members.length}`, `next_cursor: ${next_cursor}`);
    const slackUsers = parseUserResponse(members);
    allSlackUsers.push(...slackUsers);
    keep_going = !!next_cursor;
    cursor = next_cursor;
  }
  return allSlackUsers;
}

exports.handler = async function (_event, context) {
  try {
    console.log('fetching Slack users');
    const slackUsers = await getSlackUsers();
    console.log(`Found ${slackUsers.length} Slack users`);
    console.log('updating Airtable');
    await updateAirtable(slackUsers);
    console.log('Airtable updated');
  } catch (err) {
    console.log(err);
  }
};
