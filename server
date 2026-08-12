// ৩টি টায়ার অনুযায়ী ইউজারের কয়েন রেট হিসাব করা
    const tier1Countries = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Switzerland', 'Norway', 'Sweden', 'Denmark', 'Netherlands'];
    const tier2Countries = ['United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Singapore', 'Japan', 'South Korea', 'Malaysia', 'Spain', 'Italy', 'Brazil', 'Mexico'];

    let coinsPerDollar = 160000;
    if (tier1Countries.includes(user.country)) {
      coinsPerDollar = 100000;
    } else if (tier2Countries.includes(user.country)) {
      coinsPerDollar = 130000;
    }

    // ইউজার অবজেক্টের সাথে কয়েন রেটটিও ফ্রন্টএন্ডে পাঠিয়ে দেওয়া
    const userResponse = {
      ...user.toObject(),
      coinsPerDollar: coinsPerDollar
    };

    res.json(userResponse);
