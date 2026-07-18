// public/app.js - COD COMPLET ACTUALIZAT

let proiecteSalvate = []; // Variabilă globală pentru a ține minte datele afișate

async function incarcaProiecte() {
    try {
        // Luăm biletul de acces
        const token = localStorage.getItem('tokenAuth');

        // Cerem datele de la server
        const raspuns = await fetch('/api/proiecte', {
            headers: { 
                'Authorization': 'Bearer ' + token 
            }
        });

        if (!raspuns.ok) {
            console.error("Eroare de autentificare sau de la server.");
            return;
        }

        proiecteSalvate = await raspuns.json(); 
        
        const corpTabel = document.getElementById('tabelDate');
        corpTabel.innerHTML = ''; 
        
        proiecteSalvate.forEach(p => {
            const rand = document.createElement('tr');
            
            // Rândul tabelului cu noile butoane modernizate
            rand.innerHTML = `
                <td>${p.enabler}</td>
                <td>${p.proiect}</td>
                <td>${p.perioada}</td>
                <td>${p.pozitii}</td>
                <td>${p.bani}</td>
                <td>${p.locatie}</td>
                <td>${p.output}</td>
                <td>
                    <button type="button" class="btn btn-sm btn-primary me-2 shadow-sm" style="cursor: pointer;" onclick="editeazaProiect('${p.id}')">Editează</button>
                    <button type="button" class="btn btn-sm btn-primary me-2 shadow-sm" style="cursor: pointer;" onclick="stergeProiect('${p.id}')">Șterge</button>
                </td>
            `;
            corpTabel.appendChild(rand);
        });
    } catch (eroare) {
        console.error('Eroare la încărcarea datelor:', eroare);
    }
}

// Funcția care se activează la apăsarea butonului "Editează"
// Funcția care se activează la apăsarea butonului "Editează"
function editeazaProiect(id) {
    console.log("S-a apăsat butonul Editează pentru ID-ul:", id);
    
    // Folosim "==" (egalitate simplă) pentru a ignora diferențele dintre text și număr
    const proiect = proiecteSalvate.find(p => p.id == id);
    
    if (!proiect) {
        console.error("Eroare: Nu am găsit proiectul. Iată datele pe care le avem:", proiecteSalvate);
        return; // Oprim execuția dacă nu găsim proiectul
    }
    
    // Completăm formularul cu datele proiectului
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
    console.log("S-a apăsat butonul Șterge pentru ID-ul:", id);
    
    if (!confirm('Ești sigur că vrei să ștergi acest proiect?')) return;
    
    try {
        const token = localStorage.getItem('tokenAuth');
        const raspuns = await fetch(`/api/proiecte/${id}`, { 
            method: 'DELETE',
            headers: { 
                'Authorization': 'Bearer ' + token 
            }
        });
        
        if (raspuns.ok) {
            console.log("Proiect șters cu succes!");
            incarcaProiecte(); // Reîncărcăm tabelul
        } else {
            console.error("Eroare la ștergerea de pe server.");
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
        
        // Preluăm token-ul pentru salvare
        const token = localStorage.getItem('tokenAuth');

        try {
            // Aici lipsea cuvântul 'fetch'
            const raspuns = await fetch(urlServer, {
                method: metoda,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token 
                },
                body: JSON.stringify(dateFormular)
            });

            if (raspuns.ok) {
                formularProiect.reset();
                document.getElementById('proiectId').value = ''; 
                document.querySelector('button[type="submit"]').innerText = 'Salvează în Baza de Date';
                
                if (typeof incarcaProiecte === 'function') {
                    incarcaProiecte();
                }
            } else {
                alert('A apărut o eroare la salvarea în baza de date.');
            }
        } catch (eroare) {
            console.error('Eroare la trimiterea datelor:', eroare);
        }
    });
} else {
    console.log("Formularul 'formularProiect' nu este pe această pagină. Ignorăm logica de submit.");
}

// Încărcăm proiectele la deschiderea paginii
incarcaProiecte();