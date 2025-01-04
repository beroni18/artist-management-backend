// server.js
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const cors = require('cors'); // Importer cors

require('dotenv').config(); // Pour gérer les variables d'environnement

const server = express();

// Utiliser CORS
server.use(cors());

server.use(bodyParser.json());
server.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Établir la connexion à la base de données
const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "artists"
});

db.connect(function (error) {
    if (error) {
        console.error("Error connecting to DB:", error);
    } else {
        console.log("Successfully Connected to DB");
    }
});

// Configurer Multer pour le téléchargement des fichiers
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadPath = path.join(__dirname, 'uploads');
        cb(null, uploadPath);
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limite de taille de fichier (5 Mo)
    fileFilter: function(req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/; // Types de fichiers autorisés
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            return cb(new Error('Error: Fichier non valide!'));
        }
    }
});

// Intégrer les routes
const artistRoutes = require('./artists');
server.use('/api', artistRoutes);

// Middleware pour gérer les erreurs
server.use((err, req, res, next) => {
    console.error(err.message);
    res.status(500).send('Server Error');
});

server.listen(8085, function check(error) {
    if (error) {
        console.log("Error starting server:", error);
    } else {
        console.log("Server started on port 8085...");
    }
});
