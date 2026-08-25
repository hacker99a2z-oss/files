      /*
      if (window.Adsgram) {
        try {
          const AdController = window.Adsgram.init({
            blockId: "41655",
            userId: String(currentTelegramId)
          });

          // Adsgram থেকে ডিরেক্ট ইম্প্রেশন/সাফল্যের রেজাল্ট চেক
          AdController.show()
            .then(async (result) => {
              // 🛑 কেবল Adsgram ডিরেক্ট 'done: true' (Impression Counted) দিলেই ভেতরে ঢুকবে
              if (result && result.done === true) {
                try {
                  await new Promise((res) => setTimeout(res, 500));

                  // 🟢 টেলিগ্রামের অরিজিনাল এনক্রিপ্টেড র-স্ট্রিং
                  const rawInitData = window.Telegram?.WebApp?.initData || "";
                  
                  // সার্ভারে কল করে কনফার্ম করা
                  const response = await fetch(`${BACKEND_URL}/api/adsgram-verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      telegramId: currentTelegramId,
                      initData: rawInitData
                    })
                  });
                  
                  const data = await response.json();

                  if (data && data.success && data.verified) {
                    resolve(true); // ✅ ইম্প্রেশন সফল ও সার্ভার ভেরিফাইড -> গেম/কয়েন ডাবল এলাউড
                  } else {
                    alert("❌ Server verification failed!");
                    resolve(false);
                  }
                } catch (err) {
                  console.error("Adsgram verification error:", err);
                  alert("❌ Network Error: Could not verify ad with server.");
                  resolve(false);
                }
              } else {
                // ❌ যদি ইউজার অ্যাড স্কিপ করে, কেটে দেয় বা ইম্প্রেশন না হয়
                alert("❌ Ad impression failed or closed early. Action cancelled!");
                resolve(false);
              }
            })
            .catch((err) => {
              console.error("Adsgram Error:", err);
              alert("❌ Unable to load Ad or Adblocker detected!");
              resolve(false);
            });
        } catch (error) {
          console.error("Adsgram Init Error:", error);
          alert("❌ Failed to trigger Ad network.");
          resolve(false);
        }
      } else {
        alert("⚠️ Ad Network failed to load! Check your internet or disable AdBlocker.");
        resolve(false);
      }
      */
