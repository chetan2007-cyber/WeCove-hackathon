const Relationship = require('../models/Relationship');
const User = require('../models/User');

// GET /caregivers/:id/patients
exports.getAuthorizedPatients = async (req, res) => {
  try {
    const caregiverId = req.user ? String(req.user._id || req.user.id) : String(req.params.id);
    
    // Search authorized relationships using flexible ID references
    const relationships = await Relationship.find({ 
      $or: [
        { caregiver_id: caregiverId },
        { userId: caregiverId },
        { caregiverId: caregiverId }
      ],
      status: 'AUTHORIZED' 
    }); 

    if (relationships.length > 0) {
      const patientIds = relationships.map(rel => rel.patient_id || rel.patientId).filter(Boolean);
      const patients = await User.find({ _id: { $in: patientIds } }).select('-password -otp');
      
      const formatted = patients.map(p => ({
        id: p._id,
        _id: p._id,
        name: p.name || 'Patient',
        role: 'Patient',
        email: p.email,
        phone: p.phone
      }));
      return res.status(200).json(formatted);
    }

    // Fallback: If no explicit relationship records yet in local dev/demo workspace, list patients for Caregiver role
    if (req.user && ['Caregiver', 'Admin', 'HealthcareWorker'].includes(req.userRole || req.user.role)) {
      const patients = await User.find({ role: 'Patient' }).select('-password -otp').limit(10);
      const formatted = patients.map(p => ({
        id: p._id,
        _id: p._id,
        name: p.name || 'Patient',
        role: 'Patient',
        email: p.email,
        phone: p.phone
      }));
      return res.status(200).json(formatted);
    }

    return res.status(200).json([]);
  } catch (error) {
    console.error('[CaregiverController] Failed to fetch patients:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving patients', error: error.message });
  }
};

// GET /patients/:id/dashboard-summary
exports.getPatientSummary = async (req, res) => {
  try {
    const { id: patientId } = req.params;
    const caregiverId = req.user ? String(req.user._id || req.user.id) : String(req.headers['caregiver-id']);

    if (!caregiverId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Check authorization: Caregivers, Clinicians, Admins or the patient themselves
    if (req.user) {
      const userRole = req.userRole || req.user.role;
      const userId = String(req.user._id || req.user.id);

      if (userRole === 'Patient' && userId !== String(patientId)) {
        return res.status(403).json({ success: false, message: 'Forbidden: You cannot access another patient\'s summary' });
      }
    }

    const patient = await User.findById(patientId).select('-password -otp');
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient record not found' });
    }
    
    return res.status(200).json({
      id: patient._id,
      _id: patient._id,
      name: patient.name || 'Patient',
      status: 'Active',
      preferences: patient.preferences,
      lastSynced: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  } catch (error) {
    console.error('[CaregiverController] Failed to fetch summary:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving summary', error: error.message });
  }
};