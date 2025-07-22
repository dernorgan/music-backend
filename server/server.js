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

// API для списку
app.get('/api/music-list', (req, res) => {
    fs.readdir(musicDir, (err, files) => {
        if (err) return res.status(500).json({ error: 'Помилка читання папки' });

        const audioFiles = files.filter(file =>
            ['.mp3', '.wav', '.ogg'].includes(path.extname(file).toLowerCase())
        );

        // const urls = audioFiles.map(file => `/music/${file}`);
        res.json(audioFiles);
    });
});

app.listen(PORT, () => {
    console.log(`✅ Сервер запущено на порті ${PORT}`);
});