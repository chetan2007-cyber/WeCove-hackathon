require('dotenv').config();
const mongoose = require('mongoose');

// Import your models (make sure these paths match your actual folders!)
const User = require('./models/User'); // Assuming you have a User model
const GameResult = require('./models/GameResult');
const CognitiveMetric = require('./models/CognitiveMetric');
const Reminder = require('./models/Reminder');
const CaregiverNote = require('./models/CaregiverNote');
const MemoryItem = require('./models/MemoryItem');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/miri-db')
  .then(() => console.log('📦 Connected to MongoDB for Seeding...'))
  .catch(err => console.error('MongoDB connection error:', err));

const seedDatabase = async () => {
  try {
    console.log('🧹 Clearing old demo data...');
    // Safely clear collections we are about to seed
    await GameResult.deleteMany({});
    await CognitiveMetric.deleteMany({});
    await Reminder.deleteMany({});
    await CaregiverNote.deleteMany({});
    await MemoryItem.deleteMany({});
    
    // NOTE: We are NOT deleting Users so your login still works!
    let patient = await User.findOne({ name: /chetan/i }) || await User.findOne({}); 
    
    if (!patient) {
      console.log('⚠️ No user found! Please register a patient first.');
      process.exit(1);
    }

    const patientId = patient._id;
    console.log(`👤 Seeding data for Patient ID: ${patientId}`);

    // --- 1. SEED GAME RESULTS (30 Days of History) ---
    console.log('🎮 Generating 30 days of Memory Journey sessions...');
    const gameResults = [];
    const metrics = [];
    
    // Create an upward trend so the chart looks good
    let currentAccuracy = 45; 
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Add a little randomness to the accuracy, but trending upwards
      currentAccuracy = Math.min(100, currentAccuracy + Math.floor(Math.random() * 5));
      const isComplete = true;

      gameResults.push({
        patientId: patientId,
        gameName: 'Memory Journey',
        accuracy: currentAccuracy,
        score: currentAccuracy * 10,
        createdAt: date
      });

      // Every 5 days, log a Cognitive Metric for the progress chart
      if (i % 5 === 0) {
        metrics.push({
          patientId: patientId,
          rollingAccuracy: currentAccuracy,
          gameName: 'Memory Journey',
          accuracy: currentAccuracy,
          createdAt: date
        });
      }
    }
    await GameResult.insertMany(gameResults);
    await CognitiveMetric.insertMany(metrics);


    // --- 2. SEED REMINDERS (The "Dolo 650" test + future alarms) ---
    console.log('⏰ Generating Medication Reminders...');
    
    // A reminder from this morning (Completed)
    const pastReminder = new Date();
    pastReminder.setHours(pastReminder.getHours() - 4);
    
    // A reminder for 2 minutes from now (To trigger the live demo popup!)
    const liveDemoReminder = new Date();
    liveDemoReminder.setMinutes(liveDemoReminder.getMinutes() + 2);

    await Reminder.insertMany([
      {
        patientId: patientId,
        title: "Morning Blood Pressure Meds",
        time: pastReminder,
        type: "medication",
        status: "completed"
      },
      {
        patientId: patientId,
        title: "Dolo 650 - After Meal",
        time: liveDemoReminder,
        type: "medication",
        status: "pending" // This will pop up during your presentation!
      }
    ]);


    // --- 3. SEED CAREGIVER NOTES & CLINICAL DATA ---
    console.log('📝 Generating Caregiver Notes...');
    await CaregiverNote.create({
      patientId: patientId,
      text: "Patient had a great week. Memory Journey scores are improving. Responding very well to the voice companion AI.",
      createdBy: "Dr. Sharma (Lead HCW)"
    });

    console.log('🖼️ Generating Memory Vault Data...');
    await MemoryItem.create({
      patientId: patientId,
      caption: "Family trip to Goa",
      mediaUrl: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
      status: "confirmed", // 👈 Change this to match your schema's exact casing
      aiSuggestions: {
        people: ["Chandu", "Chinmayi", "Chirag"],
        place: "Goa Beach",
        event: "Summer Vacation"
      }
    });

    console.log('✅ SEEDING COMPLETE! Your dashboard is now presentation-ready.');
    process.exit();

  } catch (err) {
    console.error('❌ Seeding Failed:', err);
    process.exit(1);
  }
};

seedDatabase();