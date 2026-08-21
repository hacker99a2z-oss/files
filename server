const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
const axios = require('axios');
const { Telegraf } = require('telegraf'); 
require('dotenv').config();

const authRoutes = require('./routes/auth');
const User = require('./models/User'); 

const app = express();
app.set('trust proxy', true);
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('Server is alive!');
});

// ============ MATCH SCHEMA ============
const matchSchema = new mongoose.Schema({
  mode: { type: Number, enum: [2, 4], required: true },
  entryFeeCoins: { type: Number, default: 250 },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  players: [{
    telegramId: String,
    firstName: String,
    hits: { type: Number, default: 0 },
    timeTaken: { type: Number, default: 0 },
    finishedAt: Date,
    prizeUSD: { type: Number, default: 0 }
  }],
  createdAt: { type: Date, default: Date.now }
});

const Match = mongoose.models.Match || mongoose.model('Match', matchSchema);

// ============ TELEGRAM BOT SETUP ============
const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://your-vercel-app.vercel.app';
const CHANNEL_URL = process.env.CHANNEL_URL || 'https://t.me/your_official_channel';
const GROUP_URL = process.env.GROUP_URL || 'https://t.me/your_official_group';
const EXTRA_CHANNEL_URL = process.env.EXTRA_CHANNEL_URL || '';

const bot = new Telegraf(BOT_TOKEN);

const getUsername = (urlOrUsername) => {
  if (!urlOrUsername) return null;
  if (urlOrUsername.startsWith('@')) return urlOrUsername;
  const parts = urlOrUsername.split('/');
  const lastPart = parts[parts.length - 1];
  return lastPart ? `@${lastPart}` : null;
};

bot.start((ctx) => {
  ctx.reply('Welcome! Click below to open the app or join our community:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🎮 Open App', web_app: { url: WEB_APP_URL } }],
        [{ text: '📢 Official Channel', url: CHANNEL_URL }],
        [{ text: '💬 Official Group', url: GROUP_URL }]
      ]
    }
  });
});

if (process.env.BOT_TOKEN) {
  const WEBHOOK_URL = 'https://play-for-win.onrender.com/telegram-webhook';
  bot.telegram.setWebhook(WEBHOOK_URL)
    .then(() => console.log('✅ Webhook Configured Successfully'))
    .catch((err) => console.error('Webhook Error:', err.message));

  app.use(bot.webhookCallback('/telegram-webhook'));
}

app.use('/api/auth', authRoutes);

// Helper function: Client IP & Country Detection (With 3s Timeout)
const getClientIpAndCountry = async (req, frontendIp) => {
  let clientIp = frontendIp || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (clientIp && clientIp.includes(',')) {
    clientIp = clientIp.split(',')[0].trim();
  }

  if (clientIp === '::1' || clientIp === '127.0.0.1' || !clientIp) {
    return { clientIp: '', countryName: 'Unknown', isVpnOrProxy: false };
  }

  try {
    const ipResponse = await axios.get(`http://ip-api.com/json/${clientIp}?fields=status,country,proxy,hosting`, { timeout: 3000 });
    if (ipResponse.data.status === 'success') {
      return {
        clientIp,
        countryName: ipResponse.data.country || 'Unknown',
        isVpnOrProxy: Boolean(ipResponse.data.proxy || ipResponse.data.hosting)
      };
    }
  } catch (err) {
    console.error("IP Check Error:", err.message);
  }

  return { clientIp, countryName: 'Unknown', isVpnOrProxy: false };
};

