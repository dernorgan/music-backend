const express = require('express');
const app = express();
const port = 3000;
const cors = require('./middleware/cors');
app.use(cors()); // ← викликаємо функцію!

const fileRoutes = require('./routes/files');
const uploadRoutes = require('./routes/upload');

app.get('/', (req, res) => {
    res.send('🎶 Ласкаво просимо на мій аудіо-сервер!');
});

app.use('/', fileRoutes);
app.use('/', uploadRoutes);

app.listen(port, () => {
    console.log(`✅ Server running: http://localhost:${port}`);
});