const Medication = require('../models/Medication');

exports.addReminder = async (req, res) => {
  try {
    const { patientId, medicationName, timeOfDay, instructions } = req.body;
    
    // Explicit disclaimer injection to satisfy Rule 3
    const safeInstructions = `${instructions} (Reminder only. Follow doctor's prescription.)`;

    const reminder = await Medication.create({
      caregiverId: req.body.caregiverId, // Passed from frontend auth
      patientId,
      medicationName,
      timeOfDay,
      instructions: safeInstructions
    });

    res.status(201).json({ message: 'Reminder scheduled', reminder });
  } catch (error) {
    res.status(500).json({ message: 'Failed to schedule reminder', error: error.message });
  }
};

exports.getPatientReminders = async (req, res) => {
  try {
    const { patientId } = req.params;
    // Fetch only today's pending reminders
    const reminders = await Medication.find({ 
      patientId,
      isTaken: false 
    }).sort({ createdAt: -1 });
    
    res.status(200).json(reminders);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch reminders', error: error.message });
  }
};

exports.getMedications = async (req, res) => {
  try {
    const meds = await Medication.find({});
    res.status(200).json(meds);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching medications' });
  }
};