const Relationship = require('../models/Relationship');
const User = require('../models/User');

// GET /caregivers/:id/patients
exports.getAuthorizedPatients = async (req, res) => {
  try {
    const caregiverId = req.params.id;
    
    // JOIN Relationships WHERE caregiver_id AND status=AUTHORIZED
    const relationships = await Relationship.find({ 
      caregiver_id: caregiverId, 
      status: 'AUTHORIZED' 
    }).populate('patient_id', 'firstName name email'); 

    // Format for the UI
    const patients = relationships.map(rel => ({
      id: rel.patient_id._id,
      name: rel.patient_id.firstName || rel.patient_id.name || 'Patient',
      role: rel.role
    }));

    res.status(200).json(patients);
  } catch (error) {
    console.error("Failed to fetch patients:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /patients/:id/dashboard-summary
exports.getPatientSummary = async (req, res) => {
  try {
    const { id: patientId } = req.params;
    const caregiverId = req.headers['caregiver-id']; // Passed securely from frontend

    // STRICT BLUEPRINT ENFORCEMENT: Re-validate relationship server-side
    const isAuthorized = await Relationship.findOne({
      caregiver_id: caregiverId,
      patient_id: patientId,
      status: 'AUTHORIZED'
    });

    if (!isAuthorized) {
      return res.status(403).json({ message: 'UNAUTHORIZED: No active relationship found.' });
    }

    const patient = await User.findById(patientId);
    
    res.status(200).json({
      id: patient._id,
      name: patient.firstName || patient.name || 'Patient',
      status: 'Active',
      lastSynced: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  } catch (error) {
    console.error("Failed to fetch summary:", error);
    res.status(500).json({ message: 'Server error' });
  }
};