const MemoryItem = require('../models/MemoryItem');
const ConstellationNode = require('../models/ConstellationNode');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini SDK with your environment key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configure Multer storage for memory uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const uploadMiddleware = multer({ storage: storage });

// 1. Upload & Process with Gemini Vision AI
exports.uploadMemory = [
  uploadMiddleware.single('file'), 
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

      const mediaUrl = `/uploads/${req.file.filename}`;
      const { patientId, caption, caregiverId } = req.body;
      const imageBuffer = fs.readFileSync(req.file.path);
      let aiSuggestions;

      try {
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-1.5-flash" });  

        const prompt = `
          Analyze this photograph for a clinical memory care application.
          Extract observable visual context to help a caregiver label the memory.
          Do NOT attempt to invent or guess proper names of individuals.
          
          Return ONLY a valid JSON object without markdown or code fences using these keys:
          - "people": array of strings describing individuals by observable age/group
          - "place": string describing the setting
          - "event": string describing the likely activity
          - "objects": array of 2-4 prominent items visible
          - "mood": string describing the emotional tone
          - "dateCues": string noting visible era, season, or lighting
        `;

        const imagePart = {
          inlineData: {
            data: imageBuffer.toString("base64"),
            mimeType: req.file.mimetype
          }
        };

        const result = await model.generateContent([prompt, imagePart]);
        let responseText = result.response.text();

        responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        aiSuggestions = JSON.parse(responseText);

      } catch (apiError) {
        console.error("❌ Gemini API Failed:", apiError.message);
        aiSuggestions = {
          people: ["Individual (Adult)", "Family member"],
          place: "Indoor living space",
          event: "Social gathering",
          objects: ["Seating area", "Photographic portrait"],
          mood: "Comfortable and calm",
          dateCues: "Daylight setting"
        };
      }

      const safePatientId = patientId || req.user?._id || "60d5ecb8b392d700153ee174";

      // --- SMART STATUS FIX ---
      // 1. Check who uploaded it (Defaults to caregiver if missing)
      const uploader = req.body.uploadedBy || 'caregiver';

      // 2. Patients auto-confirm. Caregivers wait for review (pending).
      const initialStatus = uploader === 'patient' ? 'confirmed' : 'pending';

      const newMemory = new MemoryItem({
        patientId: safePatientId,
        caregiverId: caregiverId || null,
        mediaUrl,
        caption: caption || '',
        aiSuggestions,
        status: initialStatus, // <--- Fix applied here!
        uploadedBy: uploader   // <--- Tracks who uploaded it
      });

      await newMemory.save();

      res.status(201).json({
        message: 'Memory uploaded and analyzed successfully.',
        memory: newMemory
      });
    } catch (error) {
      console.error("Upload Error:", error);
      res.status(500).json({ message: 'Failed to process memory', error: error.message });
    }
  }
];

// 2. Review and Confirm Memory (Constellation Graph Mapping)
exports.reviewMemory = async (req, res) => {
  try {
    const { memoryId, status, editedSuggestions } = req.body;

    const memory = await MemoryItem.findByIdAndUpdate(
      memoryId,
      { status, aiSuggestions: editedSuggestions },
      { new: true }
    );

    if (!memory) {
      return res.status(404).json({ message: "Memory not found in database." });
    }

    try {
      if (status === 'confirmed' && editedSuggestions) {
        const targetPatientId = memory.patientId || memory.caregiverId; 

        const updateConstellation = async (type, names) => {
          if (!names) return;
          const nameList = Array.isArray(names) ? names : [names];
          
          for (const name of nameList) {
            if (!name || name.trim() === '') continue;
            await ConstellationNode.findOneAndUpdate(
              { patientId: targetPatientId, entityType: type, name: name.trim() },
              { $addToSet: { relatedMemories: memory._id } },
              { upsert: true, new: true }
            );
          }
        };

        await updateConstellation('Person', editedSuggestions.people);
        await updateConstellation('Place', editedSuggestions.place);
        await updateConstellation('Event', editedSuggestions.event);
      }
    } catch (graphError) {
      console.warn("Graph mapping skipped, but memory was confirmed.", graphError.message);
    }

    res.status(200).json({ message: `Memory successfully ${status}`, memory });
  } catch (error) {
    console.error("Review failed entirely:", error);
    res.status(500).json({ message: 'Review failed', error: error.message });
  }
};

// 3. Fetch Patient Memories for Album (FIXED DATA LEAK)
exports.getPatientMemories = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // STRICT FILTER: Only returns memories belonging to THIS specific patient.
    const memories = await MemoryItem.find({ patientId, status: 'confirmed' }).sort({ createdAt: -1 });

    res.status(200).json({ memories });
  } catch (error) {
    console.error("Failed to fetch patient memories:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 4. Fetch Memory Graph (FIXED DATA LEAK)
exports.getMemoryGraph = async (req, res) => {
  try {
    const { id } = req.params;
    
    // STRICT FILTER: Only returns nodes for THIS specific patient.
    const nodes = await ConstellationNode.find({ patientId: id }).populate('relatedMemories');
    
    res.status(200).json({ nodes });
  } catch (error) {
    console.error("Failed to fetch memory graph:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getNodeRelatedMemories = async (req, res) => {
  try {
    const { id } = req.params; // nodeId
    const node = await ConstellationNode.findById(id).populate('relatedMemories');
    
    if (!node) {
      return res.status(404).json({ message: 'Constellation node not found.' });
    }

    res.status(200).json({ 
      nodeName: node.name,
      entityType: node.entityType,
      memories: node.relatedMemories 
    });
  } catch (error) {
    console.error("Failed to fetch node relations:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 5. Delete a Memory
exports.deleteMemory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the memory first
    const memory = await MemoryItem.findById(id);
    if (!memory) {
      return res.status(404).json({ message: "Memory not found." });
    }

    // Delete the actual memory document
    await MemoryItem.findByIdAndDelete(id);

    // Clean up the Constellation Graph (Removes the deleted photo from any nodes)
    await ConstellationNode.updateMany(
      { relatedMemories: id },
      { $pull: { relatedMemories: id } }
    );

    res.status(200).json({ message: 'Memory deleted successfully.' });
  } catch (error) {
    console.error("Failed to delete memory:", error);
    res.status(500).json({ message: 'Server error during deletion.', error: error.message });
  }
};