
var serverlessSDK = require('./serverless_sdk/index.js');
serverlessSDK = new serverlessSDK({
  orgId: 'climatechangemakers',
  applicationName: 'airtable-sync',
  appUid: 'qqrv5hTHnYFf9c7sxz',
  orgUid: '3e16bb97-23f5-480a-a83e-406ec3726229',
  deploymentUid: '0111bf56-fb72-460c-9397-19ff5aa961d8',
  serviceName: 'slack-to-airtable',
  shouldLogMeta: true,
  shouldCompressLogs: true,
  disableAwsSpans: false,
  disableHttpSpans: false,
  stageName: 'dev',
  serverlessPlatformStage: 'prod',
  devModeEnabled: false,
  accessKey: null,
  pluginVersion: '6.2.2',
  disableFrameworksInstrumentation: false
});

const handlerWrapperArgs = { functionName: 'slack-to-airtable-dev-sync', timeout: 60 };

try {
  const userHandler = require('./src/sync.js');
  module.exports.handler = serverlessSDK.handler(userHandler.handler, handlerWrapperArgs);
} catch (error) {
  module.exports.handler = serverlessSDK.handler(() => { throw error }, handlerWrapperArgs);
}