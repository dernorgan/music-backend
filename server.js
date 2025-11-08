const express = require('express');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const bucket = 'uploads';

// Завантаження файлу
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded');

    const fileName = `${Date.now()}-${req.file.originalname}`;

    const { error } = await supabase.storage
        .from(bucket)
        .upload(fileName, req.file.buffer, {
            contentType: req.file.mimetype,
        });

    if (error) {
        console.error('Upload error:', error);
        return res.status(500).json({ error: error.message });
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    res.json({ url: data.publicUrl, fileName });
});

// Отримання файлу (через download + конвертацію Blob у Buffer)
app.get('/file/:filename', async (req, res) => {
    const { filename } = req.params;

    const { data, error } = await supabase.storage.from(bucket).download(filename);
    if (error || !data) {
        console.error('Download error:', error?.message);
        return res.status(404).send('File not found');
    }

    try {
        const arrayBuffer = await data.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        res.setHeader('Content-Type', 'application/octet-stream');
        res.send(buffer);
    } catch (err) {
        console.error('Error converting file data:', err);
        res.status(500).send('Internal server error');
    }
});

app.get('/', (req, res) => res.send('Backend is running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started at http://localhost:${PORT}`));
