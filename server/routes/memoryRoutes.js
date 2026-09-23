const express = require('express');
const router = express.Router();
const memoryController = require('../controllers/memoryController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Routes mapped cleanly to controller methods with authentication
router.post('/upload', verifyToken, memoryController.uploadMemory);
router.put('/review', verifyToken, memoryController.reviewMemory);
router.get('/patient/:patientId', verifyToken, memoryController.getPatientMemories);
router.get('/patients/:id/memory-graph', verifyToken, memoryController.getMemoryGraph);
router.get('/memory-graph/node/:id/related', verifyToken, memoryController.getNodeRelatedMemories);
router.delete('/:id', verifyToken, memoryController.deleteMemory);

module.exports = router;