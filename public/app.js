// public/app.js - COD ACTUALIZAT CU MĂSURI DE SIGURANȚĂ

let proiecteSalvate = []; 

async function incarcaProiecte() {
    try {
        const token = localStorage.getItem('tokenAuth');

        // MĂSURĂ DE SIGURANȚĂ: Dacă nu există token, oprim funcția din start
        if (!token) {
            console.error("Nu s-a găsit niciun token. Utilizatorul nu este logat.");
            return;
        }

        const raspuns = await fetch('/api/proiecte', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            }
        });

        // Verificăm specific dacă primim eroarea 403 pentru a oferi un mesaj clar
        if (raspuns.status === 403) {
            console.error("Eroare 403: Serverul a respins token-ul. (Verifică JWT_SECRET în Vercel sau codul backend)");
            return;
        }

        if (!raspuns.ok) {
            console.error("Eroare de la server:", raspuns.status);
            return;
        }

        proiecteSalvate = await raspuns.json(); 
        
        const corpTabel = document.getElementById('tabelDate');
        corpTabel.innerHTML = ''; 
        
        proiecteSalvate.forEach(p => {
            const rand = document.createElement('tr');
            
            rand.innerHTML = `
            <td>${p.responsabil}</td>
                <td>${p.enabler}</td>
                <td>${p.proiect}</td>
                <td>${p.perioada}</td>
                <td>${p.pozitii}</td>
                <td>${p.bani}</td>
                <td>${p.locatie}</td>
                <td>${p.output}</td>
                <td>
                    <button type="button" class="btn btn-sm btn-primary me-2 shadow-sm" style="cursor: pointer;" onclick="editeazaProiect('${p.id}')">Editează</button>
                    <button type="button" class="btn btn-sm btn-danger me-2 shadow-sm" style="cursor: pointer;" onclick="stergeProiect('${p.id}')">Șterge</button>
                </td>
            `;
            corpTabel.appendChild(rand);
        });
    } catch (eroare) {
        console.error('Eroare tehnică la încărcarea datelor:', eroare);
    }
}

// Funcția care se activează la apăsarea butonului "Editează"
function editeazaProiect(id) {
    document.getElementById('responsabil').value = proiect.responsabil || '';
    console.log("S-a apăsat butonul Editează pentru ID-ul:", id);
    
    const proiect = proiecteSalvate.find(p => p.id == id);
    
    if (!proiect) {
        console.error("Eroare: Nu am găsit proiectul.");
        return; 
    }
    const responsabil = document.getElementById('responsabil').value;
// Adaugă 'responsabil' în obiectul pe care îl trimiți către backend
    document.getElementById('proiectId').value = proiect.id; 
    document.getElementById('enabler').value = proiect.enabler || '';
    document.getElementById('proiect').value = proiect.proiect || '';
    
    if (proiect.perioada) {
        const dateCalendar = proiect.perioada.split(' / ');
        if(dateCalendar.length === 2) {
            document.getElementById('dataStart').value = dateCalendar[0];
            document.getElementById('dataEnd').value = dateCalendar[1];
        }
    }
    
    document.getElementById('pozitii').value = proiect.pozitii || '';
    document.getElementById('bani').value = proiect.bani || '';
    document.getElementById('locatie').value = proiect.locatie || '';
    document.getElementById('output').value = proiect.output || '';
    
    document.querySelector('button[type="submit"]').innerText = 'Actualizează Proiectul';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Funcția pentru ștergere
async function stergeProiect(id) {
    if (!confirm('Ești sigur că vrei să ștergi acest proiect?')) return;
    
    try {
        const token = localStorage.getItem('tokenAuth');
        if (!token) return alert('Trebuie să fii logat pentru a șterge!');

        const raspuns = await fetch(`/api/proiecte/${id}`, { 
            method: 'DELETE',
            headers: { 
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (raspuns.status === 403) {
            return alert("Sesiune invalidă! Serverul a respins token-ul.");
        }

        if (raspuns.ok) {
            console.log("Proiect șters cu succes!");
            incarcaProiecte(); 
        } else {
            alert("Nu s-a putut șterge proiectul. Verifică consola.");
        }
    } catch (eroare) {
        console.error('Eroare tehnică la ștergere:', eroare);
    }
}

// Interceptarea formularului (Creare / Actualizare)
const formularProiect = document.getElementById('formularProiect');

if (formularProiect) {
    formularProiect.addEventListener('submit', async (eveniment) => {
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

        const metoda = idEditare ? 'PUT' : 'POST';
        const urlServer = idEditare ? `/api/proiecte/${idEditare}` : '/api/proiecte';
        
        const token = localStorage.getItem('tokenAuth');
        if (!token) {
            alert('Sesiune expirată. Te rog să te loghezi din nou!');
            return;
        }

        try {
            const raspuns = await fetch(urlServer, {
                method: metoda,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dateFormular)
            });

            if (raspuns.status === 403) {
                alert("Eroare de autorizare! Serverul a respins acțiunea.");
                return;
            }

            if (raspuns.ok) {
                formularProiect.reset();
                document.getElementById('proiectId').value = ''; 
                document.querySelector('button[type="submit"]').innerText = 'Salvează în Baza de Date';
                incarcaProiecte();
            } else {
                alert('A apărut o eroare la salvarea în baza de date.');
            }
        } catch (eroare) {
            console.error('Eroare la trimiterea datelor:', eroare);
        }
    });
}

// Încărcăm proiectele la deschiderea paginii
incarcaProiecte();