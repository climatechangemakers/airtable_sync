import { Pool } from 'pg';

let pool: Pool;

// this is a simple implementation
// a complete implementation would have sensible pool config, retrieving the password from a secrets manager, etc..
export async function getPostgresClient(): Promise<Pool> {
  if (pool) {
    return pool;
  }
  // in this example, the db parameter are in environment variables
  // a more robust implementation would fetch the password from a secrets store
  const poolConfig = {};
  pool = new Pool(poolConfig);
  pool.on('error', (err: Error) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  });
  // await pool.connect();
  return pool;
}
