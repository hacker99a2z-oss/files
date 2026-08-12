import React, { useState } from 'react';

export default function Withdraw({ user, BACKEND_URL, refreshUser }) {
  const [wallet, setWallet] = useState('');
  const [amount, setAmount] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState({});
  const [loading, setLoading] = useState(false);

  // ১. ইউজারের কান্ট্রি অনুযায়ী কয়েন রেট নির্ধারণ (ব্যাকএন্ডের লজিকের সাথে মিল রেখে)
  const getCoinsPerDollar = (country) => {
    const tier1Countries = [
      'United States', 'United Kingdom', 'Canada', 'Australia', 
      'Germany', 'France', 'Switzerland', 'Norway', 'Sweden', 'Denmark', 'Netherlands'
    ];
    const tier2Countries = [
      'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Kuwait', 
      'Singapore', 'Japan', 'South Korea', 'Malaysia', 'Spain', 'Italy', 'Brazil', 'Mexico'
    ];

    if (tier1Countries.includes(country)) return 100000;
    if (tier2Countries.includes(country)) return 130000;
    return 160000; // Tier 3 / Default (যেমন: বাংলাদেশ, ভারত ইত্যাদি)
  };

  const coinsRate = getCoinsPerDollar(user?.country);
  const parsedAmount = parseFloat(amount) || 0;
  const calculatedRequiredCoins = parsedAmount * coinsRate;

  // ২. মেম্বারশিপ চেক করার আলাদা ফাংশন (শুধু চেক করবে)
  const checkMembershipOnly = async () => {
    setLoading(true);
    try {
      const res = await fetch(`https://play-for-win.onrender.com/api/check-membership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: user?.telegramId })
      });
      const data = await res.json();
      if (data.success) {
        setMembershipStatus(data.membershipStatus);
        if (data.allJoined) {
          alert("✅ All joined! You can now close this and withdraw.");
        }
      } else {
        alert("Failed to verify.");
      }
    } catch (err) {
      alert("Error checking membership!");
    } finally {
      setLoading(false);
    }
  };

  // ৩. মূল উইথড্র বাটনের হ্যান্ডেলার
  const handleWithdrawClick = async (e) => {
    e.preventDefault();
    if (!wallet) {
      alert("Please enter your TON Wallet Address!");
      return;
    }

    if (!amount) {
      alert("Please enter amount!");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`https://play-for-win.onrender.com/api/check-membership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: user?.telegramId })
      });
      const data = await res.json();

      if (data.success && data.allJoined) {
        executeWithdraw();
      } else {
        setMembershipStatus(data.membershipStatus);
        setShowPopup(true);
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
    }
  };

  const executeWithdraw = async () => {
    try {
      const res = await fetch(`https://play-for-win.onrender.com/api/user/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: user?.telegramId, wallet, amount })
      });
      const data = await res.json();
      if (res.ok) {
        alert("✅ Withdraw Request Submitted Successfully!");
        setWallet('');
        setAmount('');
        setShowPopup(false);
        if (refreshUser) refreshUser();
        else window.location.reload();
      } else {
        alert(`❌ ${data.error}`);
      }
    } catch (err) {
      alert("❌ Something went wrong. Try again!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 text-white flex flex-col gap-4">
      {/* Balance Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900 border border-gray-800 p-3 rounded-2xl">
          <p className="text-[11px] text-gray-400">Bonus Balance</p>
          <p className="text-lg font-bold text-emerald-400">${user?.bonusBalanceUSD ? Number(user.bonusBalanceUSD).toFixed(2) : "0.00"}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-3 rounded-2xl">
          <p className="text-[11px] text-gray-400">Main Coins</p>
          <p className="text-lg font-bold text-yellow-400">{user?.mainCoins?.toLocaleString() || 0}</p>
        </div>
      </div>

      {/* Withdraw Form */}
      <form onSubmit={handleWithdrawClick} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col gap-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Network</label>
          <input type="text" value="TON Network" disabled className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-xs text-gray-300 font-semibold" />
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">TON Wallet Address</label>
          <input 
            type="text" 
            placeholder="Enter TON Wallet Address" 
            value={wallet} 
            onChange={(e) => setWallet(e.target.value)}
            required
            className="w-full bg-white text-black font-bold text-base p-3 border border-gray-800 rounded-xl outline-none focus:border-yellow-500"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Enter Amount ($)</label>
          <input 
            type="number" 
            step="0.1"
            placeholder="e.g. 0.5" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-full bg-white text-black font-bold text-base p-3 border border-gray-800 rounded-xl outline-none focus:border-yellow-500"
          />
        </div>

        {/* Dynamic Withdrawal Fee & Calculation based on Country */}
        <div className="bg-gray-950 p-3 rounded-xl border border-gray-800 text-[11px] text-gray-400 flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-yellow-400 font-bold border-b border-gray-800 pb-1.5">
            <span>📌 Country & Rate:</span>
            <span className="text-emerald-400">{user?.country || 'Unknown'} ({coinsRate.toLocaleString()} Coins/$1)</span>
          </div>
          <div className="flex justify-between items-center pt-1">
            <span>Required Coins for this withdraw:</span>
            <span className="text-white font-bold text-xs">{calculatedRequiredCoins.toLocaleString()} Coins</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: '#10b981',
            color: '#000000',
            padding: '12px 24px',
            borderRadius: '12px',
            width: '100%',
            fontWeight: 'bold',
            fontSize: '16px',
            border: 'none',
            cursor: 'pointer',
            marginTop: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {loading ? "Checking Membership..." : "💸 Withdraw Funds"}
        </button>

        <p className="text-[11px] text-amber-400/90 text-center mt-3 px-2 leading-relaxed font-medium bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
          ⚠️ <b>Note:</b> You must join our Official Channels & Group before withdrawing. Requests from non-members will be cancelled.
        </p>
      </form>

      {/* Support & Payment Proof Links */}
      <div className="flex flex-col items-center gap-2 mt-4 text-xs">
        <a href="https://t.me/earners_1b" target="_blank" rel="noreferrer" className="text-center text-xs text-blue-400 hover:underline">
          💬 Contact Support
        </a>
        <a href="https://t.me/payment_proofs_for" target="_blank" rel="noreferrer" className="text-center text-xs text-blue-400 hover:underline">
          📢 Payment's Proofs
        </a>
      </div>

      {/* পপ-আপ মডাল */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-sm rounded-2xl p-5 relative">
            
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-3 right-4 text-gray-400 hover:text-white text-xl font-bold"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-amber-400 mb-1 text-center">Join Required</h3>
            <p className="text-xs text-gray-400 text-center mb-4">Please join all communities to unlock withdraw.</p>

            <div className="flex flex-col gap-3">
              {Object.entries(membershipStatus).map(([chatUsername, isJoined]) => (
                <div key={chatUsername} className="flex justify-between items-center bg-gray-950 p-3 rounded-xl border border-gray-800">
                  <span className="text-xs font-medium text-gray-300">{chatUsername}</span>
                  {isJoined ? (
                    <span 
                      style={{ backgroundColor: '#10b981', color: '#ffffff' }}
                      className="font-bold text-xs px-4 py-1.5 rounded-lg inline-block text-center"
                    >
                      Done
                    </span>
                  ) : (
                    <a
                      href={`https://t.me/${chatUsername.replace('@', '')}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
                      className="text-xs px-4 py-1.5 rounded-lg font-bold shadow-md inline-block text-center hover:opacity-90"
                    >
                      Join
                    </a>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={checkMembershipOnly}
              style={{ backgroundColor: '#10b981', color: '#000000' }}
              className="w-full mt-5 py-3 font-bold rounded-xl text-sm shadow-lg hover:opacity-90 cursor-pointer"
            >
              {loading ? "Checking..." : "Check"}
            </button>

          </div>
        </div>
      )}
    </div>
  );
}
