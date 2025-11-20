// CAMBIAR ESTO POR TU URL DE RENDER AL DESPLEGAR
const API_BASE_URL = window.location.origin;
// const API_BASE_URL = 'http://127.0.0.1:8000'; // Local

const btnSearch = document.getElementById('btn-search');
const btnRandom = document.getElementById('btn-random');
const inputId = document.getElementById('image-id-input');
const resultsArea = document.getElementById('results-area');
const loading = document.getElementById('loading');
const errorMsg = document.getElementById('error-msg');

// Listeners
btnSearch.addEventListener('click', () => {
    const id = inputId.value;
    if (id === '' || id < 0 || id > 3928) {
        showError("Por favor ingresa un ID válido entre 0 y 3928");
        return;
    }
    fetchData(`/api/image/index/${id}/`);
});

btnRandom.addEventListener('click', () => {
    // Pedimos 1 aleatoria. Nota: Usamos el endpoint de "random" pero tomamos el primero
    fetchData(`/api/images/random/1/`, true);
});

async function fetchData(endpoint, isRandom = false) {
    showLoading();
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        if (!response.ok) throw new Error("No se pudo obtener la imagen.");
        
        let data = await response.json();
        // Si es random, la API devuelve un array, tomamos el primero
        if (Array.isArray(data)) data = data[0];

        renderTomas(data);
    } catch (error) {
        showError(error.message);
    }
}

function renderTomas(data) {
    loading.classList.add('hidden');
    errorMsg.classList.add('hidden');
    resultsArea.classList.remove('hidden');

    // Datos del paciente y predicciones
    document.getElementById('patient-id-display').textContent = `Toma: ${data.patient_id}`;
    
    // Convertir probabilidad a porcentaje
    const resnetVal = (data.prediction_resnet50['1'] * 100).toFixed(2);
    const alexnetVal = (data.prediction_alexnet['1'] * 100).toFixed(2);
    
    document.getElementById('pred-resnet').textContent = `ResNet50: ${resnetVal}% Tumor`;
    document.getElementById('pred-alexnet').textContent = `AlexNet: ${alexnetVal}% Tumor`;

    // Obtener los contextos de los 3 canvas
    const ctxMRI = document.getElementById('canvas-mri').getContext('2d');
    const ctxMask = document.getElementById('canvas-mask').getContext('2d');
    const ctxOverlay = document.getElementById('canvas-overlay').getContext('2d');

    // --- TOMA 1: VISTA GENERAL (Solo MRI) ---
    drawToCanvas(ctxMRI, data.mri_image_64x64, null, 'mri');

    // --- TOMA 2: SOLO TUMOR (Solo Máscara) ---
    drawToCanvas(ctxMask, null, data.mask_image_64x64, 'mask');

    // --- TOMA 3: SUPERPOSICIÓN (MRI + Rojo) ---
    drawToCanvas(ctxOverlay, data.mri_image_64x64, data.mask_image_64x64, 'overlay');
}

function drawToCanvas(ctx, mriData, maskData, mode) {
    console.log(`Dibujando en modo: ${mode}`);
    
    // Tamaño fijo grande
    const CANVAS_SIZE = 400;
    
    // Configurar canvas
    ctx.canvas.width = CANVAS_SIZE;
    ctx.canvas.height = CANVAS_SIZE;
    
    console.log(`Canvas configurado a: ${CANVAS_SIZE}x${CANVAS_SIZE}`);
    
    // Tamaño de datos
    const dataSize = mriData ? mriData.length : (maskData ? maskData.length : 64);
    console.log(`Tamaño de datos: ${dataSize}x${dataSize}`);
    
    // Factor de escala
    const scale = CANVAS_SIZE / dataSize;
    console.log(`Factor de escala: ${scale}`);
    
    // Dibujar directamente pixel por pixel escalado
    for (let y = 0; y < dataSize; y++) {
        for (let x = 0; x < dataSize; x++) {
            let gray = 0;
            let maskVal = 0;

            // Obtener valores
            if (mriData && mriData[y] && mriData[y][x] !== undefined) {
                gray = Array.isArray(mriData[y][x]) ? mriData[y][x][0] : mriData[y][x];
            }
            if (maskData && maskData[y] && maskData[y][x] !== undefined) {
                maskVal = maskData[y][x];
            }

            let r, g, b;
            
            if (mode === 'mri') {
                r = g = b = gray;
            } 
            else if (mode === 'mask') {
                const val = maskVal > 127 ? 255 : 0;
                r = g = b = val;
            } 
            else if (mode === 'overlay') {
                if (maskVal > 127) {
                    r = 255; g = 0; b = 0;
                } else {
                    r = g = b = gray;
                }
            }

            // Dibujar píxel escalado
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect(x * scale, y * scale, scale, scale);
        }
    }
    
    console.log(`Dibujo completado para modo: ${mode}`);
}

// Manejo de errores y carga
function showLoading() {
    loading.classList.remove('hidden');
    resultsArea.classList.add('hidden');
    errorMsg.classList.add('hidden');
}
function showError(msg) {
    loading.classList.add('hidden');
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
}