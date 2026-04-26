const MetaApi = require('metaapi.cloud-sdk').default;
const mongoose = require('mongoose');

const api = new MetaApi(process.env.METAAPI_TOKEN);

const AccountSchema = new mongoose.Schema({
  userId: String, accountId: String, password: String,
  server: String, name: String, type: String
});
const Account = mongoose.model('Account', AccountSchema);

async function start() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Mongo connected');

  const master = await Account.findOne({ type: 'master' });
  const slaves = await Account.find({ type: 'slave' });
  
  console.log(`Found master: ${master.name}, slaves: ${slaves.length}`);
  console.log('Bot ready - add trade listener code next');
}

start().catch(err => console.error('Bot error:', err));
