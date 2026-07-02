const User = require('../models/User');
const Income = require('../models/Income');

const seedIncomeRecords = async () => {
  try {
    const count = await Income.countDocuments();
    if (count > 0) {
      console.log('Income records already exist. Skipping seed.');
      return;
    }

    const users = await User.find({});
    if (users.length === 0) {
      console.log('No users found to seed income records.');
      return;
    }

    const seedRecords = [];
    const now = new Date();

    for (const user of users) {
      // Calculate daily yield based on plan
      const dailyYield = user.plan === "VIP 2" ? 41 : (user.plan === "VIP 1" ? 20 : 12);
      const planName = user.plan && user.plan !== "None" ? user.plan : "VIP 1";
      
      for (let i = 0; i < 3; i++) {
        const recordDate = new Date();
        recordDate.setDate(now.getDate() - i);
        // Set fixed hour for clean date string formatting
        recordDate.setHours(14, 0, 0, 0);
        
        seedRecords.push({
          userId: user._id,
          userPhone: user.phoneNumber,
          source: `${planName} Daily Yield`,
          amount: dailyYield,
          createdAt: recordDate,
          updatedAt: recordDate
        });
      }
    }

    if (seedRecords.length > 0) {
      await Income.insertMany(seedRecords);
      console.log(`Seeded ${seedRecords.length} income records successfully.`);
    }
  } catch (error) {
    console.error('Error seeding income records:', error);
  }
};

module.exports = seedIncomeRecords;
