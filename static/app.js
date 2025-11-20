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
    // 1. Detectar tamaño REAL de los datos (64, 96, 128...)
    const size = mriData ? mriData.length : (maskData ? maskData.length : 128);
    
    // 2. Crear canvas interno con el tamaño real de los datos
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = size;
    tempCanvas.height = size;
    const tempCtx = tempCanvas.getContext('2d');
    
    // 3. Dibujar los datos en el canvas temporal
    const imgData = tempCtx.createImageData(size, size);
    const pixels = imgData.data;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            
            let gray = 0;
            let maskVal = 0;

            // Obtener valores de forma segura
            if (mriData && mriData[y] && mriData[y][x] !== undefined) {
                gray = Array.isArray(mriData[y][x]) ? mriData[y][x][0] : mriData[y][x];
            }
            if (maskData && maskData[y] && maskData[y][x] !== undefined) {
                maskVal = maskData[y][x];
            }

            // Lógica de coloreado
            if (mode === 'mri') {
                pixels[i] = gray; pixels[i+1] = gray; pixels[i+2] = gray; pixels[i+3] = 255;
            } 
            else if (mode === 'mask') {
                const val = maskVal > 127 ? 255 : 0;
                pixels[i] = val; pixels[i+1] = val; pixels[i+2] = val; pixels[i+3] = 255;
            } 
            else if (mode === 'overlay') {
                if (maskVal > 127) {
                    pixels[i] = 255; pixels[i+1] = 0; pixels[i+2] = 0; pixels[i+3] = 255;
                } else {
                    pixels[i] = gray; pixels[i+1] = gray; pixels[i+2] = gray; pixels[i+3] = 255;
                }
            }
        }
    }
    tempCtx.putImageData(imgData, 0, 0);
    
    // 4. ESCALAR al tamaño del canvas real manteniendo relación de aspecto
    const container = ctx.canvas.parentElement;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Configurar el canvas principal para que coincida con el tamaño del contenedor
    ctx.canvas.width = containerWidth;
    ctx.canvas.height = containerHeight;
    
    // Limpiar el canvas
    ctx.clearRect(0, 0, containerWidth, containerHeight);
    
    // Calcular el escalado para que la imagen ocupe el máximo espacio posible
    const scale = Math.min(containerWidth / size, containerHeight / size);
    const scaledWidth = size * scale;
    const scaledHeight = size * scale;
    
    // Centrar la imagen en el contenedor
    const x = (containerWidth - scaledWidth) / 2;
    const y = (containerHeight - scaledHeight) / 2;
    
    // Dibujar la imagen escalada
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tempCanvas, 0, 0, size, size, x, y, scaledWidth, scaledHeight);
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