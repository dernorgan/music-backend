const path = require('path');
const fs = require('fs');
const mm = require('music-metadata');
const sharp = require('sharp');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 3600 }); // кеш на 1 годину (параметри можна змінити)

const musicDir = path.join(__dirname, '..', 'public', 'music'); // папка з музикою
const coversDir = path.join(__dirname, '..', 'public', 'covers'); // папка для обкладинок

// Функція для форматування тривалості у хвилини:секунди
function formatDuration(durationSec) {
    if (!durationSec || isNaN(durationSec)) return '0:00';
    const minutes = Math.floor(durationSec / 60);
    const seconds = Math.floor(durationSec % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
}

// Функція повертає метадані за замовчуванням
function getDefaultMetadata(file) {
    return {
        id: uuidv4(),
        title: path.basename(file, path.extname(file)),
        artist: 'Unknown Artist',
        album: '',
        duration: '0:00',
        picture: '/covers/default.jpg',
    };
}

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
                const ext = 'jpg'; // можна покращити визначення формату, але jpeg підходить
                const fileName = `cover-${hash}.${ext}`;
                const coverPath = path.join(coversDir, fileName);

                if (!fs.existsSync(coverPath)) {
                    // Зменшуємо розмір і стискаємо
                    await sharp(cover.data)
                        .resize(600)
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

module.exports = {
    processAudioFile,
};
