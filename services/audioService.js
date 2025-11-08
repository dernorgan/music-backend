const mm = require('music-metadata');
const sharp = require('sharp');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const supabase = require('./supabaseClient');
const firestore = require('./firebase').firestore;

const { uploadFileToBucket, getPublicUrl } = require('./supabaseStorageService');

const BUCKET = 'uploads'; // ОДИН бакет
const AUDIO_FOLDER = 'musics';  // папка для музики
const COVER_FOLDER = 'covers';  // папка для обкладинок

const SUPABASE_PUBLIC_URL_BASE = `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;

async function processAudioFile(fileName) {
    try {
        // Повний шлях до аудіофайлу в бакеті
        const audioFilePath = `${AUDIO_FOLDER}/${fileName}`;

        // Завантажити Buffer аудіофайлу з Supabase Storage
        const { data: audioBuffer, error } = await supabase.storage
            .from(BUCKET)
            .download(audioFilePath);

        if (error || !audioBuffer) {
            throw new Error('Failed to download audio file from Supabase');
        }

        const buffer = Buffer.from(await audioBuffer.arrayBuffer());

        // Парсимо метадані
        const { common, format } = await mm.parseBuffer(buffer, null, { duration: true });
        const { title, artist, album, picture = [] } = common;
        const duration = format.duration || 0;

        // Обробка обкладинки
        let pictureUrl;
        const [cover] = picture;

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

        // Формуємо базовий обʼєкт
        const track = {
            id: uuidv4(),
            name: title || fileName,
            artist: artist || 'Unknown Artist',
            album: album || '',
            duration: `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}`,
            file: audioFilePath,
            format: fileName.split('.').pop(),
            url: SUPABASE_PUBLIC_URL_BASE + audioFilePath,
        };

        // Якщо є картинка — додаємо поле picture
        if (pictureUrl) {
            track.picture = pictureUrl;
        }

        return track;
    } catch (err) {
        console.error(`❌ Metadata error for ${fileName}:`, err.message);

        const audioFilePath = `${AUDIO_FOLDER}/${fileName}`;

        return {
            id: uuidv4(),
            name: fileName,
            artist: 'Unknown Artist',
            album: '',
            duration: '0:00',
            file: audioFilePath,
            format: fileName.split('.').pop(),
            url: SUPABASE_PUBLIC_URL_BASE + audioFilePath,
        };
    }
}

async function syncAllTracks() {
    // Листимо всі файли в папці musics бакету uploads
    const { data: files, error } = await supabase
        .storage
        .from(BUCKET)
        .list(AUDIO_FOLDER, { limit: 100 });

    if (error) {
        console.error('❌ Storage list error:', error.message);
        return;
    }

    for (const file of files) {
        try {
            const metadata = await processAudioFile(file.name);
            await firestore.collection('tracks').add(metadata);
            console.log(`✅ Synced: ${file.name}`);
        } catch (err) {
            console.error(`❌ Failed to sync ${file.name}:`, err.message);
        }
    }
}

module.exports = {
    processAudioFile,
    syncAllTracks,
};
