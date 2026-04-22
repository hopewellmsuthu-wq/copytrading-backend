//name of the folder copy-trading-pro//
//create a file inside :server.js
//
npm init -y
npm install express cors body-parser metaapi.cloud-sdk firebase-admin//



const express = require("express");
const cors = require("cors");
const MetaApi = require("metaapi.cloud-sdk").default;

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 YOUR META API TOKEN
const token = "YOUR_META_API_TOKEN";

// MASTER ACCOUNT (YOUR ACCOUNT)
const MASTER_ACCOUNT_ID = "YOUR_MASTER_ACCOUNT_ID";

const api = new MetaApi(token);

// STORE CONNECTED USERS (simple version)
let users = [];

// 🔌 CONNECT USER MT5
app.post("/connect-account", async (req, res) => {
  const { uid, login, password, server } = req.body;

  try {
    const account = await api.metatraderAccountApi.createAccount({
      login,
      password,
      server,
      name: "User " + uid,
      platform: "mt5"
    });

    users.push({
      uid,
      accountId: account.id
    });

    res.json({ message: "✅ MT5 Connected Successfully" });

  } catch (err) {
    res.json({ message: "❌ " + err.message });
  }
});

// 📊 FAKE STATS (we upgrade later)
app.get("/stats", (req, res) => {
  res.json({
    profit: Math.floor(Math.random() * 500),
    loss: Math.floor(Math.random() * 200),
    winRate: Math.floor(Math.random() * 100)
  });
});

// 🚀 COPY TRADING ENGINE
async function startCopyTrading() {

  const account = await api.metatraderAccountApi.getAccount(MASTER_ACCOUNT_ID);

  await account.deploy();
  await account.waitConnected();

  const connection = account.getRPCConnection();
  await connection.connect();

  console.log("🔥 Copy Trading Started");

  connection.on("positions", async (positions) => {

    for (let trade of positions) {

      console.log("New trade:", trade.symbol);

      for (let user of users) {

        try {
          const userAcc = await api.metatraderAccountApi.getAccount(user.accountId);

          const conn = userAcc.getRPCConnection();
          await conn.connect();

          await conn.createMarketBuyOrder(
            trade.symbol,
            trade.volume
          );

          console.log("✅ Copied to user:", user.uid);

        } catch (err) {
          console.log("❌ Copy error:", err.message);
        }
      }
    }
  });
}

// START SERVER
app.listen(3000, () => {
  console.log("🚀 Server running on port 3000");
  startCopyTrading();
});