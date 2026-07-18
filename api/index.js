// api/index.js

// 1. Importăm bibliotecile instalate anterior
const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config(); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'un_secret_foarte_complicat_123';// Această linie citește datele din fișierul .env

const app = express();

// 2. Permitem serverului să înțeleagă datele trimise din formular (format JSON)
app.use(express.json());

// 3. Configurăm conexiunea la MySQL
// Folosim un "Pool" de conexiuni, care este mai stabil pe platforme serverless precum Vercel
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

// 4. Funcție pentru a crea automat tabelul în baza de date
async function initializeazaBazaDeDate() {
    try {
        const connection = await pool.getConnection();
        const queryCreareTabel = `
            CREATE TABLE IF NOT EXISTS proiecte (
                id INT AUTO_INCREMENT PRIMARY KEY,
                enabler VARCHAR(255) NOT NULL,
                proiect VARCHAR(255) NOT NULL,
                perioada VARCHAR(100),
                pozitii INT,
                output TEXT,
                bani VARCHAR(100),
                locatie VARCHAR(255)
            )
        `;
        await connection.query(queryCreareTabel);
        connection.release(); // Eliberăm conexiunea
        console.log("Tabelul 'proiecte' a fost verificat/creat cu succes!");
    } catch (error) {
        console.error("Eroare la crearea tabelului MySQL:", error.message);
    }
    // 1. Creăm tabelul de utilizatori
// 1. Creăm tabelul de utilizatori
await pool.execute(`
    CREATE TABLE IF NOT EXISTS utilizatori (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        parola VARCHAR(255) NOT NULL
    )
`);

// 2. Verificăm dacă există deja utilizatori. Dacă nu, creăm unul implicit.
const [utilizatori] = await pool.execute('SELECT * FROM utilizatori');
if (utilizatori.length === 0) {
    // Criptăm parola înainte să o salvăm
    const parolaCriptata = await bcrypt.hash('Parola123!', 10);
    await pool.execute(
        'INSERT INTO utilizatori (email, parola) VALUES (?, ?)', 
        ['admin@tracker.ro', parolaCriptata]
    );
    console.log("Cont creat automat: admin@tracker.ro | Parola: Parola123!");
        }
    }
// Apelăm funcția la pornire
initializeazaBazaDeDate();

// 5. RUTA PENTRU SALVARE (POST): Primi date de la site și le salvăm în MySQL
// RUTA PENTRU AUTENTIFICARE
// RUTA PENTRU AUTENTIFICARE
app.post('/api/login', async (req, res) => {
    const { email, parola } = req.body;

    try {
        // Aici am corectat variabila: folosim "pool" în loc de "poolLocal"
        const [utilizatori] = await pool.execute('SELECT * FROM utilizatori WHERE email = ?', [email]);
        const utilizator = utilizatori[0];

        // Dacă emailul nu există în baza de date
        if (!utilizator) {
            return res.status(401).json({ mesaj: 'Email sau parolă incorectă' });
        }

        // Comparăm parola din formular cu parola criptată din baza de date
        const parolaE_Corecta = await bcrypt.compare(parola, utilizator.parola);
        if (!parolaE_Corecta) {
            return res.status(401).json({ mesaj: 'Email sau parolă incorectă' });
        }

        // Totul este corect! Generăm biletul VIP (Token JWT) valabil 24 ore
        const token = jwt.sign({ id: utilizator.id, email: utilizator.email }, JWT_SECRET, { expiresIn: '24h' });
        
        // Trimitem biletul către browser
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
        // 1. Ne asigurăm că emailul nu este deja folosit
        const [utilizatoriExistenti] = await pool.execute('SELECT * FROM utilizatori WHERE email = ?', [email]);
        if (utilizatoriExistenti.length > 0) {
            return res.status(400).json({ mesaj: 'Acest email există deja în sistem.' });
        }

        // 2. Criptăm (ascundem) noua parolă
        const parolaCriptata = await bcrypt.hash(parola, 10);

        // 3. Salvăm noul utilizator în baza de date
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
app.post('/api/proiecte', async (req, res) => {
    // Extragem fiecare câmp din datele primite
    const { enabler, proiect, perioada, pozitii, output, bani, locatie } = req.body;
    
    // Scriem comanda SQL de inserare
    const query = `INSERT INTO proiecte (enabler, proiect, perioada, pozitii, output, bani, locatie) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    try {
        // Semnele de întrebare (?) sunt înlocuite în siguranță de valorile din array
        const [rezultat] = await pool.execute(query, [enabler, proiect, perioada, pozitii, output, bani, locatie]);
        // Răspundem cu succes
        res.status(201).json({ id: rezultat.insertId, mesaj: 'Proiect salvat cu succes!' });
    } catch (error) {
        res.status(500).json({ eroare: error.message });
    }
});

// 6. RUTA PENTRU CITIRE (GET): Luăm datele din MySQL și le trimitem la site
app.get('/api/proiecte', async (req, res) => {
    // Selectăm totul și ordonăm descrescător după ID (cele mai noi primele)
    const query = `SELECT * FROM proiecte ORDER BY id DESC`; 
    
    try {
        const [randuri] = await pool.query(query);
        res.json(randuri); // Trimitem rândurile către browserul utilizatorului
    } catch (error) {
        res.status(500).json({ eroare: error.message });
    }
});

// RUTA PENTRU ȘTERGERE (DELETE): Ștergem un proiect pe baza ID-ului
app.delete('/api/proiecte/:id', async (req, res) => {
    // Extragem ID-ul din adresa URL (ex: /api/proiecte/5)
    const idProiect = req.params.id;
    
    // Comanda SQL pentru ștergere
    const query = `DELETE FROM proiecte WHERE id = ?`;
    
    try {
        await pool.execute(query, [idProiect]);
        res.json({ mesaj: 'Proiect șters cu succes!' });
    } catch (eroare) {
        res.status(500).json({ eroare: eroare.message });
    }
});
// Am adăugat definiția rutei (ex: PUT) și handler-ul asincron
// Ruta pentru actualizarea unui proiect existent (ex: PUT /api/proiecte/:id)
app.put('/api/proiecte/:id', async (req, res) => {
    // 1. Extragem ID-ul din parametrii rutei
    const idProiect = req.params.id; 
    
    // 2. Extragem datele din corpul request-ului
    const { enabler, proiect, perioada, pozitii, output, bani, locatie } = req.body;

    const query = `UPDATE proiecte SET enabler = ?, proiect = ?, perioada = ?, pozitii = ?, output = ?, bani = ?, locatie = ? WHERE id = ?`;
    
    try {
        // 3. Executăm interogarea și captăm rezultatul
        const [rezultat] = await pool.execute(query, [enabler, proiect, perioada, pozitii, output, bani, locatie, idProiect]);
        
        // 4. Verificăm dacă s-a modificat vreun rând în baza de date
        if (rezultat.affectedRows === 0) {
            return res.status(404).json({ eroare: 'Proiectul nu a fost găsit!' });
        }

        res.json({ mesaj: 'Proiect actualizat cu succes!' });
    } catch (eroare) {
        console.error("Eroare la actualizarea proiectului:", eroare);
        res.status(500).json({ eroare: 'A apărut o problemă la server.' });
    }
});

module.exports = app;