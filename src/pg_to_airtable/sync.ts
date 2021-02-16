require('dotenv').config();
import { getPostgresClient } from './pg';
const airtable = require('airtable');
import throat from 'throat';

const base = airtable.base(process.env.AIRTABLE_BASE);

const DEFAULT_SEGMENT = '0 - Inactive (0 in past 2 months)';

// map the SQL values to the Airtable values
const SEGMENT_MAPPING: { [key: string]: string } = {
  regular: '3 - Regular (2 in past 1 month)',
  inconsistent: '2 - Inconsistent (1 in past 1 month)',
  inactive: DEFAULT_SEGMENT,
  dormant: '1 - Dormant (0 in past 1 month, but 1+ in prev. month)',
  super: '4 - Super (3-4 in past 1 month)',
};

async function getSegment(airtable_id: string) {
  const pg = await getPostgresClient();
  const query = `SELECT segment FROM analysis.hoa_segments WHERE airtable_id = $1;`;
  const { rows } = await pg.query(query, [airtable_id]);
  const { segment: rawSegment } = rows[0];
  const segment = SEGMENT_MAPPING[rawSegment] || DEFAULT_SEGMENT;
  return segment;
}

async function updateSegment(record: any) {
  const { id: airtable_id } = record;
  const segment = await getSegment(airtable_id);
  if (!segment) {
    return;
  }
  // update the record in Airtable
  try {
    await record.updateFields({
      'HoA Active Segment': segment,
    });
    console.log(`updated record ${airtable_id}`);
  } catch (err) {
    console.log(err);
  }

  // console.log(`Updated 1 record`);
}

async function syncAirtable() {
  return new Promise((resolve, reject) => {
    base('CRM')
      .select({
        // maxRecords: 10,
        view: 'Grid view',
      })
      .eachPage(
        async function page(records: any, fetchNextPage: Function) {
          // This function (`page`) will get called for each page of records.
          await Promise.all(
            records.map(
              throat(5, async (record: any) => {
                await updateSegment(record);
              })
            )
          );

          // To fetch the next page of records, call `fetchNextPage`.
          // If there are more records, `page` will get called again.
          // If there are no more records, `done` will get called.
          fetchNextPage();
        },
        function done(err: Error) {
          if (err) {
            return reject(err);
          }
          return resolve(null);
        }
      );
  });
}

export async function handler(_event: any, context: any) {
  context.callbackWaitsForEmptyEventLoop = false;
  await syncAirtable();
  const client = await getPostgresClient();
  await client.end();
  return 'success';
}
