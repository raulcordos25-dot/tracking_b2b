// api/index.js

// 1. Importăm bibliotecile instalate anterior
const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config(); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'un_secret_foarte_complicat_123';

// MIDDLEWARE: Verifică dacă cererea are un token valid
const verificaToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ mesaj: 'Acces refuzat. Te rog să te loghezi.' });

    jwt.verify(token, JWT_SECRET, (err, utilizator) => {
        if (err) return res.status(403).json({ mesaj: 'Sesiune expirată sau invalidă.' });
        
        req.utilizator = utilizator; 
        next(); 
    });
};

const app = express();
app.use(express.json());

// 3. Configurăm conexiunea la MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 4. Funcție pentru a crea automat tabelele
async function initializeazaBazaDeDate() {
    try {
        const connection = await pool.getConnection();
        
        // AM ADĂUGAT COLOANA 'responsabil' AICI
        const queryCreareTabel = `
            CREATE TABLE IF NOT EXISTS proiecte (
                id INT AUTO_INCREMENT PRIMARY KEY,
                enabler VARCHAR(255) NOT NULL,
                proiect VARCHAR(255) NOT NULL,
                perioada VARCHAR(100),
                pozitii INT,
                output TEXT,
                bani VARCHAR(100),
                locatie VARCHAR(255),
                responsabil VARCHAR(255) 
            )
        `;
        await connection.query(queryCreareTabel);
        connection.release();
        console.log("Tabelul 'proiecte' a fost verificat/creat cu succes!");
    } catch (error) {
        console.error("Eroare la crearea tabelului MySQL:", error.message);
    }
    
    // Creăm tabelul de utilizatori
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS utilizatori (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            parola VARCHAR(255) NOT NULL
        )
    `);

    try {
        await pool.execute(`
            ALTER TABLE proiecte 
            ADD COLUMN utilizator_id INT,
            ADD FOREIGN KEY (utilizator_id) REFERENCES utilizatori(id)
        `);
        console.log("Coloana utilizator_id a fost adăugată în tabelul proiecte.");
    } catch (eroare) {
        if (eroare.code !== 'ER_DUP_FIELDNAME') {
            console.error("Eroare la alterarea tabelului:", eroare);
        }
    }

    const [utilizatori] = await pool.execute('SELECT * FROM utilizatori');
    if (utilizatori.length === 0) {
        const parolaCriptata = await bcrypt.hash('Parola123!', 10);
        await pool.execute(
            'INSERT INTO utilizatori (email, parola) VALUES (?, ?)', 
            ['admin@tracker.ro', parolaCriptata]
        );
        console.log("Cont creat automat: admin@tracker.ro | Parola: Parola123!");
    }
}

initializeazaBazaDeDate();

// RUTA PENTRU AUTENTIFICARE
app.post('/api/login', async (req, res) => {
    const { email, parola } = req.body;
    try {
        const [utilizatori] = await pool.execute('SELECT * FROM utilizatori WHERE email = ?', [email]);
        const utilizator = utilizatori[0];

        if (!utilizator) return res.status(401).json({ mesaj: 'Email sau parolă incorectă' });

        const parolaE_Corecta = await bcrypt.compare(parola, utilizator.parola);
        if (!parolaE_Corecta) return res.status(401).json({ mesaj: 'Email sau parolă incorectă' });

        const token = jwt.sign({ id: utilizator.id, email: utilizator.email }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ mesaj: 'Autentificare reușită!', token: token });
    } catch (eroare) {
        console.error(eroare);
        res.status(500).json({ mesaj: 'Eroare de server' });
    }
});

// RUTA PENTRU ADĂUGARE UTILIZATOR NOU
app.post('/api/inregistrare', async (req, res) => {
    const { email, parola } = req.body;
    try {
        const [utilizatoriExistenti] = await pool.execute('SELECT * FROM utilizatori WHERE email = ?', [email]);
        if (utilizatoriExistenti.length > 0) {
            return res.status(400).json({ mesaj: 'Acest email există deja în sistem.' });
        }

        const parolaCriptata = await bcrypt.hash(parola, 10);
        await pool.execute(
            'INSERT INTO utilizatori (email, parola) VALUES (?, ?)', 
            [email, parolaCriptata]
        );
        res.status(201).json({ mesaj: 'Utilizatorul a fost creat cu succes!' });
    } catch (eroare) {
        console.error("Eroare la crearea contului:", eroare);
        res.status(500).json({ mesaj: 'Eroare de server la salvarea utilizatorului.' });
    }
});

// OBȚINE DOAR PROIECTELE UTILIZATORULUI CURENT
app.get('/api/proiecte', verificaToken, async (req, res) => {
    try {
        const [randuri] = await pool.execute('SELECT * FROM proiecte WHERE utilizator_id = ?', [req.utilizator.id]);
        res.json(randuri);
    } catch (eroare) {
        console.error(eroare);
        res.status(500).json({ mesaj: 'Eroare la preluarea proiectelor' });
    }
});

// ADAUGĂ UN PROIECT NOU ASOCIAT UTILIZATORULUI (POST)
app.post('/api/proiecte', verificaToken, async (req, res) => {
    const enabler = req.body.enabler || '';
    const proiect = req.body.proiect || '';
    const perioada = req.body.perioada || '';
    const pozitii = req.body.pozitii || 0;
    const bani = req.body.bani || '';
    const locatie = req.body.locatie || '';
    const output = req.body.output || '';
    const utilizator_id = req.utilizator ? req.utilizator.id : null;
    const responsabil = req.body.responsabil || '';
    
    try {
        await pool.execute(
            `INSERT INTO proiecte 
            (enabler, proiect, perioada, pozitii, bani, locatie, output, utilizator_id, responsabil) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            [enabler, proiect, perioada, pozitii, bani, locatie, output, utilizator_id, responsabil]
        );
        res.status(201).json({ mesaj: 'Proiect adăugat cu succes' });
    } catch (eroare) {
        console.error("Eroare SQL la Adăugare:", eroare);
        res.status(500).json({ mesaj: 'Eroare la adăugarea proiectului' });
    }
});

