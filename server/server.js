const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Папка з музикою: ../public
const musicDir = path.join(__dirname, '..', 'public');

const corsOptions = {
    origin: ['https://your-frontend-domain.com', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};

// Дозволяємо віддавати статичні файли з /music
app.use('/music', express.static(musicDir));

app.use(cors(corsOptions));

app.get('/', (req, res) => {
    res.send('Ласкаво просимо на мій аудіо-сервер!');
});

app.get('/api/music-list', (req, res) => {
    fs.readdir(musicDir, async (err, files) => {
        if (err) return res.status(500).json({ error: 'Помилка читання папки' });

        const supportedFormats = ['.mp3', '.wav', '.ogg'];

        const audioFiles = files.filter(file => supportedFormats.includes(path.extname(file).toLowerCase()));

        function formatDuration(seconds) {
            if (!seconds || isNaN(seconds)) return '0:00';
            const minutes = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }

        try {
            const parsedAudioFiles = await Promise.all(
                audioFiles.map(async (file) => {
                    let metadata = {};
                    try {

                        metadata = {
                            title: data.common.title || path.basename(file, path.extname(file)),
                            artist: data.common.artist || 'Unknown Artist',
                            album: data.common.album || '',
                            duration: formatDuration(data.format.duration),
                        };
                    } catch (err) {
                        console.error(`❌ Error reading metadata for ${file}:`, err.message);
                        metadata = {
                            title: path.basename(file, path.extname(file)),
                            artist: 'Unknown Artist',
                            album: '',
                            duration: '0:00',
                        };
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

        } catch (outerErr) {
            console.error('❌ Error processing audio files:', outerErr);
            res.status(500).json({ error: 'Помилка обробки аудіо файлів' });
        }
    });
});

app.listen(PORT, () => {
    console.log(`✅ Сервер запущено на порті ${PORT}`);
});
