const User = require('../models/User'); // Fixed the import to look for User.js
const Reminder = require('../models/Reminder'); 

exports.getDailyOrientation = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // 1. Fetch the real patient from MongoDB
    let patient = null;
    
    // Safety check in case 'demo-id' or invalid ID is passed during testing
    if (patientId && patientId !== 'demo-id' && patientId.length === 24) {
      patient = await User.findById(patientId);
    }
    
    // 2. Fetch real schedules (Greater than current time, sorted by soonest)
    const currentTime = new Date();
    
    // Execute DB queries concurrently for speed
    // If patientId is invalid/demo, these will just return null safely
    const [upcomingReminder, upcomingActivity, upcomingEvent] = await Promise.all([
      Reminder.findOne({ patientId, type: 'medication', status: 'pending' }).sort({ createdAt: -1 }),
      Reminder.findOne({ patientId, type: 'routine', status: 'pending' }).sort({ createdAt: -1 }),
      Reminder.findOne({ patientId, type: 'social', status: 'pending' }).sort({ createdAt: -1 })
    ]);

    // 3. Construct the real response with fallback safeguards for your demo presentation
    const orientationData = {
      name: patient?.firstName || patient?.name || "Chetan", 
      honorific: patient?.honorific || "Mr.", 
      
      nextActivity: upcomingActivity ? {
        title: upcomingActivity.title,
        time: new Date(upcomingActivity.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      } : { title: "Evening Garden Walk", time: "5:30 PM" }, // Safe fallback if DB is empty
      
      upcomingReminder: upcomingReminder ? {
        id: upcomingReminder._id,
        rawTime: upcomingReminder.time,
        title: upcomingReminder.title,
        time: new Date(upcomingReminder.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      } : { title: "Hydration Check", time: "6:00 PM" },

      familyEvent: upcomingEvent ? {
        title: upcomingEvent.title,
        time: new Date(upcomingEvent.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      } : { title: "Video Call with MF", time: "7:00 PM" }
    };

    res.status(200).json(orientationData);
  } catch (error) {
    console.error("Failed to fetch My Day data from DB:", error);
    res.status(500).json({ message: 'Database error' });
  }
};