// ACTUALIZEAZĂ UN PROIECT EXISTENT (PUT)
app.put('/api/proiecte/:id', verificaToken, async (req, res) => {
    const idProiect = req.params.id;
    const enabler = req.body.enabler || '';
    const proiect = req.body.proiect || '';
    const perioada = req.body.perioada || '';
    const pozitii = req.body.pozitii || 0;
    const bani = req.body.bani || '';
    const locatie = req.body.locatie || '';
    const output = req.body.output || '';
    const utilizator_id = req.utilizator ? req.utilizator.id : null;
    const responsabil = req.body.responsabil || '';
    
    try {
        await pool.execute(
            `UPDATE proiecte 
             SET enabler = ?, proiect = ?, perioada = ?, pozitii = ?, bani = ?, locatie = ?, output = ?, responsabil = ?
             WHERE id = ? AND utilizator_id = ?`,
            [enabler, proiect, perioada, pozitii, bani, locatie, output, responsabil, idProiect, utilizator_id]
        );
        res.json({ mesaj: 'Proiect actualizat cu succes' });
    } catch (eroare) {
        console.error("Eroare SQL la Actualizare:", eroare);
        res.status(500).json({ mesaj: 'Eroare la actualizarea proiectului' });
    }
});

// ȘTERGE UN PROIECT (DELETE)
app.delete('/api/proiecte/:id', verificaToken, async (req, res) => {
    const idProiect = req.params.id;
    const utilizator_id = req.utilizator ? req.utilizator.id : null;

    try {
        await pool.execute('DELETE FROM proiecte WHERE id = ? AND utilizator_id = ?', [idProiect, utilizator_id]);
        res.json({ mesaj: 'Proiect șters' });
    } catch (eroare) {
        console.error("Eroare SQL la Ștergere:", eroare);
        res.status(500).json({ mesaj: 'Eroare la ștergerea proiectului' });
    }
});
// Pornim serverul pe un port local pentru testare
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serverul local este ONLINE! Accesează http://localhost:${PORT} în browser.`);
});
module.exports = app;