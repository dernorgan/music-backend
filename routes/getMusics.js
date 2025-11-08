const express = require('express');
const router = express.Router();
const supabase = require('../services/supabaseClient');
const cache = require('../services/cache');

const { v4: uuidv4 } = require('uuid');

const BUCKET = 'uploads';
const FOLDER = 'files-music';

router.get('/musics', async (req, res) => {
  try {
    // Беремо параметри з query, або використовуємо дефолтні
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 15, 50); // максимальний limit = 50
    const cacheKey = `files-page-${page}-limit-${limit}`;

    const cached = cache.get(cacheKey);
    if (cached) return res.json({ files: cached });

    let offset = (page - 1) * limit;
    const signedFiles = [];

    while (signedFiles.length < limit) {
      const { data: files, error } = await supabase
        .storage
        .from(BUCKET)
        .list(FOLDER, {
          limit,
          offset,
        //   sortBy: { column: 'name', order: 'asc' }
        });

      if (error) throw new Error(error.message);
      if (!files || files.length === 0) break;

      for (const file of files) {
        if (signedFiles.length >= limit) break;

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

      offset += limit;
    }

    cache.set(cacheKey, signedFiles);
    res.json({ files: signedFiles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/all-music-files', async (req, res) => {
    

router.get('/all-music-files', async (req, res) => {
    const { data: files, error } = await supabase
        .storage
        .from(BUCKET)
        .list(FOLDER, { limit: 20 });
    console.log('BUCKET:', BUCKET);
    console.log('FOLDER:', FOLDER);
    console.log('files:', files);
    console.log('error:', error);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(files);
});

module.exports = router;