// ১.১ ডেডিকেটেড কয়েন কাটার API (Fighting.jsx এর জন্য)
app.post('/api/user/deduct-coins', async (req, res) => {
  try {
    const { telegramId, amount } = req.body;
    const user = await User.findOne({ telegramId });

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if ((user.mainCoins || 0) < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient coins' });
    }

    user.mainCoins -= amount;
    await user.save();

    res.json({ success: true, remainingCoins: user.mainCoins });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// Backend Route (Example Fix)
app.post('/api/match/join', async (req, res) => {
  try {
    const { telegramId, firstName, mode } = req.body;

    if (!telegramId) {
      return res.status(400).json({ success: false, error: "Telegram ID is required" });
    }

    // ডাটাবেজ অপারেশন ফেইল যেন না হয়
    let match = await Match.findOne({ status: 'pending', mode: mode });

    if (!match) {
      match = new Match({
        mode: mode,
        status: 'pending',
        players: [{ telegramId, firstName, hits: 0, timeTaken: 0 }]
      });
    } else {
      // প্লেয়ার অলরেডি জয়েন করা আছে কিনা চেক
      const exists = match.players.some(p => String(p.telegramId) === String(telegramId));
      if (!exists) {
        match.players.push({ telegramId, firstName, hits: 0, timeTaken: 0 });
      }
    }

    await match.save();

    return res.status(200).json({ 
      success: true, 
      matchId: match._id 
    });

  } catch (err) {
    console.error("Match join error:", err);
    // সার্ভার ক্র্যাশ আটকাতে সঠিক জেসন মেসেজ
    return res.status(500).json({ 
      success: false, 
      error: "Server internal error! Check Render backend logs." 
    });
  }
});

// ২. POST /api/match/submit-score - স্কোর সাবমিট (FIXED)
app.post('/api/match/submit-score', async (req, res) => {
  try {
    const { matchId, telegramId, hits, timeTaken } = req.body;

    if (!matchId || !telegramId) {
      return res.status(400).json({ error: 'matchId and telegramId required' });
    }

    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    let player = match.players.find(p => String(p.telegramId) === String(telegramId));

    if (player) {
      player.hits = Number(hits) || 0;
      player.timeTaken = Number(timeTaken) || 0;
      player.finishedAt = new Date();
    } else {
      match.players.push({
        telegramId: String(telegramId),
        hits: Number(hits) || 0,
        timeTaken: Number(timeTaken) || 0,
        finishedAt: new Date()
      });
    }

    // সব প্লেয়ার খেলেছে কিনা চেক
    const isFull = match.players.length >= match.mode;
    const allFinished = isFull && match.players.every(p => p.finishedAt);

    if (allFinished) {
      match.status = 'completed';

      match.players.sort((a, b) => {
        if (b.hits !== a.hits) return b.hits - a.hits;
        return (a.timeTaken || 0) - (b.timeTaken || 0);
      });

      // প্রাইজ বন্টন
      if (match.mode === 2) {
        if (match.players[0]) match.players[0].prizeUSD = 0.10;
        if (match.players[1]) match.players[1].prizeUSD = 0.00;
      } else if (match.mode === 4) {
        if (match.players[0]) match.players[0].prizeUSD = 0.10;
        if (match.players[1]) match.players[1].prizeUSD = 0.07;
        if (match.players[2]) match.players[2].prizeUSD = 0.03;
        if (match.players[3]) match.players[3].prizeUSD = 0.00;
      }

      for (const p of match.players) {
        if (p.prizeUSD > 0) {
          await User.findOneAndUpdate(
            { telegramId: p.telegramId },
            { $inc: { bonusBalanceUSD: p.prizeUSD } }
          );
        }
      }
    }

    await match.save();
    res.json({ success: true, match });
  } catch (err) {
    console.error('Submit Score Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ৩. GET /api/match/history/:telegramId - লাস্ট ৫টি ম্যাচের হিস্ট্রি (ENHANCED)
app.get('/api/match/history/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const history = await Match.find({ 'players.telegramId': telegramId })
      .sort({ createdAt: -1 })
      .limit(5);

    // ফ্রন্টএন্ডে পেন্ডিং ম্যাচের সম্ভাব্য হিট এবং প্রাইজ রিড নিশ্চিত করা
    const formattedHistory = history.map(m => {
      const matchObj = m.toObject();
      
      // সম্ভাব্য প্রাইজ পুল (যদি পেন্ডিং থাকে)
      const potentialPrize = matchObj.mode === 2 ? 0.10 : 0.10;

      matchObj.players = matchObj.players.map(p => {
        if (m.status === 'pending' && String(p.telegramId) === String(telegramId)) {
          return {
            ...p,
            prizeUSD: p.prizeUSD > 0 ? p.prizeUSD : potentialPrize
          };
        }
        return p;
      });

      return matchObj;
    });

    res.json(formattedHistory);
  } catch (err) {
    console.error('Match History Error:', err);
    res.status(500).json({ error: 'Server error fetching history' });
  }
});

// ==================== API ENDPOINTS FOR FRONTEND ====================

app.post('/api/save-user-location', async (req, res) => {
  try {
    const { userId, clientIp: frontendIp } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID required' });

    const { countryName, isVpnOrProxy } = await getClientIpAndCountry(req, frontendIp);

    await User.findOneAndUpdate(
      { telegramId: userId },
      { 
        country: countryName, 
        isVpn: isVpnOrProxy, 
        lastLogin: Date.now() 
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, country: countryName, isVpn: isVpnOrProxy });
  } catch (err) {
    console.error("Save Location Error:", err);
    res.status(500).json({ error: 'Server error saving location' });
  }
});

app.post('/api/user/sync', async (req, res) => {
  const { telegramId, firstName, username, photoUrl, referrerId, clientIp: frontendIp } = req.body;

  if (!telegramId) {
    return res.status(400).json({ error: 'Telegram ID required' });
  }

  try {
    const { countryName, isVpnOrProxy } = await getClientIpAndCountry(req, frontendIp);

    let user = await User.findOne({ telegramId }).populate('referrals', 'firstName username photoUrl gamesPlayedForReferral');

    if (!user) {
      user = new User({
        telegramId,
        firstName: firstName || 'User',
        username: username || '',
        photoUrl: photoUrl || '',
        referredBy: referrerId || null,
        country: countryName,
        isVpn: isVpnOrProxy
      });
      await user.save();

      if (referrerId && referrerId !== telegramId) {
        await User.findOneAndUpdate(
          { telegramId: referrerId },
          {
            $inc: { referralCount: 1 },
            $push: { referrals: user._id }
          }
        );
      }
    } else {
      user.firstName = firstName || user.firstName;
      user.username = username || user.username;
      user.photoUrl = photoUrl || user.photoUrl;
      user.country = countryName !== 'Unknown' ? countryName : user.country;
      user.isVpn = isVpnOrProxy;
      await user.save();
    }

    const tier1Countries = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Switzerland', 'Norway', 'Sweden', 'Denmark', 'Netherlands'];
    const tier2Countries = ['United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Singapore', 'Japan', 'South Korea', 'Malaysia', 'Spain', 'Italy', 'Brazil', 'Mexico'];

    let coinsPerDollar = 140000;
    if (tier1Countries.includes(user.country)) {
      coinsPerDollar = 100000;
    } else if (tier2Countries.includes(user.country)) {
      coinsPerDollar = 130000;
    }

    const userResponse = {
      ...user.toObject(),
      coinsPerDollar: coinsPerDollar
    };

    res.json(userResponse);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ৩. গেম খেলে রিওয়ার্ড ক্লেইম (Anti-Cheat Validation Added)
app.post('/api/game/reward', async (req, res) => {
  try {
    const { telegramId, coins } = req.body;
    const rewardCoins = Number(coins);

    if (!telegramId || isNaN(rewardCoins) || rewardCoins <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    // 🔒 Security Check: ১৫ সেকেন্ডে ডাবল এড সহ সর্বোচ্চ ৩০০ কয়েন সম্ভব
    const MAX_ALLOWED_COINS = 300; 
    if (rewardCoins > MAX_ALLOWED_COINS) {
      console.warn(`🚨 Anti-Cheat Triggered for User: ${telegramId}. Attempted coins: ${rewardCoins}`);
      return res.status(403).json({ success: false, message: 'Cheating detected! Reward denied.' });
    }

    let user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.mainCoins = (user.mainCoins || 0) + rewardCoins;
    user.dailyCoins = (user.dailyCoins || 0) + rewardCoins;
    user.gamesPlayedForReferral = (user.gamesPlayedForReferral || 0) + 1;

    if (user.referredBy && user.gamesPlayedForReferral >= 10 && !user.referralBonusGiven) {
      await User.findOneAndUpdate(
        { telegramId: user.referredBy },
        {
          $inc: {
            mainCoins: 1000,
            dailyCoins: 1000
          }
        }
      );
      user.referralBonusGiven = true;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Coins claimed successfully',
      mainCoins: user.mainCoins,
      dailyCoins: user.dailyCoins,
      gamesPlayedForReferral: user.gamesPlayedForReferral
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ৪. AdsGram Webhook Endpoint
app.get('/api/adsgram-reward', async (req, res) => {
  const targetUserId = req.query.userId || req.query.userid;

  if (!targetUserId) {
    return res.status(400).send('User ID missing');
  }

  try {
    let user = await User.findOne({ telegramId: targetUserId });

    if (user) {
      user.adsWatched = (user.adsWatched || 0) + 1;
      await user.save();
      console.log(`✅ Adsgram Ad Verified & Counted for User: ${targetUserId}`);
    }

    return res.status(200).send('OK');
  } catch (err) {
    console.error('AdsGram Webhook Error:', err);
    return res.status(500).send('Internal Server Error');
  }
});

// ৪.২. Monetag Server-to-Server Postback Endpoint
app.get('/api/monetag-postback', async (req, res) => {
  const { sub_id } = req.query;

  if (!sub_id) {
    return res.status(400).send('Missing sub_id (telegramId)');
  }

  try {
    let user = await User.findOne({ telegramId: sub_id });

    if (user) {
      user.adsWatched = (user.adsWatched || 0) + 1;
      await user.save();
      console.log(`✅ Monetag Postback Verified for Telegram ID: ${sub_id}`);
      return res.status(200).send('OK');
    }

    return res.status(404).send('User not found');
  } catch (err) {
    console.error('Monetag Postback Error:', err);
    return res.status(500).send('Internal Server Error');
  }
});

// ডেইলি টাইমার এন্ডপয়েন্ট
app.get('/api/contest/timer', (req, res) => {
  const now = new Date();
  const bdNowStr = now.toLocaleString("en-US", { timeZone: "Asia/Dhaka" });
  const bdNow = new Date(bdNowStr);

  const bdEndOfDay = new Date(bdNowStr);
  bdEndOfDay.setHours(23, 59, 59, 999);

  const difference = bdEndOfDay - bdNow;

  if (difference <= 0) {
    return res.json({ hours: 0, minutes: 0, seconds: 0 });
  }

  res.json({
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  });
});

// ==================== CHECK MEMBERSHIP API ====================
app.post('/api/check-membership', async (req, res) => {
  const { telegramId } = req.body;
  
  if (!telegramId) {
    return res.status(400).json({ error: 'Telegram ID required' });
  }

  const channels = [
    getUsername(CHANNEL_URL),
    getUsername(EXTRA_CHANNEL_URL)
  ].filter(ch => ch !== null);

  try {
    let allJoined = true;
    let membershipStatus = {};

    for (const chatUsername of channels) {
      try {
        const member = await bot.telegram.getChatMember(chatUsername, telegramId);
        const status = member.status;
        if (['member', 'creator', 'administrator'].includes(status)) {
          membershipStatus[chatUsername] = true;
        } else {
          membershipStatus[chatUsername] = false;
          allJoined = false;
        }
      } catch (err) {
        console.error(`Error checking chat ${chatUsername}:`, err.message);
        membershipStatus[chatUsername] = false;
        allJoined = false;
      }
    }

    res.json({ success: true, allJoined, membershipStatus });
  } catch (err) {
    console.error('Membership Check Error:', err);
    res.status(500).json({ error: 'Server error checking membership' });
  }
});

// ==================== 5. 3-TIER DYNAMIC COUNTRY WITHDRAW API ====================
app.post('/api/user/withdraw', async (req, res) => {
  try {
    const { telegramId, wallet, amount } = req.body;

    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ error: 'User not found!' });
    }

    const { countryName, isVpnOrProxy } = await getClientIpAndCountry(req);
    if (isVpnOrProxy) {
      return res.status(403).json({ error: '❌ VPN or Proxy detected! Please disable your VPN to withdraw.' });
    }

    if (countryName !== 'Unknown') {
      user.country = countryName;
    }

    const reqAmount = parseFloat(amount);
    if (isNaN(reqAmount) || reqAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount entered!' });
    }

    const userBonus = user.bonusBalanceUSD || 0;
    if (userBonus < reqAmount) {
      return res.status(400).json({ error: 'Insufficient Bonus Balance!' });
    }

    const tier1Countries = [
      'United States', 'United Kingdom', 'Canada', 'Australia', 
      'Germany', 'France', 'Switzerland', 'Norway', 'Sweden', 'Denmark', 'Netherlands'
    ];

    const tier2Countries = [
      'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Kuwait', 
      'Singapore', 'Japan', 'South Korea', 'Malaysia', 'Spain', 'Italy', 'Brazil', 'Mexico'
    ];

    let coinsPerDollar = 140000;
    let userTier = "Tier 3";

    if (tier1Countries.includes(user.country)) {
      coinsPerDollar = 100000;
      userTier = "Tier 1";
    } else if (tier2Countries.includes(user.country)) {
      coinsPerDollar = 130000;
      userTier = "Tier 2";
    }

    const requiredCoins = reqAmount * coinsPerDollar;

    if ((user.mainCoins || 0) < requiredCoins) {
      return res.status(400).json({
        error: `Insufficient Main Coins! For your country (${user.country || 'Unknown'} - ${userTier}), required: ${requiredCoins.toLocaleString()} Coins for $${reqAmount}.`
      });
    }

    user.bonusBalanceUSD = parseFloat((userBonus - reqAmount).toFixed(2));
    user.mainCoins -= requiredCoins;
    await user.save();

    try {
      const adminMessage = 
        `🚨<b>New Withdraw Request!</b>🚨\n\n` +
        `👤<b>User:</b> ${user.firstName || 'User'} (@${user.username || 'N/A'})\n` +
        `🌍<b>Country:</b> ${user.country || 'Unknown'} (${userTier})\n` +
        `🆔<b>Telegram ID:</b> <code>${telegramId}</code>\n` +
        `💵<b>Withdraw Amount:</b> $${reqAmount}\n` +
        `🔥<b>Coins Fee Deducted:</b> ${requiredCoins.toLocaleString()} (${coinsPerDollar.toLocaleString()}/$)\n` +
        `💎<b>TON Wallet:</b> <code>${wallet}</code>`;

      const adminChatId = process.env.ADMIN_CHAT_ID;
      if (adminChatId) {
        await bot.telegram.sendMessage(adminChatId, adminMessage, { parse_mode: 'HTML' });
      }
    } catch (telegramErr) {
      console.error('Telegram Notification Error:', telegramErr.message);
    }

    return res.json({ success: true, message: 'Withdraw request submitted successfully!' });

  } catch (error) {
    console.error('Withdraw API Error:', error);
    return res.status(500).json({ error: 'Something went wrong. Try again!' });
  }
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ==================== DAILY CONTEST RESET ====================
cron.schedule('0 0 * * *', async () => {
  console.log('🏆 Running Daily Contest Reset & Distributing Prizes...');
  try {
    const topUsers = await User.find({ dailyCoins: { $gt: 0 } }).sort({ dailyCoins: -1 }).limit(10);
    const prizes = [1, 0.80, 0.50, 0.30, 0.20, 0.10, 0.10, 0.10, 0.10, 0.10];

    for (let i = 0; i < topUsers.length; i++) {
      if (topUsers[i] && topUsers[i].dailyCoins > 0) {
        await User.findByIdAndUpdate(topUsers[i]._id, {
          $inc: { bonusBalanceUSD: prizes[i] }
        });
        console.log(`Prize $${prizes[i]} sent to User: ${topUsers[i].firstName || topUsers[i].username}`);
      }
    }

    await User.updateMany({ dailyCoins: { $gt: 0 } }, { $set: { dailyCoins: 0 } });
    console.log('✅ Daily Contest Reset Successfully!');

  } catch (error) {
    console.error('❌ Reset Error:', error);
  }
}, {
  scheduled: true,
  timezone: "Asia/Dhaka"
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
