const Reminder = require('../models/Reminder');

exports.createReminder = async (req, res) => {
  try {
    const { patientId, title, time, type } = req.body;
    
    const newReminder = new Reminder({
      patientId,
      title,
      time,
      type
    });

    await newReminder.save();
    res.status(201).json(newReminder);
  } catch (error) {
    console.error("Failed to create reminder:", error);
    res.status(500).json({ message: 'Server error saving reminder' });
  }
};

exports.updateReminderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const updatedReminder = await Reminder.findByIdAndUpdate(
      req.params.id,
      { status },
      { returnDocument: 'after' } // <-- Replaced { new: true }
    );
    res.status(200).json(updatedReminder);
  } catch (error) {
    console.error("Update failed:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteReminder = async (req, res) => {
  try {
    const { id } = req.params;
    await Reminder.findByIdAndDelete(id);
    res.status(200).json({ message: 'Reminder deleted successfully.' });
  } catch (error) {
    console.error("Failed to delete reminder:", error);
    res.status(500).json({ message: 'Server error during deletion.', error: error.message });
  }
};