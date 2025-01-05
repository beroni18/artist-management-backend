const express = require('express');
const router = express.Router();
const multer = require('multer');
const mysql = require('mysql2');
const path = require('path');

// Connexion à la base de données
const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "artists"
});

// Configuration de multer pour le stockage des images
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './uploads/');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/; // Types de fichiers autorisés
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Error: Fichier non valide!'));
    }
});

router.post('/artists', upload.single('artistImage'), (req, res) => {
    const { artistName, stageName, albumCount, socialMediaLinks, label, publishingHouse, careerStartDate } = req.body;
    const artistImage = req.file ? `http://artist-management-backend-api.onrender.com/uploads/${req.file.filename}` : null; // Utiliser l'URL absolue

    // Vérifiez que tous les champs requis sont présents
    if (!artistName) {
        return res.status(400).json({ error: "Le nom de l'artiste est requis." });
    }

    const query = `INSERT INTO artists (artistImage, artistName, stageName, albumCount, socialMediaLinks, label, publishingHouse, careerStartDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.query(query, [artistImage, artistName, stageName, albumCount, socialMediaLinks, label, publishingHouse, careerStartDate], (error, result) => {
        if (error) {
            console.error("Error adding artist:", error); // Erreur détaillée
            return res.status(500).json({ error: "Erreur lors de l'ajout de l'artiste" });
        }
        res.status(201).json({ message: "Artiste ajouté avec succès", artistId: result.insertId, artistImage: artistImage });
    });
});



// Récupérer un artiste par son ID
router.get('/artists/:id', (req, res) => {
    const artistId = req.params.id;
    const query = `SELECT * FROM artists WHERE artistId = ?`;

    db.query(query, [artistId], (error, result) => {
        if (error) {
            console.error("Error fetching artist:", error); // Erreur détaillée
            return res.status(500).json({ error: "Erreur lors de la récupération de l'artiste" });
        }
        if (result.length === 0) {
            return res.status(404).json({ error: "Artiste non trouvé" });
        }
        res.status(200).json(result[0]);
    });
});




// Récupérer tous les artistes avec pagination
router.get('/artists', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const query = `SELECT * FROM artists LIMIT ?, ?`;
    
    db.query(query, [offset, limit], (error, results) => {
        if (error) {
            console.error("Error fetching artists:", error); // Erreur détaillée
            return res.status(500).json({ error: "Error fetching artists" });
        }
        res.status(200).json(results);
    });
});

// Rechercher un artiste par nom ou nom de scène
router.get('/artists/search', (req, res) => {
    const searchTerm = req.query.term;
    const formattedTerm = `%${searchTerm}%`;
    console.log("Search Term:", searchTerm); // Log de la valeur de searchTerm
    console.log("Formatted Term:", formattedTerm); // Log de la valeur de formattedTerm

    const query = `SELECT * FROM artists WHERE artistName LIKE ? OR stageName LIKE ?`;
    console.log("SQL Query:", query); // Log de la requête SQL

    db.query(query, [formattedTerm, formattedTerm], (error, results) => {
        if (error) {
            console.error("Error searching for artist:", error); // Log de l'erreur
            return res.status(500).json({ error: "Error searching for artist" });
        }
        console.log("Query Results:", results); // Log des résultats de la requête SQL
        if (results.length === 0) {
            return res.status(404).json({ error: "Artiste non trouvé" });
        }
        res.status(200).json(results);
    });
});




// Ajouter une note pour un artiste
router.post('/ratings', (req, res) => {
    const { artistId, userId, ratingValue } = req.body;
    const checkQuery = 'SELECT * FROM ratings WHERE artistId = ? AND userId = ?';

    db.query(checkQuery, [artistId, userId], (checkError, checkResult) => {
        if (checkError) {
            console.error("Error checking existing ratings:", checkError); // Erreur détaillée
            return res.status(500).json({ error: "Erreur lors de la vérification des notes existantes" });
        } 
        if (checkResult.length > 0) {
            return res.status(400).json({ error: "L'utilisateur a déjà noté cet artiste" });
        }

        const insertQuery = 'INSERT INTO ratings (artistId, userId, ratingValue) VALUES (?, ?, ?)';
        db.query(insertQuery, [artistId, userId, ratingValue], (insertError) => {
            if (insertError) {
                console.error("Error adding rating:", insertError); // Erreur détaillée
                return res.status(500).json({ error: "Erreur lors de l'ajout de la note" });
            }
            res.status(201).json({ message: "Note ajoutée avec succès" });
        });
    });
});

// Calculer la moyenne des notes pour un artiste
router.get('/artists/:id/average-rating', (req, res) => {
    const artistId = req.params.id;
    const query = 'SELECT AVG(ratingValue) as averageRating FROM ratings WHERE artistId = ?';

    db.query(query, [artistId], (error, result) => {
        if (error) {
            console.error("Error calculating average rating:", error); // Erreur détaillée
            return res.status(500).json({ error: "Erreur lors du calcul de la moyenne des notes" });
        }
        res.status(200).json(result[0]);
    });
});

// Modifier un artiste
router.put('/artists/:id', upload.single('artistImage'), (req, res) => {
    const artistId = req.params.id;
    const { artistName, stageName, albumCount, socialMediaLinks, label, publishingHouse, careerStartDate } = req.body;
    const artistImage = req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : null; // Utiliser l'URL absolue

    const query = `UPDATE artists SET artistImage = ?, artistName = ?, stageName = ?, albumCount = ?, socialMediaLinks = ?, label = ?, publishingHouse = ?, careerStartDate = ? WHERE artistId = ?`;

    db.query(query, [artistImage, artistName, stageName, albumCount, socialMediaLinks, label, publishingHouse, careerStartDate, artistId], (error, result) => {
        if (error) {
            console.error("Error updating artist:", error); // Erreur détaillée
            return res.status(500).json({ error: "Error updating artist" });
        }
        const updatedArtist = {
            artistId: artistId,
            artistImage: artistImage,
            artistName: artistName,
            stageName: stageName,
            albumCount: albumCount,
            socialMediaLinks: socialMediaLinks,
            label: label,
            publishingHouse: publishingHouse,
            careerStartDate: careerStartDate
        };
        res.status(200).json(updatedArtist);
    });
});



// Supprimer un artiste
router.delete('/artists/:id', (req, res) => {
    const artistId = req.params.id;
    const query = `DELETE FROM artists WHERE artistId = ?`;

    db.query(query, [artistId], (error, result) => {
        if (error) {
            console.error("Error deleting artist:", error); // Erreur détaillée
            return res.status(500).json({ error: "Error deleting artist" });
        }
        res.status(200).json({ message: "Artist deleted successfully" });
    });
});

module.exports = router;
