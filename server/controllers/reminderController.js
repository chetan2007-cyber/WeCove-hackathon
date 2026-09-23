const Reminder = require('../models/Reminder');

/**
 * GET /api/reminders
 * Fetch all reminders for a given patient with optional status filtering
 */
exports.getReminders = async (req, res) => {
  try {
    const patientId = req.query.patientId || (req.user && (req.user._id || req.user.id));
    
    if (!patientId) {
      return res.status(400).json({ 
        success: false,
        message: 'patientId query parameter or authenticated patient session is required' 
      });
    }

    // Role-based authorization check: Patient cannot view another patient's reminders
    if (req.user && req.userRole === 'Patient') {
      const authUserId = String(req.user._id || req.user.id);
      if (authUserId !== String(patientId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only access your own reminders.'
        });
      }
    }

    const filter = { patientId: String(patientId) };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const reminders = await Reminder.find(filter).sort({ time: 1 });
    return res.status(200).json(reminders);
  } catch (error) {
    console.error('[ReminderController] Failed to fetch reminders:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error fetching reminders', 
      error: error.message 
    });
  }
};

/**
 * POST /api/reminders
 * Create a new reminder
 */
exports.createReminder = async (req, res) => {
  try {
    const { patientId, title, time, type } = req.body;
    
    if (!patientId || !title || !time) {
      return res.status(400).json({
        success: false,
        message: 'patientId, title, and time are required fields.'
      });
    }

    // Role-based authorization check
    if (req.user && req.userRole === 'Patient') {
      const authUserId = String(req.user._id || req.user.id);
      if (authUserId !== String(patientId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only create reminders for yourself.'
        });
      }
    }

    const newReminder = new Reminder({
      patientId: String(patientId),
      title: title.trim(),
      time: new Date(time),
      type: type || 'routine',
      status: 'pending'
    });

    await newReminder.save();
    return res.status(201).json(newReminder);
  } catch (error) {
    console.error('[ReminderController] Failed to create reminder:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error saving reminder', 
      error: error.message 
    });
  }
};

/**
 * PATCH /api/reminders/:id/status
 * Update status of reminder (pending | completed | snoozed)
 */
exports.updateReminderStatus = async (req, res) => {
  try {
    const { status, time } = req.body;
    
    if (!status || !['pending', 'completed', 'snoozed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status required: pending, completed, or snoozed'
      });
    }

    const updateFields = { status };
    if (time) {
      updateFields.time = new Date(time);
    }

    const updatedReminder = await Reminder.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { returnDocument: 'after' }
    );

    if (!updatedReminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    return res.status(200).json(updatedReminder);
  } catch (error) {
    console.error('[ReminderController] Status update failed:', error);
    return res.status(500).json({ success: false, message: 'Server error updating status' });
  }
};

/**
 * PUT /api/reminders/:id
 * Update full reminder details
 */
exports.updateReminder = async (req, res) => {
  try {
    const { title, time, type, status } = req.body;
    const updateData = {};
    if (title) updateData.title = title.trim();
    if (time) updateData.time = new Date(time);
    if (type) updateData.type = type;
    if (status) updateData.status = status;

    const updated = await Reminder.findByIdAndUpdate(
      req.params.id,
      updateData,
      { returnDocument: 'after' }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error('[ReminderController] Update failed:', error);
    return res.status(500).json({ success: false, message: 'Server error updating reminder' });
  }
};

/**
 * DELETE /api/reminders/:id
 * Delete a reminder
 */
exports.deleteReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Reminder.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }
    return res.status(200).json({ success: true, message: 'Reminder deleted successfully.' });
  } catch (error) {
    console.error('[ReminderController] Failed to delete reminder:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during deletion.', 
      error: error.message 
    });
  }
};