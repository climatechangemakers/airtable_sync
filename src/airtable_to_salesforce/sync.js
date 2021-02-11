require('dotenv').config();
const airtable = require('airtable');
// const moment = require('moment');
// const throat = require('throat');
// const _ = require('lodash');
const getSalesforceClient = require('./get_client');

// process.env.SALESFORCE_SECURITY_TOKEN

const base = airtable.base(process.env.AIRTABLE_BASE);

async function updateSalesforce(payload) {
  const client = await getSalesforceClient();
  // const results = await client.query('SELECT Id, Name FROM Contact');
  // console.log(JSON.stringify(results));
  await client.sobject('Contact').upsert(payload, 'Airtable_ID__c');
  // console.log(JSON.stringify(updateResults));
}

async function readAirtable() {
  return new Promise((resolve, reject) => {
    base('CRM')
      .select({
        // maxRecords: 20,
        view: 'Grid view',
      })
      .eachPage(
        async function page(records, fetchNextPage) {
          // This function (`page`) will get called for each page of records.
          const payload = records.map((record) => {
            const { id: airtableId } = record;
            const firstName = record.get('First Name');
            const lastName = record.get('Last Name');
            const email = record.get('Email');
            const slackMemberId = record.get('Slack Member ID');
            const slackJoinedDate = record.get('Slack Joined Date');
            const signupDate = record.get('Signup Date');

            return {
              Airtable_ID__c: airtableId,
              FirstName: firstName,
              LastName: lastName,
              // Name: name,
              npe01__HomeEmail__c: email,
              Slack_Member_ID__c: slackMemberId,
              Slack_Joined_Date__c: slackJoinedDate,
              npo02__MembershipJoinDate__c: signupDate,
            };
          });

          console.log(payload.length);

          await updateSalesforce(payload);

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

exports.handler = async function (_event, context) {
  try {
    const client = await getSalesforceClient();
    await readAirtable(client);
  } catch (err) {
    console.log(err);
  }
};
