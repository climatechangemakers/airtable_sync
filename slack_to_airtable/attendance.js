require('dotenv').config();
const { WebClient } = require('@slack/web-api');
const moment = require('moment');
const throat = require('throat');
const _ = require('lodash');
const hoursOfAction = require('./data/hours');

const base = require('airtable').base(process.env.AIRTABLE_BASE);

const teams = {};

async function updateAirtable() {
  return new Promise((resolve, reject) => {
    base('CRM')
      .select({ view: 'Grid view' })
      .eachPage(
        async function page(records, fetchNextPage) {
          // This function (`page`) will get called for each page of records.
          await Promise.all(
            records.map(
              throat(1, async (record) => {
                // console.log(record);
                const email = record.get('Email');
                const hasHourOfAction = hoursOfAction.includes(email);
                console.log(email, hasHourOfAction);
                if (hasHourOfAction) {
                  try {
                    await record.updateFields({
                      'Has Joined HoA': true,
                      'Last updated by Bot': moment().format('YYYY-MM-DD'),
                    });
                  } catch (err) {
                    console.log(err);
                  }
                }
              })
            )
          );
          fetchNextPage();
        },
        function done(err) {
          return err ? reject(err) : resolve();
        }
      );
  });
}

exports.handler = async function (_event, context) {
  try {
    await updateAirtable();
  } catch (err) {
    console.log(err);
  }
};

exports.handler();
