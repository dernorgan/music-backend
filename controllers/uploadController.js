const { firestore } = require('../services/firebase');
const { v4: uuidv4 } = require('uuid');

exports.uploadFile = async (req, res) => {
    try {
        const fileData = {
            id: uuidv4(),
            name: req.body.name || 'Unnamed',
            uploadedAt: new Date().toISOString()
        };

        await firestore.collection('files').add(fileData);
        res.status(200).send({ message: 'Файл завантажено', data: fileData });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).send('Помилка при завантаженні');
    }
};