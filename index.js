const express = require('express');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK with the service account key
const serviceAccount = require('./service_account.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Route: User Login
app.post('/login', async (req, res) => {
    try {
        const { uid, displayName, email } = req.body;

        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            // Create a new user if not exists
            await userRef.set({
                uid,
                displayName,
                email
            });
            res.status(201).json({ message: 'User created' });
        } else {
            res.status(200).json({ message: 'User already exists', uid });
        }
    } catch (error) {
        res.status(500).send('Error logging in: ' + error.message);
    }
});

// Route: Get All Tasks by userId
app.get('/tasks', async (req, res) => {
    try {
        const { userId } = req.query;

        const snapshot = await db.collection('tasks').where('userId', '==', userId).get();
        const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.status(200).json(tasks);
    } catch (error) {
        res.status(500).send('Error fetching tasks: ' + error.message);
    }
});

// Route: Get Task by ID
app.get('/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const taskDoc = await db.collection('tasks').doc(id).get();
        if (!taskDoc.exists) {
            return res.status(404).send('Task not found');
        }

        res.status(200).json({ id: taskDoc.id, ...taskDoc.data() });
    } catch (error) {
        res.status(500).send('Error fetching task: ' + error.message);
    }
});

// Route: Create a New Task
app.post('/tasks', async (req, res) => {
    try {
        const { id, userId, title, description, category, dueDate, status } = req.body;

        const newTask = {
            id,
            userId,
            title,
            description,
            category,
            dueDate,
            status
        };

        const taskRef = await db.collection('tasks').doc(id).set(newTask);
        res.status(201).json({ message: 'Task created' });
    } catch (error) {
        res.status(500).send('Error creating task: ' + error.message);
    }
});

// Route: Update a Task
app.put('/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;

        await db.collection('tasks').doc(id).update(updatedData);
        res.status(200).json({ message: 'Task updated' });
    } catch (error) {
        res.status(500).send('Error updating task: ' + error.message);
    }
});

// Route: Delete a Task
app.delete('/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;

        await db.collection('tasks').doc(id).delete();
        res.status(200).json({ message: 'Task deleted' });
    } catch (error) {
        res.status(500).send('Error deleting task: ' + error.message);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
