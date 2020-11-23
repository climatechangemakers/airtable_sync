require('dotenv').config()
const {
  WebClient
} = require('@slack/web-api');
const moment = require('moment');
const throat = require('throat');
const _ = require('lodash');
const teams = require('./teams');

const slack = new WebClient(process.env.SLACK_TOKEN);

const base = require('airtable').base(process.env.AIRTABLE_BASE);

// async function getSlackUsers() {
//   const { members } = await slack.users.list();
//   return parseUserResponse(members);
// }

// function parseUserResponse(members) {
//   const shortList = members.map(member => {
//     const { id, profile, name, updated, is_bot } = member;
//     const { email, display_name, real_name } = profile;
//     const updatedDate = moment.unix(updated).format('YYYY-MM-DD');
//     return !is_bot && { id, email, name, real_name, display_name, updatedDate }
//   });
//   return _.compact(shortList);
// }

async function updateAirtable(slackUsers) {
  base('CRM').select({
    // maxRecords: 3,
    view: "Joined Slack"
  }).eachPage(async function page(records, fetchNextPage) {
    // This function (`page`) will get called for each page of records.
    await Promise.all(records.map(throat(1, async (record) => {
      // console.log(record);
      const memberId = record.get('Slack Member ID');
      const lastActiveRecord = record.get('Slack Last Active Date');
      const lastActiveDate = lastActiveRecord ? moment(lastActiveRecord) : undefined;
      if (!lastActiveDate || lastActiveDate < moment().startOf('day')) {
        const { presence } = await slack.users.getPresence({ user: memberId });
        console.log(memberId, lastActiveDate.toDate(), presence);
        if (presence === 'active') {
          await record.updateFields({
            'Slack Last Active Date': moment().format('YYYY-MM-DD'),
            'Last updated by Bot': moment().format('YYYY-MM-DD')
          });
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // wait a bit for rate limit
      }
    })));
    fetchNextPage();

  }, function done(err) {
    if (err) {
      console.error(err);
      return;
    }
  });
}

exports.handler = async function(_event, context) {
  try {
    await updateAirtable();
  } catch (err) {
    console.log(err);
  }
}
