const express = require('express');
const {createClient} = require('@supabase/supabase-js');
require('dotenv').config();
const cors = require('cors');
const multer = require('multer');
const upload = multer();
const NodeCache = require('node-cache');


const app = express();
const port = 3000;

// Підключення до Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const cache = new NodeCache({ stdTTL: 720 }); // TTL 60 сек, можна змінити

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

app.get('/', (req, res) => {
    res.send('🎶 Ласкаво просимо на мій аудіо-сервер!');
});

const BUCKET = 'uploads'; // ← назва бакета (чутлива до регістру)


const FOLDER = 'files-music'; // твоя папка в бакеті

app.get('/files', async (req, res) => {
    try {
        const PAGE_SIZE = 14;
        const page = parseInt(req.query.page) || 1;
        const cacheKey = `files-page-${page}`;

        // Перевірка кешу
        const cached = cache.get(cacheKey);
        if (cached) {
            return res.json({ files: cached });
        }

        let offset = (page - 1) * PAGE_SIZE;
        const signedFiles = [];
        const fetchChunkSize = 14;

        while (signedFiles.length < PAGE_SIZE) {
            const { data: files, error } = await supabase.storage.from(BUCKET).list(FOLDER, {
                limit: fetchChunkSize,
                offset,
                sortBy: { column: 'name', order: 'asc' }
            });

            if (error) throw new Error(error.message);
            if (!files || files.length === 0) break;

            for (const file of files) {
                if (signedFiles.length >= PAGE_SIZE) break;

                try {
                    const filePath = `${FOLDER}/${file.name}`;
                    const { data: signed, error: signError } = await supabase
                        .storage
                        .from(BUCKET)
                        .createSignedUrl(filePath, 360); // 6 хв

                    if (signError) continue;

                    signedFiles.push({
                        name: file.name,
                        url: signed.signedUrl
                    });
                } catch {
                    continue;
                }
            }

            offset += fetchChunkSize;
        }

        // Кешуємо результат
        cache.set(cacheKey, signedFiles);

        res.json({ files: signedFiles });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});


app.post('/upload', upload.array('files', 10), async (req, res) => {
    const files = req.files;
    if (!files || files.length === 0) {
        return res.status(400).send('No files uploaded.');
    }

    // Завантажуємо файли по черзі (або паралельно)
    const results = [];

    for (const file of files) {
        const filePath = `${FOLDER}/${file.originalname}`;
        const { data, error } = await supabase
            .storage
            .from('uploads')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
            });

        if (error) {
            results.push({ name: file.originalname, error: error.message });
        } else {
            results.push({ name: file.originalname, data });
        }
    }

    res.json({ results });
});

app.get('/all-music-files', async (req, res) => {
    const { data: files, error } = await supabase.storage.from(BUCKET).list(FOLDER, { limit: 20 });
    if (error) return res.status(500).json({ error: error.message });
    res.json(files);
});


app.listen(port, () => {
    console.log(`✅ Server running: http://localhost:${port}/files`);
});
