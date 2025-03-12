const express = require('express');
const fs = require('fs');
const app = express();
app.use(express.json());

// Définir le chemin en fonction de l'environnement (local ou Render)
const LEADERBOARD_PATH = process.env.NODE_ENV === 'production' ? '/var/data/leaderboard.json' : './leaderboard.json';

// Charger les scores depuis leaderboard.json ou démarrer avec un tableau vide
let leaderboard = [];
try {
    if (fs.existsSync(LEADERBOARD_PATH)) {
        leaderboard = JSON.parse(fs.readFileSync(LEADERBOARD_PATH, 'utf8'));
        console.log("Leaderboard chargé depuis", LEADERBOARD_PATH, ":", leaderboard);
    } else {
        console.log("Fichier leaderboard.json introuvable, démarrage avec un classement vide.");
    }
} catch (err) {
    console.error("Erreur lors du chargement de leaderboard.json:", err);
    leaderboard = [];
}

app.get('/leaderboard', (req, res) => {
    console.log("Requête GET /leaderboard, envoi:", leaderboard);
    res.json(leaderboard);
});

app.post('/leaderboard', (req, res) => {
    const { name, score } = req.body;
    console.log("Requête POST /leaderboard reçue:", { name, score });

    // Vérifier si le pseudo existe déjà
    const existingIndex = leaderboard.findIndex(entry => entry.name === name);
    if (existingIndex !== -1) {
        // Pseudo existe, écraser le score si différent
        if (leaderboard[existingIndex].score !== score) {
            leaderboard[existingIndex].score = score;
            console.log(`Score mis à jour pour ${name}: ${score}`);
            leaderboard.sort((a, b) => b.score - a.score); // Retrier après mise à jour
        } else {
            console.log(`Score identique pour ${name}, aucune mise à jour.`);
        }
    } else {
        // Nouveau pseudo, ajouter au classement
        leaderboard.push({ name, score });
        leaderboard.sort((a, b) => b.score - a.score);
        console.log(`Nouveau joueur ajouté: ${name} avec ${score}`);
    }

    leaderboard = leaderboard.slice(0, 10); // Limiter à 10 entrées

    try {
        fs.writeFileSync(LEADERBOARD_PATH, JSON.stringify(leaderboard, null, 2));
        console.log("Leaderboard sauvegardé dans", LEADERBOARD_PATH, ":", leaderboard);
    } catch (err) {
        console.error("Erreur lors de l'écriture de leaderboard.json:", err);
    }
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000; // Port dynamique pour Render
app.listen(PORT, () => console.log(`Serveur démarré sur http://localhost:${PORT}`));