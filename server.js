const express = require('express');
const admin = require('firebase-admin');
const app = express();
app.use(express.json());

// Initialiser Firebase
let serviceAccount;
try {
    serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
} catch (err) {
    console.error("Erreur lors du parsing de FIREBASE_CREDENTIALS:", err);
    process.exit(1);
}

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://alquiem-leaderboard-default-rtdb.europe-west1.firebasedatabase.app"
    });
    console.log("Firebase initialisé avec succès");
} catch (err) {
    console.error("Erreur lors de l'initialisation de Firebase:", err);
    process.exit(1);
}

const db = admin.database();
const leaderboardRef = db.ref('leaderboard');

let leaderboard = [];
leaderboardRef.once('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        leaderboard = Object.values(data);
        leaderboard.sort((a, b) => b.score - a.score);
        console.log("Leaderboard chargé depuis Firebase:", leaderboard);
    } else {
        console.log("Aucune donnée dans Firebase, démarrage avec un classement vide.");
    }
}).catch(err => {
    console.error("Erreur lors du chargement depuis Firebase:", err);
});

app.get('/leaderboard', (req, res) => {
    console.log("Requête GET /leaderboard, envoi:", leaderboard);
    res.json(leaderboard);
});

app.post('/leaderboard', async (req, res) => {
    const { name, score } = req.body;

    if (typeof name !== 'string' || name.trim() === '') {
        console.error("Requête POST /leaderboard invalide: 'name' doit être une chaîne non vide");
        return res.status(400).json({ success: false, error: "'name' must be a non-empty string" });
    }
    if (typeof score !== 'number' || isNaN(score) || score < 0) {
        console.error("Requête POST /leaderboard invalide: 'score' doit être un nombre positif");
        return res.status(400).json({ success: false, error: "'score' must be a positive number" });
    }

    console.log("Requête POST /leaderboard reçue:", { name, score });

    try {
        const snapshot = await leaderboardRef.orderByChild('name').equalTo(name).once('value');
        const existingData = snapshot.val();
        let existingKey = null;
        if (existingData) {
            existingKey = Object.keys(existingData)[0];
        }

        if (existingKey) {
            const existingEntry = existingData[existingKey];
            if (existingEntry.score !== score) {
                await leaderboardRef.child(existingKey).update({ score });
                console.log(`Score mis à jour pour ${name}: ${score}`);
            } else {
                console.log(`Score identique pour ${name}, aucune mise à jour.`);
            }
        } else {
            await leaderboardRef.push({ name, score });
            console.log(`Nouveau joueur ajouté: ${name} avec ${score}`);
        }

        const updatedSnapshot = await leaderboardRef.once('value');
        leaderboard = Object.values(updatedSnapshot.val() || {});
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard = leaderboard.slice(0, 10);

        console.log("Leaderboard mis à jour dans Firebase:", leaderboard);
        res.json({ success: true });
    } catch (err) {
        console.error("Erreur lors de la mise à jour dans Firebase:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/', (req, res) => {
    res.send("Serveur leaderboard actif. Utilisez /leaderboard pour accéder au classement.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur démarré sur http://localhost:${PORT}`));