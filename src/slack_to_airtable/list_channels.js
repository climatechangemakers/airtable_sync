require('dotenv').config()
const {
  WebClient
} = require('@slack/web-api');

const slack = new WebClient(process.env.SLACK_TOKEN);

async function listSlackChannels() {
  const { channels } = await slack.conversations.list();
  return channels;
}

async function run() {
  try {
    const slackChannels = await listSlackChannels();
    console.log(JSON.stringify(slackChannels))
  } catch (err) {
    console.log(err);
  }
}

run()
