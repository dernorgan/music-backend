const { firestore } = require('../services/firebase');

exports.getAllFiles = async (req, res) => {
    try {
        const snapshot = await firestore.collection('files').get();
        const files = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(files);
    } catch (error) {
        console.error('Error fetching files:', error);
        res.status(500).send('Failed to fetch files');
    }
};