const express = require('express');
const app = express();
const port = 3000;
const cors = require('./middleware/cors');
app.use(cors()); // ← викликаємо функцію!

const fileRoutes = require('./routes/getMusics');
const updateFirebaseRoutes = require('./routes/updateFireBase');
const uploadRoutes = require('./routes/uploadMusic');
const databaseRoutes = require('./routes/database');

app.use(express.json());
app.get('/', (req, res) => {
    res.send('🎶 Ласкаво просимо на мій аудіо-сервер!');
});

app.use('/', fileRoutes);
app.use('/', updateFirebaseRoutes);
app.use('/', uploadRoutes);
app.use('/db', databaseRoutes);

app.listen(port, () => {
    console.log(`✅ Server running: http://localhost:${port}`);
});