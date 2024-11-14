const express = require('express');
const admin = require('firebase-admin');

const serviceAccount = require('./service_account.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Route: User Login
app.post('/login', async (req, res) => {
    try {
        const { uid, displayName, email } = req.body;

        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            // Create a new user if not exists
            await userRef.set({ uid, displayName, email });
            res.status(201).json({ message: 'User created', uid });
        } else {
            res.status(200).json({ message: 'User already exists', uid });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error logging in', details: error.message });
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
        res.status(500).json({ error: 'Error fetching tasks', details: error.message });
    }
});

// Route: Get Task by ID
app.get('/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const taskDoc = await db.collection('tasks').doc(id).get();

        if (!taskDoc.exists) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.status(200).json({ id: taskDoc.id, ...taskDoc.data() });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching task', details: error.message });
    }
});

// Route: Create a New Task
app.post('/tasks', async (req, res) => {
    try {
        const { id, userId, title, description, category, dueDate, status } = req.body;

        const newTask = { id, userId, title, description, category, dueDate, status };
        await db.collection('tasks').doc(id).set(newTask);
        
        res.status(201).json({ message: 'Task created', id });
    } catch (error) {
        res.status(500).json({ error: 'Error creating task', details: error.message });
    }
});

// Route: Create or Update list of Tasks
app.post('/tasks/batch', async (req, res) => {
    try {
        const tasks = req.body;

        const batch = db.batch();
        tasks.forEach(task => {
            const taskRef = db.collection('tasks').doc(task.id);
            batch.set(taskRef, task);
        });

        await batch.commit();
        res.status(201).json({ message: 'Tasks created/updated' });
    } catch (error) {
        res.status(500).json({ error: 'Error creating/updating tasks', details: error.message });
    }
});

// Route: Update a Task
app.put('/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;

        await db.collection('tasks').doc(id).update(updatedData);
        res.status(200).json({ message: 'Task updated', id });
    } catch (error) {
        res.status(500).json({ error: 'Error updating task', details: error.message });
    }
});

// Route: Delete a Task
app.delete('/tasks', async (req, res) => {
    try {
        const { id } = req.query;

        await db.collection('tasks').doc(id).delete();
        res.status(200).json({ message: 'Task deleted', id });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting task', details: error.message });
    }
});

// Route: Delete list of Tasks (Batch Delete)
app.delete('/tasks/batch', async (req, res) => {
    try {
        const taskIds = req.body;

        if (!Array.isArray(taskIds) || taskIds.length === 0) {
            return res.status(400).json({ error: 'Invalid taskIds array in request body' });
        }

        const batch = db.batch();
        taskIds.forEach(taskId => {
            const taskRef = db.collection('tasks').doc(taskId);
            batch.delete(taskRef);
        });

        await batch.commit();
        res.status(200).json({ message: 'Tasks deleted successfully', deletedTaskIds: taskIds });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting tasks', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
