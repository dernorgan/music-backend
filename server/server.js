const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Папка з музикою: ../public
const musicDir = path.join(__dirname, '..', 'public');

// ✅ Дозволяємо віддавати статичні файли з /music
app.use('/music', express.static(musicDir));

app.use(cors());

app.get('/', (req, res) => {
    res.send('Ласкаво просимо на мій аудіо-сервер!');
});

// API для списку
app.get('/api/music-list', (req, res) => {
    fs.readdir(musicDir, (err, files) => {
        if (err) return res.status(500).json({ error: 'Помилка читання папки' });

        const supportedFormats = ['.mp3', '.wav', '.ogg'];

        const parsedAudioFiles = files
            .filter(file => supportedFormats.includes(path.extname(file).toLowerCase()))
            .map(file => {
                const ext = path.extname(file);
                const name = path.basename(file, ext);
                return {
                    name,
                    format: ext.slice(1), // прибираємо крапку
                };
            });
        res.json(parsedAudioFiles);
    });
});

app.listen(PORT, () => {
    console.log(`✅ Сервер запущено на порті ${PORT}`);
});