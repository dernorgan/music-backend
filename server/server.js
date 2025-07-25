const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const NodeCache = require('node-cache');
const mm = require('music-metadata');

const app = express();
const PORT = process.env.PORT || 3000;

const musicDir = path.join(__dirname, '..', 'public');
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

app.use(cors({
    origin: ['http://localhost:5173', 'https://your-frontend-domain.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

app.use('/music', express.static(musicDir));

app.get('/', (req, res) => {
    res.send('🎶 Ласкаво просимо на мій аудіо-сервер!');
});

app.get('/api/music-list', async (req, res) => {
    try {
        const files = await fs.promises.readdir(musicDir);
        const audioFiles = files.filter(file =>
            ['.mp3', '.wav', '.ogg'].includes(path.extname(file).toLowerCase())
        );

        const parsedAudioFiles = await Promise.all(audioFiles.map(processAudioFile));
        res.json(parsedAudioFiles);
    } catch (err) {
        console.error('❌ Error reading music directory:', err.message);
        res.status(500).json({ error: 'Помилка читання аудіо файлів' });
    }
});

async function processAudioFile(file) {
    const cacheKey = `metadata_${file}`;
    let metadata = cache.get(cacheKey);

    if (!metadata) {
        const filePath = path.join(musicDir, file);

        try {
            const { common, format } = await mm.parseFile(filePath);
            const { title, artist, album, picture = [] } = common;
            const duration = formatDuration(format.duration);
            const [cover] = picture;

            const pictureData = cover?.data && cover?.format
                ? `data:${cover.format};base64,${Buffer.from(cover.data).toString('base64')}`
                : null;

            metadata = {
                title: title || path.basename(file, path.extname(file)),
                artist: artist || 'Unknown Artist',
                album: album || '',
                duration,
                picture: pictureData,
            };

            cache.set(cacheKey, metadata);
        } catch (err) {
            console.error(`❌ Metadata error for ${file}:`, err.message);
            metadata = getDefaultMetadata(file);
        }
    }

    return {
        name: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        duration: metadata.duration,
        file,
        format: path.extname(file).slice(1),
        url: `/music/${file}`,
        picture: metadata.picture,
    };
}

function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getDefaultMetadata(file) {
    return {
        title: path.basename(file, path.extname(file)),
        artist: 'Unknown Artist',
        album: '',
        duration: '0:00',
        picture: null,
    };
}

app.listen(PORT, () => {
    console.log(`✅ Сервер запущено на порті ${PORT}`);
});
