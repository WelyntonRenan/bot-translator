// filepath: src/routes/index.js
const express = require('express');
const router = express.Router();
const {
    renderIndex,
    getChannels,
    addChannel,
    editChannel,
    removeChannel,
    editMasterGroup
} = require('../controllers/index');

router.get('/', renderIndex);
router.get('/channels', getChannels);
router.post('/channels', addChannel);
router.put('/channels/:channelId', editChannel);
router.delete('/channels/:channelId', removeChannel);
router.put('/master-group', editMasterGroup);

module.exports = router;