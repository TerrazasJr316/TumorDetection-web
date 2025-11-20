document.addEventListener('DOMContentLoaded', () => {
    console.log("APP INICIADA CORRECTAMENTE"); // Mira la consola (F12) para ver esto

    const API_URL = window.location.origin;

    // IDs sincronizados con el HTML de arriba
    const inpId = document.getElementById('image-id-input');
    const btnSearch = document.getElementById('btn-search');
    const btnRandom = document.getElementById('btn-random');
    
    const mainDiv = document.getElementById('main-results');
    const statusMsg = document.getElementById('status-msg');
    const errorBox = document.getElementById('error-box');
    const patLbl = document.getElementById('patient-lbl');

    // Verificación de seguridad
    if (!btnSearch || !btnRandom) {
        console.error("ERROR CRÍTICO: No se encontraron los botones en el HTML");
        return;
    }

    // --- EVENT LISTENERS ---
    btnSearch.addEventListener('click', () => {
        console.log("Click en Buscar");
        const id = inpId.value;
        if(!id) return alert("Por favor ingresa un ID válido");
        loadData(`/api/image/index/${id}/`);
    });

    btnRandom.addEventListener('click', () => {
        console.log("Click en Aleatorio");
        loadData(`/api/images/random/1/`);
    });

    // --- FUNCIÓN DE CARGA ---
    async function loadData(url) {
        // Resetear interfaz
        statusMsg.classList.remove('hidden');
        mainDiv.classList.add('hidden');
        errorBox.classList.add('hidden');
        patLbl.classList.add('hidden');

        try {
            const res = await fetch(`${API_URL}${url}`);
            if(!res.ok) throw new Error("Error al conectar con la API (o ID inválido)");
            
            let data = await res.json();
            if(Array.isArray(data)) data = data[0];

            display(data);
        } catch (e) {
            console.error(e);
            statusMsg.classList.add('hidden');
            errorBox.textContent = "Error: " + e.message;
            errorBox.classList.remove('hidden');
        }
    }

    // --- FUNCIÓN DE PINTADO ---
    function display(data) {
        statusMsg.classList.add('hidden');
        mainDiv.classList.remove('hidden');
        patLbl.classList.remove('hidden');
        patLbl.textContent = `Paciente: ${data.patient_id}`;

        // 1. Scores
        setScore('score-r50', data.prediction_resnet50);
        setScore('score-alex', data.prediction_alexnet);
        setScore('score-r18', data.prediction_resnet18);

        // 2. Imágenes (Reutilizamos los datos visuales)
        paintRow('cv-r50', data.mri_image_64x64, data.mask_image_64x64);
        paintRow('cv-alex', data.mri_image_64x64, data.mask_image_64x64);
        paintRow('cv-r18', data.mri_image_64x64, data.mask_image_64x64);
    }

    function setScore(elemId, predObj) {
        const el = document.getElementById(elemId);
        if(!el) return;
        
        if(predObj) {
            const pct = (predObj['1'] * 100).toFixed(2);
            el.textContent = `${pct}% Tumor`;
            el.style.color = pct > 50 ? '#c0392b' : '#27ae60';
        } else {
            el.textContent = "Pendiente...";
            el.style.color = '#f39c12';
        }
    }

    function paintRow(prefix, mri, mask) {
        draw(document.getElementById(`${prefix}-mri`), mri, null, 'mri');
        draw(document.getElementById(`${prefix}-mask`), null, mask, 'mask');
        draw(document.getElementById(`${prefix}-over`), mri, mask, 'over');
    }

    function draw(canvas, mri, mask, mode) {
        if(!canvas) return;
        const ctx = canvas.getContext('2d');

        // TRUCO DE ESCALADO: Ajustar resolución interna a los datos
        const size = mri ? mri.length : (mask ? mask.length : 64);
        canvas.width = size;
        canvas.height = size;

        const imgData = ctx.createImageData(size, size);
        const px = imgData.data;

        for(let y=0; y<size; y++) {
            for(let x=0; x<size; x++) {
                const i = (y*size + x) * 4;
                let g = 0, m = 0;

                if(mri && mri[y]) g = Array.isArray(mri[y][x]) ? mri[y][x][0] : mri[y][x];
                if(mask && mask[y]) m = mask[y][x];

                if(mode === 'mri') {
                    px[i]=g; px[i+1]=g; px[i+2]=g; px[i+3]=255;
                } else if (mode === 'mask') {
                    const v = m > 127 ? 255 : 0;
                    px[i]=v; px[i+1]=v; px[i+2]=v; px[i+3]=255;
                } else {
                    if(m > 127) {
                        px[i]=255; px[i+1]=0; px[i+2]=0; px[i+3]=255;
                    } else {
                        px[i]=g; px[i+1]=g; px[i+2]=g; px[i+3]=255;
                    }
                }
            }
        }
        ctx.putImageData(imgData, 0, 0);
    }
});