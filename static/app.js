document.addEventListener('DOMContentLoaded', () => {
    console.log("--- SISTEMA INICIADO ---");

    const API_URL = window.location.origin;

    // 1. CAPTURA DE ELEMENTOS (IDs EXACTOS DEL ÚLTIMO HTML)
    const inpId = document.getElementById('image-id-input');
    const btnSearch = document.getElementById('btn-search');
    const btnRandom = document.getElementById('btn-random');
    
    // Contenedores de estado (Nombres nuevos)
    const statusMsg = document.getElementById('status-msg');
    const errorBox = document.getElementById('error-box');
    const patLbl = document.getElementById('patient-lbl');
    const mainResults = document.getElementById('main-results');

    // 2. VERIFICACIÓN DE SEGURIDAD
    if (!btnSearch || !statusMsg) {
        console.error("ERROR CRÍTICO: IDs de HTML no coinciden con JS. Revisa tu index.html");
        return;
    }

    // 3. LISTENERS (BOTONES)
    btnSearch.addEventListener('click', () => {
        const id = inpId.value;
        if(!id) return alert("Por favor, escribe un número de ID.");
        loadData(`/api/image/index/${id}/`);
    });

    btnRandom.addEventListener('click', () => {
        loadData(`/api/images/random/1/`);
    });

    // 4. FUNCIÓN PRINCIPAL DE CARGA
    async function loadData(endpoint) {
        // Reseteamos la interfaz (Ocultar todo, mostrar cargando)
        if(statusMsg) statusMsg.classList.remove('hidden');
        if(mainResults) mainResults.classList.add('hidden');
        if(errorBox) errorBox.classList.add('hidden');
        if(patLbl) patLbl.classList.add('hidden');

        try {
            console.log(`Consultando: ${API_URL}${endpoint}`);
            const res = await fetch(`${API_URL}${endpoint}`);
            
            if(!res.ok) throw new Error(`Error ${res.status}: No se encontró la imagen o falló la red.`);
            
            let data = await res.json();
            if(Array.isArray(data)) data = data[0];

            displayResults(data);

        } catch (e) {
            console.error(e);
            if(statusMsg) statusMsg.classList.add('hidden');
            if(errorBox) {
                errorBox.textContent = e.message;
                errorBox.classList.remove('hidden');
            }
        }
    }

    // 5. FUNCIÓN DE PINTADO (RENDER)
    function displayResults(data) {
        // Ocultar carga, mostrar resultados
        if(statusMsg) statusMsg.classList.add('hidden');
        if(mainResults) mainResults.classList.remove('hidden');
        if(patLbl) {
            patLbl.classList.remove('hidden');
            patLbl.textContent = `Paciente: ${data.patient_id || 'Desconocido'}`;
        }

        // --- PINTAR SCORES ---
        updateScore('score-r50', data.prediction_resnet50);
        updateScore('score-alex', data.prediction_alexnet);
        updateScore('score-r18', data.prediction_resnet18);

        // --- PINTAR IMÁGENES ---
        // Usamos los IDs de canvas definidos en el HTML (cv-r50-mri, etc.)
        paintRow('cv-r50', data.mri_image_64x64, data.mask_image_64x64);
        paintRow('cv-alex', data.mri_image_64x64, data.mask_image_64x64);
        paintRow('cv-r18', data.mri_image_64x64, data.mask_image_64x64);
    }

    // Helper para actualizar textos de porcentaje
    function updateScore(elementId, predictionData) {
        const el = document.getElementById(elementId);
        if(!el) return;

        if(predictionData) {
            const percent = (predictionData['1'] * 100).toFixed(2);
            el.textContent = `${percent}% Tumor`;
            // Color dinámico: Rojo si es alto, Verde si es bajo
            el.style.color = percent > 50 ? '#c0392b' : '#27ae60';
        } else {
            el.textContent = "Pendiente...";
            el.style.color = '#f39c12';
        }
    }

    // Helper para pintar una fila de 3 canvas
    function paintRow(prefix, mriData, maskData) {
        drawOnCanvas(document.getElementById(`${prefix}-mri`), mriData, null, 'mri');
        drawOnCanvas(document.getElementById(`${prefix}-mask`), null, maskData, 'mask');
        drawOnCanvas(document.getElementById(`${prefix}-over`), mriData, maskData, 'over');
    }

    // Lógica de dibujo en Canvas (Ajuste de tamaño automático)
    function drawOnCanvas(canvas, mri, mask, mode) {
        if(!canvas) return;
        const ctx = canvas.getContext('2d');

        // Detectar tamaño real (64, 96, o 128)
        const size = mri ? mri.length : (mask ? mask.length : 64);
        
        // Ajustar resolución interna
        canvas.width = size;
        canvas.height = size;

        const imgData = ctx.createImageData(size, size);
        const px = imgData.data;

        for(let y=0; y<size; y++) {
            for(let x=0; x<size; x++) {
                const i = (y*size + x) * 4;
                let g = 0, m = 0;

                // Lectura segura de datos
                if(mri && mri[y]) g = Array.isArray(mri[y][x]) ? mri[y][x][0] : mri[y][x];
                if(mask && mask[y]) m = mask[y][x];

                // Lógica de píxeles
                if(mode === 'mri') {
                    px[i]=g; px[i+1]=g; px[i+2]=g; px[i+3]=255;
                } else if (mode === 'mask') {
                    const val = m > 127 ? 255 : 0;
                    px[i]=val; px[i+1]=val; px[i+2]=val; px[i+3]=255;
                } else { // Overlay
                    if(m > 127) {
                        px[i]=255; px[i+1]=0; px[i+2]=0; px[i+3]=255; // Rojo
                    } else {
                        px[i]=g; px[i+1]=g; px[i+2]=g; px[i+3]=255; // MRI Fondo
                    }
                }
            }
        }
        ctx.putImageData(imgData, 0, 0);
    }
});