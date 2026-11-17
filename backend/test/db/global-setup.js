const { prepareTestDatabase } = require('./setup-test-db');

module.exports = async () => {
  await prepareTestDatabase(console.log);
};
