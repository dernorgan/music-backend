const express = require('express');
const router = express.Router();
const supabase = require('../services/supabaseClient');
const cache = require('../services/cache');

const { v4: uuidv4 } = require('uuid');

const BUCKET = 'uploads';
const FOLDER = 'files-music';

router.get('/musics', async (req, res) => {
    try {
        const PAGE_SIZE = 15;
        const page = parseInt(req.query.page) || 1;
        const cacheKey = `files-page-${page}`;

        const cached = cache.get(cacheKey);
        if (cached) return res.json({ files: cached });

        let offset = (page - 1) * PAGE_SIZE;
        const signedFiles = [];

        while (signedFiles.length < PAGE_SIZE) {
            const { data: files, error } = await supabase
                .storage
                .from(BUCKET)
                .list(FOLDER, {
                    limit: PAGE_SIZE,
                    offset,
                    sortBy: { column: 'name', order: 'asc' }
                });

            if (error) throw new Error(error.message);
            if (!files || files.length === 0) break;

            for (const file of files) {
                if (signedFiles.length >= PAGE_SIZE) break;

                const filePath = `${FOLDER}/${file.name}`;
                const { data: signed, error: signError } = await supabase
                    .storage
                    .from(BUCKET)
                    .createSignedUrl(filePath, 3600);

                if (!signError) {
                    signedFiles.push({
                        id: uuidv4(),
                        name: file.name,
                        url: signed.signedUrl
                    });
                }
            }

            offset += PAGE_SIZE;
        }
        cache.set(cacheKey, signedFiles);
        res.json(signedFiles);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/all-music-files', async (req, res) => {
    const { data: files, error } = await supabase
        .storage
        .from(BUCKET)
        .list(FOLDER, { limit: 20 });

    if (error) return res.status(500).json({ error: error.message });
    res.json(files);
});

module.exports = router;