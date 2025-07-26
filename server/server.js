const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const NodeCache = require('node-cache');
const mm = require('music-metadata');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const sharp = require('sharp'); // 🔧 додаємо sharp

const app = express();
const PORT = process.env.PORT || 3000;

const musicDir = path.join(__dirname, '..', 'public', 'track');
const coversDir = path.join(__dirname, '..', 'public', 'covers');
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// Створення директорії для обкладинок, якщо не існує
if (!fs.existsSync(coversDir)) {
    fs.mkdirSync(coversDir, { recursive: true });
}

// CORS політика
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'https://your-frontend-domain.com',
];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}));

// Статичні файли
app.use('/music', express.static(musicDir));
app.use('/covers', express.static(coversDir));

// Головна сторінка
app.get('/', (req, res) => {
    res.send('🎶 Ласкаво просимо на мій аудіо-сервер!');
});

// Головний API
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

// Обробка одного аудіофайлу
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

            let pictureUrl = null;

            if (cover?.data && cover?.format) {
                const hash = crypto.createHash('md5').update(cover.data).digest('hex');
                const ext = 'jpg';
                const fileName = `cover-${hash}.${ext}`;
                const coverPath = path.join(coversDir, fileName);

                if (!fs.existsSync(coverPath)) {
                    // 🧠 Зменшуємо розмір і стискаємо
                    await sharp(cover.data)
                        .resize(360)
                        .toFormat('jpeg', { quality: 80 })
                        .toFile(coverPath);
                }

                pictureUrl = `/covers/${fileName}`;
            }

            metadata = {
                id: uuidv4(),
                title: title || path.basename(file, path.extname(file)),
                artist: artist || 'Unknown Artist',
                album: album || '',
                duration,
                picture: pictureUrl,
            };

            cache.set(cacheKey, metadata);
        } catch (err) {
            console.error(`❌ Metadata error for ${file}:`, err.message);
            metadata = getDefaultMetadata(file);
        }
    }

    return {
        id: metadata.id,
        name: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        duration: metadata.duration,
        file,
        format: path.extname(file).slice(1),
        url: `/music/${file}`,
        picture: metadata.picture || '/covers/default.jpg',
    };
}

// Форматування тривалості
function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Метадані за замовчуванням
function getDefaultMetadata(file) {
    return {
        title: path.basename(file, path.extname(file)),
        artist: 'Unknown Artist',
        album: '',
        duration: '0:00',
        picture: null,
    };
}

// Запуск сервера
app.listen(PORT, () => {
    console.log(`✅ Сервер запущено на порті ${PORT}`);
});
