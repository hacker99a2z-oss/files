const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
const axios = require('axios'); // ১. axios যুক্ত করা হলো আইপি ও ভিপিএন চেক করার জন্য
const { Telegraf } = require('telegraf'); 
require('dotenv').config();

const authRoutes = require('./routes/auth');
const User = require('./models/User'); 

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('Server is alive!');
});

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

// ==================== API ENDPOINTS FOR FRONTEND ====================

// নতুন: ইউজারের আইপি চেক করে কান্ট্রি ও ভিপিএন ডিটেক্ট এবং সেভ করার এন্ডপয়েন্ট
app.post('/api/save-user-location', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID required' });

    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (clientIp === '::1' || clientIp === '127.0.0.1') {
      clientIp = ''; // লোকালহস্টে টেস্ট করার সময় আইপি ফাকা রাখা হলো
    }

    let countryName = "Unknown";
    let isVpnOrProxy = false;

    if (clientIp) {
      try {
        const ipResponse = await axios.get(`http://ip-api.com/json/${clientIp}?fields=status,country,proxy,hosting`);
        if (ipResponse.data.status === 'success') {
          countryName = ipResponse.data.country;
          if (ipResponse.data.proxy || ipResponse.data.hosting) {
            isVpnOrProxy = true;
          }
        }
      } catch (ipErr) {
        console.error("IP API error:", ipErr.message);
      }
    }

    // ডাটাবেসে ইউজার আপডেট বা তৈরি করা
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

// ১. ইউজার তথ্য আনবে অথবা না থাকলে ডাটাবেজে তৈরি করবে
app.post('/api/user/sync', async (req, res) => {
  const { telegramId, firstName, username, photoUrl, referrerId } = req.body;

  if (!telegramId) {
    return res.status(400).json({ error: 'Telegram ID required' });
  }

  try {
    let user = await User.findOne({ telegramId }).populate('referrals', 'firstName username photoUrl gamesPlayedForReferral');

    if (!user) {
      user = new User({
        telegramId,
        firstName: firstName || 'User',
        username: username || '',
        photoUrl: photoUrl || '',
        referredBy: referrerId || null,
        country: 'Unknown'
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
      await user.save();
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ৩. গেম খেলে রিওয়ার্ড ক্লেম করা ও রেফারেল বোনাস দেওয়া
app.post('/api/game/reward', async (req, res) => {
  try {
    const { telegramId, coins } = req.body;
    const rewardCoins = Number(coins);

    if (!telegramId || isNaN(rewardCoins)) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
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

// ডেইলি টাইমার এন্ডপয়েন্ট
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

// ==================== 5. DYNAMIC COUNTRY WITHDRAW API (WITH VPN BLOCKER) ====================
app.post('/api/user/withdraw', async (req, res) => {
  try {
    const { telegramId, wallet, amount } = req.body;

    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ error: 'User not found!' });
    }

    // ১. লাইভ ভিপিএন চেক (উইথড্র করার সময় কেউ ভিপিএন অন করলে ব্লক হবে)
    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (clientIp && clientIp !== '::1' && clientIp !== '127.0.0.1') {
      try {
        const ipCheck = await axios.get(`http://ip-api.com/json/${clientIp}?fields=status,proxy,hosting,country`);
        if (ipCheck.data.status === 'success') {
          if (ipCheck.data.proxy || ipCheck.data.hosting) {
            return res.status(403).json({ error: '❌ VPN or Proxy detected! Please disable your VPN to withdraw.' });
          }
          // কান্ট্রি আপডেট করে নেওয়া ভালো
          user.country = ipCheck.data.country;
        }
      } catch (ipErr) {
        console.log("Withdraw IP Check Error:", ipErr.message);
      }
    }

    const reqAmount = parseFloat(amount);
    if (isNaN(reqAmount) || reqAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount entered!' });
    }

    const userBonus = user.bonusBalanceUSD || 0;
    if (userBonus < reqAmount) {
      return res.status(400).json({ error: 'Insufficient Bonus Balance!' });
    }

    // ২. কান্ট্রি অনুযায়ী ডায়নামিক কয়েন রেট নির্ধারণ
    // যে দেশগুলোতে Adsgram-এর ভালো ইনকাম আসে সেখানে কম কয়েন লাগবে (যেমন: ১০০,০০০ কয়েন = ১$)
    // অন্য দেশের জন্য বেশি কয়েন লাগবে (যেমন: ১৫০,০০০ কয়েন = ১$)
    const highIncomeCountries = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France'];
    
    let coinsPerDollar = 150000; // ডিফল্ট বা সাধারণ দেশের জন্য
    if (highIncomeCountries.includes(user.country)) {
      coinsPerDollar = 100000; // ভালো ইনকামের দেশের জন্য
    }

    const requiredCoins = reqAmount * coinsPerDollar;

    if ((user.mainCoins || 0) < requiredCoins) {
      return res.status(400).json({
        error: `Insufficient Main Coins! For your country (${user.country || 'Unknown'}), required: ${requiredCoins.toLocaleString()} Coins for $${reqAmount}.`
      });
    }

    user.bonusBalanceUSD = parseFloat((userBonus - reqAmount).toFixed(2));
    user.mainCoins -= requiredCoins;
    await user.save();

    try {
      const adminMessage = 
        `🚨<b>New Withdraw Request!</b>🚨\n\n` +
        `👤<b>User:</b> ${user.firstName || 'User'} (@${user.username || 'N/A'})\n` +
        `🌍<b>Country:</b> ${user.country || 'Unknown'}\n` +
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
    const topUsers = await User.find({}).sort({ dailyCoins: -1 }).limit(10);
    const prizes = [1, 0.80, 0.50, 0.30, 0.20, 0.10, 0.10, 0.10, 0.10, 0.10];

    for (let i = 0; i < topUsers.length; i++) {
      if (topUsers[i] && topUsers[i].dailyCoins > 0) {
        await User.findByIdAndUpdate(topUsers[i]._id, {
          $inc: { bonusBalanceUSD: prizes[i] }
        });
        console.log(`Prize $${prizes[i]} sent to User: ${topUsers[i].firstName || topUsers[i].username}`);
      }
    }

    await User.updateMany({}, { $set: { dailyCoins: 0 } });
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
