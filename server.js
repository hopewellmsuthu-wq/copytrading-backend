const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const MetaApi = require('metaapi.cloud-sdk').default;
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected ✅'))
  .catch(err => console.log('MongoDB error:', err));

// User Model
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'slave' }, // 'master' or 'slave'
  mt5AccountId: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// Basic route
app.get('/', (req, res) => {
  res.send('Copy Trading API is running');
});

// REGISTER - Create new user
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      role: role || 'slave'
    });
    
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN - Get JWT token
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    
    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        email: user.email, 
        role: user.role 
      } 
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});




         // Initialize MetaAPI
const metaApi = new MetaApi(process.env.META_API_TOKEN);

// Middleware to check JWT token
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.userId);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// CONNECT MT5 ACCOUNT
app.post('/api/connect-account', auth, async (req, res) => {
  try {
    const { mt5Login, mt5Password, serverName } = req.body;
    
    // Create account in MetaAPI
    const account = await metaApi.metatraderAccountApi.createAccount({
      name: req.user.email,
      type: 'cloud',
      login:98391354 ,
      password: Sikhulu@1,
      server:XMGlobal-MT5 5 , // Example: 'XMGlobal-MT5'
      platform: 'mt5',
      application: 'MetaApi',
      magic: 1000
    });
    
    // Deploy account
    await account.deploy();
    await account.waitConnected();
    
    // Save account ID to user
    req.user.mt5AccountId = account.id;
    await req.user.save();
    
    res.json({ 
      message: 'MT5 connected successfully',
      accountId: account.id 
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET ACCOUNT INFO
app.get('/api/account-info', auth, async (req, res) => {
  try {
    if (!req.user.mt5AccountId) {
      return res.status(400).json({ error: 'No MT5 account connected' });
    }
    
    const account = await metaApi.metatraderAccountApi.getAccount(req.user.mt5AccountId);
    const connection = account.getRPCConnection();
    await connection.connect();
    await connection.waitSynchronized();
    
    const accountInfo = await connection.getAccountInformation();
    res.json(accountInfo);
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
  
