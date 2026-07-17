// public/app.js - COD COMPLET ACTUALIZAT

let proiecteSalvate = []; // Variabilă globală pentru a ține minte datele afișate

async function incarcaProiecte() {
    try {
        const raspuns = await fetch('/api/proiecte');
        proiecteSalvate = await raspuns.json(); // Salvăm datele în variabila noastră
        
        const corpTabel = document.getElementById('tabelDate');
        corpTabel.innerHTML = ''; 
        
        proiecteSalvate.forEach(p => {
            const rand = document.createElement('tr');
            
            // Am adăugat tag-urile <td> și <button> lipsă
            rand.innerHTML = `
                <td>${p.enabler}</td>
                <td>${p.proiect}</td>
                <td>${p.perioada}</td>
                <td>${p.pozitii}</td>
                <td>${p.bani}</td>
                <td>${p.locatie}</td>
                <td>${p.output}</td>
                <td>
                    <button onclick="editeazaProiect(${p.id})">Editează</button>
                    <button onclick="stergeProiect(${p.id})">Șterge</button>
                </td>
            `;
            corpTabel.appendChild(rand);
        });
    } catch (eroare) {
        console.error('Eroare la încărcarea datelor:', eroare);
    }
}

// Funcția care se activează la apăsarea butonului "Editează"
function editeazaProiect(id) {
    // Căutăm proiectul exact în lista pe care am descărcat-o
    const proiect = proiecteSalvate.find(p => p.id === id);
    
    if (proiect) {
        // Completăm formularul cu datele proiectului
        document.getElementById('proiectId').value = proiect.id; // Salvăm ID-ul în câmpul ascuns
        document.getElementById('enabler').value = proiect.enabler;
        document.getElementById('proiect').value = proiect.proiect;
        
        // Separăm datele de calendar (care erau lipite cu " / ")
        const dateCalendar = proiect.perioada.split(' / ');
        if(dateCalendar.length === 2) {
            document.getElementById('dataStart').value = dateCalendar[0];
            document.getElementById('dataEnd').value = dateCalendar[1];
        }
        
        document.getElementById('pozitii').value = proiect.pozitii;
        document.getElementById('bani').value = proiect.bani;
        document.getElementById('locatie').value = proiect.locatie;
        document.getElementById('output').value = proiect.output;
        
        // Schimbăm textul butonului pentru a fi clar că acum facem o actualizare
        document.querySelector('button[type="submit"]').innerText = 'Actualizează Proiectul';
        
        // Facem scroll automat sus la formular
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

async function stergeProiect(id) {
    if (!confirm('Ești sigur că vrei să ștergi acest proiect?')) return;
    try {
        const raspuns = await fetch(`/api/proiecte/${id}`, { method: 'DELETE' });
        if (raspuns.ok) {
            incarcaProiecte(); // Reîncărcăm tabelul dacă s-a șters cu succes
        }
    } catch (eroare) {
        console.error('Eroare la ștergere:', eroare);
    }
}

// Interceptarea formularului (aici decidem dacă CREĂM sau ACTUALIZĂM)
document.getElementById('formularProiect').addEventListener('submit', async (eveniment) => {
    eveniment.preventDefault(); 

    const idEditare = document.getElementById('proiectId').value;
    const perioadaCombinata = `${document.getElementById('dataStart').value} / ${document.getElementById('dataEnd').value}`;

    const dateFormular = {
        enabler: document.getElementById('enabler').value,
        proiect: document.getElementById('proiect').value,
        perioada: perioadaCombinata,
        pozitii: document.getElementById('pozitii').value,
        bani: document.getElementById('bani').value,
        locatie: document.getElementById('locatie').value,
        output: document.getElementById('output').value
    };

    // Dacă avem un ID în câmpul ascuns, folosim PUT (actualizare), dacă nu, folosim POST (creare)
    const metoda = idEditare ? 'PUT' : 'POST';
    const urlServer = idEditare ? `/api/proiecte/${idEditare}` : '/api/proiecte';

    try {
        const raspuns = await fetch(urlServer, {
            method: metoda,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dateFormular)
        });

        if (raspuns.ok) {
            // Curățăm formularul
            document.getElementById('formularProiect').reset();
            document.getElementById('proiectId').value = ''; // Golim ID-ul ascuns
            document.querySelector('button[type="submit"]').innerText = 'Salvează în Baza de Date'; // Resetăm butonul
            
            incarcaProiecte(); // Reîncărcăm tabelul
        } else {
            alert('A apărut o eroare la salvarea în baza de date.');
        }
    } catch (eroare) {
        console.error('Eroare la trimiterea datelor:', eroare);
    }
});

// Încărcăm proiectele la deschiderea paginii
incarcaProiecte();