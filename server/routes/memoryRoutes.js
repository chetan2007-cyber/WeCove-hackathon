const express = require('express');
const router = express.Router();
const memoryController = require('../controllers/memoryController');

// Routes mapped cleanly to controller methods
router.post('/upload', memoryController.uploadMemory);
router.put('/review', memoryController.reviewMemory);
router.get('/patient/:patientId', memoryController.getPatientMemories);
router.get('/patients/:id/memory-graph', memoryController.getMemoryGraph);
router.get('/memory-graph/node/:id/related', memoryController.getNodeRelatedMemories);
router.delete('/:id', memoryController.deleteMemory);

module.exports = router;