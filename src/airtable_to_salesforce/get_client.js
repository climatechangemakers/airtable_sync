const jsforce = require('jsforce');

let conn;

module.exports = async function getSalesforceClient() {
  if (conn) {
    return conn;
  } // to avoid creating a new connection every time
  conn = new jsforce.Connection({ maxRequest: 200 });
  // console.log(conn);
  await conn.login(
    'pcothenet@gmail.com',
    process.env.SALESFORCE_PASSWORD + process.env.SALESFORCE_SECURITY_TOKEN
  ); // long-term using a Salesforce app with OAuth would be the best way to log-in
  return conn;
};
