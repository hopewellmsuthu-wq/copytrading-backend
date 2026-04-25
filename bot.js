const MetaApi = require('metaapi.cloud-sdk').default;
require('dotenv').config();
const mongoose = require('mongoose');

const token = process.env.METAAPI_TOKEN;
const api = new MetaApi(token);

// Same Account schema from index.js
const AccountSchema = new mongoose.Schema({
  userId: String, accountId: String, password: String,
  server: String, name: String, type: String
});
const Account = mongoose.model('Account', AccountSchema);

async function startCopier() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected for bot ✅');

  const master = await Account.findOne({ type: 'master' });
  const slaves = await Account.find({ type: 'slave' });

  if (!master) return console.log('No master found');

  // Connect Master
  const masterAcc = await api.metatraderAccountApi.getAccountByName(master.name);
  if (!masterAcc) {
    const newMaster = await api.metatraderAccountApi.createAccount({
      name: master.name, type: 'cloud', login: master.accountId,
      password: master.password, server: master.server,
      platform: 'mt5', magic: 1000
    });
    await newMaster.deploy();
  }
  
  const masterConnection = (await api.metatraderAccountApi.getAccountByName(master.name)).getStreamingConnection();
  await masterConnection.connect();
  await masterConnection.waitSynchronized();

  // Listen for trades
  masterConnection.addSynchronizationListener({
    async onDealAdded(deal) {
      if (deal.entryType === 'DEAL_ENTRY_IN' && deal.type.includes('DEAL_TYPE')) {
        console.log(`Master trade: ${deal.symbol} ${deal.type} ${deal.volume}`);
        
        for (const slave of slaves) {
          const slaveAcc = await api.metatraderAccountApi.getAccountByName(slave.name);
          const rpc = slaveAcc.getRpcConnection();
          await rpc.connect();
          
          const orderType = deal.type === 'DEAL_TYPE_BUY' ? 'ORDER_TYPE_BUY' : 'ORDER_TYPE_SELL';
          await rpc.createMarketOrder(deal.symbol, orderType, deal.volume);
          console.log(`Copied to ${slave.name} ✅`);
        }
      }
    }
  });
  
  console.log('Copier bot LIVE 🚀 Watching XM Master...');
}

startCopier();
