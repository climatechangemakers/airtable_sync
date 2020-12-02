require('dotenv').config()
const {
  WebClient
} = require('@slack/web-api');
const moment = require('moment');
const throat = require('throat');
const _ = require('lodash');

const slack = new WebClient(process.env.SLACK_TOKEN);
const base = require('airtable').base(process.env.AIRTABLE_BASE);

const teams = {};

async function getSlackUsers() {
  const { members } = await slack.users.list();
  return parseUserResponse(members);
}

function parseUserResponse(members) {
  const shortList = members.map(member => {
    const { id, profile, name, updated, is_bot } = member;
    const { email, display_name, real_name } = profile;
    const updatedDate = moment.unix(updated).format('YYYY-MM-DD');
    return !is_bot && { id, email, name, real_name, display_name, updatedDate }
  });
  return _.compact(shortList);
}

async function getTeamsFromAirtable() {
  if (Object.keys(teams).length) { return teams } // return teams is already cached
  await new Promise((resolve, reject) => {
    base('Teams')
      .select({ view: "Grid view"})
      .eachPage(async function page(records, fetchNextPage) {
      // This function (`page`) will get called for each page of records.
      records.forEach(record => {
        const { id } = record;
        const sync = record.get('Sync');
        if (sync) {
          const name = record.get('Slack Team Name');
          const slackTeamId = record.get('Slack Team ID');
          teams[slackTeamId] = { name, id };
        };
      });
      fetchNextPage();
    }, function done(err) {
      return err ? reject(err) : resolve();
    });
  })
  return teams;
}

async function getSlackMembersForATeam(channel) {
  let allMembers = [];
  // doc for pagination here: https://slack.dev/node-slack-sdk/web-api#pagination
  for await (const page of slack.paginate('conversations.members', { channel })) {
    const { members } = page;
    console.log(members.length);
    allMembers = allMembers.concat(members);
  }
  console.log(allMembers.length);
  return allMembers;
}

async function getChannelMemberships() {
  const channelMembership = { };
  const teams = await getTeamsFromAirtable();
  console.log(teams);
  const slackTeamIds = Object.keys(teams);
  await Promise.all(slackTeamIds.map(throat(1, async (slackTeamId) => {
    const { id, name } = teams[slackTeamId];
    console.log(`fetching team ${name}`);
    const members = await getSlackMembersForATeam(slackTeamId);
    channelMembership[id] = members;
  })));
  return channelMembership;
}

async function getMembershipMap(slackUsers, channelMembership) {
  // console.log(channelMembership);
  const membershipMap = {}
  const teams = await getTeamsFromAirtable();
  slackUsers.forEach((slackUser) => {
    const teamsForThisUser = [];
    Object.values(teams).forEach(({ id: teamAirtableId }) => {
      const channelMembers = channelMembership[teamAirtableId];
      const isInTeam = channelMembers.find(elem => elem === slackUser.id);
      if (isInTeam) {
        teamsForThisUser.push(teamAirtableId)
      }
    })
    membershipMap[slackUser.id] = teamsForThisUser
  });
  return membershipMap;
}

async function updateAirtable(slackUsers, membershipMap) {
  return new Promise((resolve, reject) => {
    base('CRM').select({ view: "Grid view"})
      .eachPage(async function page(records, fetchNextPage) {
      // This function (`page`) will get called for each page of records.
      await Promise.all(records.map(throat(1, async (record) => {
        // console.log(record);
        const slackMemberId = record.get('Slack Member ID');
        if (slackMemberId) {
          const existingTeams = record.get('Teams') || [];
          const newTeams = membershipMap[slackMemberId];
          // only update if the new list of teams is different from the old list of teams
          if (!_.isEqual(existingTeams.sort(), newTeams.sort())) {
            console.log(`update ${slackMemberId}`);
            try {
              await record.updateFields({
                'Teams': newTeams,
                'Last updated by Bot': moment().format('YYYY-MM-DD')
              })
            } catch (err) {
              console.log(err);
            }
          }
        }
      })));
      fetchNextPage();
    }, function done(err) {
      return err ? reject(err) : resolve();
    });
  });

}

exports.handler = async function(_event, context) {
  try {
    const slackUsers = await getSlackUsers();
    const channelMembers = await getChannelMemberships();
    const membershipMap = await getMembershipMap(slackUsers, channelMembers);
    await updateAirtable(slackUsers, membershipMap);
  } catch (err) {
    console.log(err);
  }
}
