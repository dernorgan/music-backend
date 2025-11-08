const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const mm = require('music-metadata');
const sharp = require('sharp');
const crypto = require('crypto');

const supabase = require('../services/supabaseClient');
const firestore = require('../services/firebase').firestore;
const { uploadFileToBucket } = require('../services/supabaseStorageService');

const BUCKET = 'uploads';
const AUDIO_FOLDER = 'musics';
const COVER_FOLDER = 'covers';

const SUPABASE_PUBLIC_URL_BASE = `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;

router.get('/update-firebase', async (req, res) => {
    try {
        // 1. Отримати список всіх аудіофайлів
        const { data: files, error } = await supabase
            .storage
            .from(BUCKET)
            .list(AUDIO_FOLDER, { limit: 100 });

        if (error) return res.status(500).json({ error: error.message });

        const tracks = [];

        for (const file of files) {
            const audioFilePath = `${AUDIO_FOLDER}/${file.name}`;

            // 2. Спроба завантажити файл
            const { data: audioFile, error: downloadError } = await supabase
                .storage
                .from(BUCKET)
                .download(audioFilePath);

            if (downloadError || !audioFile) {
                console.error(`❌ Не вдалося завантажити ${file.name}`);
                continue;
            }

            const buffer = Buffer.from(await audioFile.arrayBuffer());

            let common = {};
            let format = {};
            let pictureUrl = null;

            try {
                const metadata = await mm.parseBuffer(buffer, null, { duration: true });
                common = metadata.common;
                format = metadata.format;
            } catch (err) {
                console.warn(`⚠️ Метадані не зчитано для ${file.name}:`, err.message);
            }

            // 3. Обробка обкладинки, якщо є
            const [cover] = common.picture || [];
            if (cover?.data && cover?.format) {
                const coverBuffer = await sharp(cover.data)
                    .resize(600)
                    .jpeg({ quality: 80 })
                    .toBuffer();

                const hash = crypto.createHash('md5').update(coverBuffer).digest('hex');
                const coverFileName = `cover-${hash}.jpeg`;
                const coverFilePath = `${COVER_FOLDER}/${coverFileName}`;

                await uploadFileToBucket(BUCKET, coverFilePath, coverBuffer, 'image/jpeg');
                pictureUrl = SUPABASE_PUBLIC_URL_BASE + coverFilePath;
            }

            const duration = format.duration || 0;
            const track = {
                id: uuidv4(),
                name: common.title || file.name,
                artist: common.artist || 'Unknown Artist',
                album: common.album || '',
                duration: `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}`,
                file: audioFilePath,
                format: file.name.split('.').pop(),
                url: SUPABASE_PUBLIC_URL_BASE + audioFilePath,
            };

            if (pictureUrl) {
                track.picture = pictureUrl;
            }

            // 4. Запис у Firestore
            await firestore.collection('tracks').add(track);
            tracks.push(track);
        }

        res.json({ count: tracks.length, tracks });
    } catch (err) {
        console.error('❌ Error in /update-firebase:', err);
        res.status(500).json({ error: 'Unexpected error occurred' });
    }
});

module.exports = router;
