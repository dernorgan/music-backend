const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadMusic = multer();
const supabase = require('../services/supabaseClient');
const { firestore } = require('../services/firebase'); // підключаємо firestore

const BUCKET = 'uploads';

router.post('/upload-music', uploadMusic.array('files', 10), async (req, res) => {
    const files = req.files;
    if (!files || files.length === 0) {
        return res.status(400).send('No files uploaded.');
    }

    const results = [];

    for (const file of files) {
        const filePath = `files-music/${file.originalname}`;
        const { data, error } = await supabase
            .storage
            .from(BUCKET)
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
            });

        if (error) {
            results.push({ name: file.originalname, error: error.message });
        } else {
            // 🔽 Створюємо документ у Firestore
            const docData = {
                name: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                bucket: BUCKET,
                path: filePath,
                uploadedAt: new Date().toISOString()
            };

            try {
                const docRef = await firestore.collection('tracks').add(docData);
                results.push({
                    name: file.originalname,
                    data,
                    firestoreId: docRef.id
                });
            } catch (dbError) {
                results.push({
                    name: file.originalname,
                    data,
                    firestoreError: dbError.message
                });
            }
        }
    }

    res.json({ results });
});

module.exports = router;
