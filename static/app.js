document.addEventListener('DOMContentLoaded', () => {
    console.log(">>> JS CARGADO CORRECTAMENTE <<<");

    const API_URL = window.location.origin;

    // 1. IDs EXACTOS DEL HTML
    const inpId = document.getElementById('image-id-input');
    const btnSearch = document.getElementById('btn-search');
    const btnRandom = document.getElementById('btn-random');
    
    const statusMsg = document.getElementById('status-msg');
    const errorBox = document.getElementById('error-box');
    const patLbl = document.getElementById('patient-lbl');
    const mainResults = document.getElementById('main-results');

    // 2. CHECK DE SEGURIDAD
    if (!btnSearch) {
        console.error("ERROR: No encuentro el botón de búsqueda.");
        return;
    }

    // 3. LISTENERS
    btnSearch.addEventListener('click', () => {
        console.log("Botón buscar clickeado");
        const id = inpId.value;
        if(!id) return alert("Ingresa un ID numérico");
        loadData(`/api/image/index/${id}/`);
    });

    btnRandom.addEventListener('click', () => {
        console.log("Botón aleatorio clickeado");
        loadData(`/api/images/random/1/`);
    });

    // 4. CARGA DE DATOS
    async function loadData(url) {
        // UI Reset
        statusMsg.classList.remove('hidden');
        mainResults.classList.add('hidden');
        errorBox.classList.add('hidden');
        patLbl.classList.add('hidden');

        try {
            console.log(`Fetching: ${API_URL}${url}`);
            const res = await fetch(`${API_URL}${url}`);
            
            if(!res.ok) throw new Error(`Error API: ${res.statusText}`);
            
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

    // 5. PINTAR RESULTADOS
    function display(data) {
        statusMsg.classList.add('hidden');
        mainResults.classList.remove('hidden');
        patLbl.classList.remove('hidden');
        patLbl.textContent = `Paciente: ${data.patient_id || 'Desconocido'}`;

        // Scores
        updateScore('score-r50', data.prediction_resnet50);
        updateScore('score-alex', data.prediction_alexnet);
        updateScore('score-r18', data.prediction_resnet18);

        // Imágenes (Usamos los prefijos cv-r50, cv-alex, cv-r18)
        paintRow('cv-r50', data.mri_image_64x64, data.mask_image_64x64);
        paintRow('cv-alex', data.mri_image_64x64, data.mask_image_64x64);
        paintRow('cv-r18', data.mri_image_64x64, data.mask_image_64x64);
    }

    function updateScore(id, pred) {
        const el = document.getElementById(id);
        if(!el) return;

        if(pred) {
            const pct = (pred['1'] * 100).toFixed(2);
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

        // TRUCO DE RESOLUCIÓN: Ajustar al tamaño de datos (64)
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
                } else { // Overlay
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