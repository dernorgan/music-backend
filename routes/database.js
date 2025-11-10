const express = require('express');
const router = express.Router();
const { firestore } = require('../services/firebase');

// Колекція в Firestore
const COLLECTION = 'tracks'; // або 'users', 'files', будь-що

// Створити новий документ
router.post('/', async (req, res) => {
    try {
        const data = req.body;
        const docRef = await firestore.collection(COLLECTION).add(data);
        res.json({ id: docRef.id });
    } catch (error) {
        console.error('Create error:', error);
        res.status(500).send('Failed to create document');
    }
});

// Отримати всі документи
router.get('/', async (req, res) => {
    try {
        const snapshot = await firestore.collection(COLLECTION).get();
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(docs);
    } catch (error) {
        console.error('Read error:', error);
        res.status(500).send('Failed to fetch documents');
    }
});

// Отримати один документ по ID
router.get('/:id', async (req, res) => {
    try {
        const doc = await firestore.collection(COLLECTION).doc(req.params.id).get();
        if (!doc.exists) return res.status(404).send('Not found');
        res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
        console.error('Read one error:', error);
        res.status(500).send('Failed to fetch document');
    }
});

// Оновити документ
router.put('/:id', async (req, res) => {
    try {
        await firestore.collection(COLLECTION).doc(req.params.id).update(req.body);
        res.send('Document updated');
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).send('Failed to update document');
    }
});

// Видалити документ
router.delete('/:id', async (req, res) => {
    try {
        await firestore.collection(COLLECTION).doc(req.params.id).delete();
        res.send('Document deleted');
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).send('Failed to delete document');
    }
});

module.exports = router;
