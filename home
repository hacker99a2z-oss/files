// ১. ডেইলি ফ্রি খেলার লিমিট চেক ও কান্ট্রি সেভ করার জন্য রিকোয়েস্ট
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const lastFreePlayDate = localStorage.getItem('last_free_play_date');
    if (lastFreePlayDate === today) {
      setHasFreePlay(false);
    } else {
      setHasFreePlay(true);
    }

    const savedCooldownTarget = localStorage.getItem('gameCooldownTarget');
    if (savedCooldownTarget) {
      const remaining = Math.ceil((parseInt(savedCooldownTarget) - Date.now()) / 1000);
      if (remaining > 0) {
        setCooldown(remaining);
        setIsCooldownActive(true);
      } else {
        localStorage.removeItem('gameCooldownTarget');
      }
    }

    // নতুন যোগ করুন: অ্যাপ ওপেন হলেই ইউজারের কান্ট্রি ব্যাকএন্ডে সেভ করে নিবে
    const saveUserLocation = async () => {
      try {
        if (user?.telegramId) {
          await fetch(`${BACKEND_URL}/api/save-user-location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.telegramId })
          });
        }
      } catch (err) {
        console.error("Location save error:", err);
      }
    };

    saveUserLocation();
  }, [user]);
