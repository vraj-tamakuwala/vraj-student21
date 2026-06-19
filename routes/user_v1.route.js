const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const demoLogger = require('../util/logger').demoLogger(module);

require('dotenv').config();

const router = express.Router();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const generateToken = (user) => {
    const token = jwt.sign({ id: user.id }, process.env.DEMO_JWT_SECRET, { expiresIn: '1h' });
    return token;
}

const authenticateAPIKey = (req, res, next) => {
    const authKey = req.get('X-API-Key');
    
    if (!authKey || authKey !== process.env.DEMO_X_API_KEY) {
        return res.status(401).json({ message: 'Invalid API key.' });
    }
    
    next();
};

router.post('/register', authenticateAPIKey, async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 8);
        
        const result = await pool.query('INSERT INTO et_user (username, password) VALUES ($1, $2) RETURNING id, username', [username, hashedPassword]);

        const token = generateToken({ id: result.rows[0].id });

        res.status(201).send({ id: result.rows[0].id, username, token });
    } catch (error) {
        demoLogger.error(error);
        res.status(500).json({ message: error.message });
    }
});

router.get('/register-test-user', async (req, res) => {
    try {
                       
        const username = req.query.username;
        const password = "password";
        const hashedPassword = await bcrypt.hash(password, 8); 
        
        const result = await pool.query('INSERT INTO et_user (username, password) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING RETURNING id', [username, hashedPassword]);

        var userID = 0;

        if (result.rowCount === 0) {
            // The INSERT did not add a new row because of a conflict.
            // Fetch the ID of the existing row with that username.
            const existingUserResult = await pool.query('SELECT id FROM et_user WHERE username = $1', [username]);
            userID = existingUserResult.rows[0].id;
        } else {
            userID = result.rows[0].id;
        }

        const token = generateToken({ id: userID });
        res.status(201).send({ id: userID, username, token });
    } catch (error) {
        demoLogger.error(error);
        res.status(500).json({ message: error.message });
    }
});

router.post('/login', authenticateAPIKey, async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await pool.query('SELECT * FROM et_user WHERE username = $1', [username]);

        const user = result.rows[0];

        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).send({ message: 'Username or password is incorrect' });
        }

        const token = generateToken({ id: user.id });

        res.send({ id: user.id, username, token });
    } catch (error) {
        demoLogger.error(error);        
        res.status(500).json({ message: error.message });
    }
});

router.get('/:id', authenticateAPIKey, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT id, username FROM et_user WHERE id = $1', [id]);

        if (!result.rows[0]) {
            return res.status(404).send({ message: 'User not found' });
        }

        res.send(result.rows[0]);
    } catch (error) {
        demoLogger.error(error);        
        res.status(500).json({ message: error.message });
    }
});

router.put('/:id', authenticateAPIKey, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password } = req.body;

        const hashedPassword = await bcrypt.hash(password, 8);
        
        await pool.query('UPDATE et_user SET username = $1, password = $2 WHERE id = $3', [username, hashedPassword, id]);

        res.send({ message: 'User updated successfully' });
    } catch (error) {
        demoLogger.error(error);        
        res.status(500).json({ message: error.message });
    }
});

router.delete('/:id', authenticateAPIKey, async (req, res) => {
    try {
        const { id } = req.params;
        
        await pool.query('DELETE FROM et_user WHERE id = $1', [id]);

        res.send({ message: 'User deleted successfully' });
    } catch (error) {
        demoLogger.error(error);        
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;