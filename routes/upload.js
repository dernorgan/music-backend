const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const supabase = require('../services/supabaseClient');

const BUCKET = 'uploads';
const FOLDER = 'files-music';

router.post('/upload', upload.array('files', 10), async (req, res) => {
    const files = req.files;
    if (!files || files.length === 0) {
        return res.status(400).send('No files uploaded.');
    }

    const results = [];

    for (const file of files) {
        const filePath = `${FOLDER}/${file.originalname}`;
        const { data, error } = await supabase
            .storage
            .from(BUCKET)
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
            });

        if (error) {
            results.push({ name: file.originalname, error: error.message });
        } else {
            results.push({ name: file.originalname, data });
        }
    }

    res.json({ results });
});

module.exports = router;