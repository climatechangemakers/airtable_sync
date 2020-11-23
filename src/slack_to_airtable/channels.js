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


async function getChannelMemberships() {
  const channelMembership = { };
  const teamIds = Object.keys(teams);
  await Promise.all(teamIds.map(throat(1, async (teamId) => {
    const teamName = teams[teamId];
    console.log(`fetching team ${teamName}`);
    const { members } = await slack.conversations.members({ channel: teamId });
    channelMembership[teamName] = members;
  })));
  return channelMembership;
}

function getMembershipMap(slackUsers, channelMembership) {
  const membershipMap = {}
  slackUsers.forEach((slackUser) => {
    const teamsForThisUser = [];
    Object.values(teams).forEach((teamName) => {
      const channelMembers = channelMembership[teamName];
      const isInTeam = channelMembers.find(elem => {
        return elem === slackUser.id
      });
      // console.log(slackUser.id, slackUser.email, teamName, isInTeam);
      if (isInTeam) {
        teamsForThisUser.push(teamName)
      }
    })
    membershipMap[slackUser.id] = teamsForThisUser
  });
  return membershipMap;
}

async function updateAirtable(slackUsers, membershipMap) {
  // console.log(JSON.stringify(slackUsers));
  base('CRM').select({
    // Selecting the first 3 records in Grid view:
    // maxRecords: 100,
    view: "Grid view"
  }).eachPage(async function page(records, fetchNextPage) {
    // This function (`page`) will get called for each page of records.
    await Promise.all(records.map(throat(1, async (record) => {
      // console.log(record);
      const email = record.get('Email');
      const name = `${record.get('First Name')} ${record.get('Last Name')}`
      const slackJoinedDate = record.get('Slack Joined Date');
      // console.log(email,name)
      const slackMatch = slackUsers.find(slackUser => {
        if (!slackUser.email) { return; }
        return slackUser.email.toLowerCase() === email.toLowerCase().trim()
          || (slackUser.real_name && slackUser.real_name.toLowerCase()) === name.toLowerCase();
      });
      if (slackMatch && !slackJoinedDate) {
        console.log(email, slackJoinedDate, slackMatch);
        try {
          await record.updateFields({
            'Slack Joined Date': slackMatch.updatedDate,
            'Slack Member ID': slackMatch.id,
            'Slack': 'Joined',
            'Last updated by Bot': moment().format('YYYY-MM-DD')
          })
        } catch (err) {
          console.log(err);
        }
      }
      // const slackMemberId = record.get('Slack Member ID');
      // if (slackMemberId) {
      //   const existingTeams = record.get('Team') || [];
      //   const newTeams = membershipMap[slackMemberId];
      //   // only update if the new list of teams is different from the old list of teams
      //   if (!_.isEqual(existingTeams.sort(), newTeams.sort())) {
      //     try {
      //       await record.updateFields({
      //         'Team': newTeams,
      //         'Last updated by Bot': moment().format('YYYY-MM-DD')
      //       })
      //     } catch (err) {
      //       console.log(err);
      //     }
      //   }
      // }
    })));

    // To fetch the next page of records, call `fetchNextPage`.
    // If there are more records, `page` will get called again.
    // If there are no more records, `done` will get called.
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
    const slackUsers = await getSlackUsers();
    console.log(slackUsers);
    // const channelMembers = await getChannelMemberships();
    // const membershipMap = getMembershipMap(slackUsers, channelMembers);
    // await updateAirtable(slackUsers, membershipMap);
    await updateAirtable(slackUsers);
  } catch (err) {
    console.log(err);
  }
}
