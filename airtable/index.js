require('dotenv').config()

const base = require('airtable').base('appjZXvwjqvNgGjbU');
const fs = require('fs').promises;
const moment = require('moment');

async function backupAirtable() {
  const allRecords = [];
  await base('CRM').select({
    // maxRecords: 3,
    pageSize: 100,
    view: "Grid view"
  }).eachPage(async function page(records, fetchNextPage) {
    console.log('page');
    // This function (`page`) will get called for each page of records.

    records.forEach((record) => {
      const { id, fields } = record;
      allRecords.push({ id, fields });
    });

    // To fetch the next page of records, call `fetchNextPage`.
    // If there are more records, `page` will get called again.
    // If there are no more records, `done` will get called.
    fetchNextPage();
  });
  console.log(allRecords);
  const fileName = `backups/${moment().format('YYYY-MM-DD')}.json`;
  fs.writeFile(fileName, JSON.stringify(allRecords));
}

async function run() {
  try {
    await backupAirtable();
  } catch (err) {
    console.log(err);
  }
}

run()
