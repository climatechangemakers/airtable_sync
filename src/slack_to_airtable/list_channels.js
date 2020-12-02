require('dotenv').config()
const {
  WebClient
} = require('@slack/web-api');

const slack = new WebClient(process.env.SLACK_TOKEN);

async function listSlackChannels() {
  const { channels } = await slack.conversations.list();
  return channels.filter((elem) => {
    return !elem.is_archived && elem.is_channel && !elem.is_private
  }).map((elem => {
    const { id, name,  } = elem;
    return { id, name }
  }));
}

async function run() {
  try {
    const slackChannels = await listSlackChannels();
    console.log(JSON.stringify(slackChannels, null, 2))
    console.log(slackChannels.reduce((accumulator, currentValue) => {
      return `${accumulator}${currentValue.id},${currentValue.name}\n`;
    }, ''));
  } catch (err) {
    console.log(err);
  }
}

run()
