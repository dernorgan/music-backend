const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const NodeCache = require('node-cache');
const mm = require('music-metadata');

const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
const app = express();
const PORT = process.env.PORT || 3000;

const musicDir = path.join(__dirname, '..', 'public');

const corsOptions = {
    origin: ['http://localhost:5173', 'https://your-frontend-domain.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};

app.use(cors(corsOptions));
app.use('/music', express.static(musicDir));

app.get('/', (req, res) => {
    res.send('🎶 Ласкаво просимо на мій аудіо-сервер!');
});

app.get('/api/music-list', async (req, res) => {
    try {
        const files = await fs.promises.readdir(musicDir);
        const supportedFormats = ['.mp3', '.wav', '.ogg'];

        const audioFiles = files.filter(file =>
            supportedFormats.includes(path.extname(file).toLowerCase())
        );

        const parsedAudioFiles = await Promise.all(
            audioFiles.map(async (file) => {
                const cacheKey = `metadata_${file}`;
                let metadata = cache.get(cacheKey);

                if (!metadata) {
                    try {
                        const filePath = path.join(musicDir, file);
                        const data = await mm.parseFile(filePath);

                        const pictureObj = Array.isArray(data.common.picture)
                            ? data.common?.picture?.[0]
                            : null;

                        let base64Src = null;

                        if (pictureObj && pictureObj.data && pictureObj.format) {
                            const buffer = Buffer.from(pictureObj.data);
                            base64Src = `data:${pictureObj.format};base64,${buffer.toString('base64')}`;
                        }

                        metadata = {
                            title: data.common.title || path.basename(file, path.extname(file)),
                            artist: data.common.artist || 'Unknown Artist',
                            album: data.common.album || '',
                            duration: formatDuration(data.format.duration),
                            picture: base64Src,
                        };

                        cache.set(cacheKey, metadata);

                    } catch (err) {
                        console.error(`❌ Metadata error for ${file}:`, err.message);
                        metadata = {
                            title: path.basename(file, path.extname(file)),
                            artist: 'Unknown Artist',
                            album: '',
                            duration: '0:00',
                            picture: null,
                        };
                    }
                }

                return {
                    name: metadata.title,
                    artist: metadata.artist,
                    album: metadata.album,
                    duration: metadata.duration,
                    file: file,
                    format: path.extname(file).slice(1),
                    url: `/music/${file}`,
                    picture: metadata.picture,
                };
            })
        );

        res.json(parsedAudioFiles);
    } catch (err) {
        console.error('❌ Error reading music directory:', err.message);
        res.status(500).json({ error: 'Помилка читання аудіо файлів' });
    }
});

function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

app.listen(PORT, () => {
    console.log(`✅ Сервер запущено на порті ${PORT}`);
});
