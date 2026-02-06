/**
 * ImageUnity - Frontend Application
 */

// State management
const state = {
    images: [],
    currentIndex: 0,
    cropMode: false,
    cropRatio: null,
    cropRegion: { x: 0, y: 0, width: 0, height: 0 },
    imageInfo: null,
    isDragging: false,
    dragStart: { x: 0, y: 0 }
};

// DOM Elements
const elements = {
    mainImage: document.getElementById('main-image'),
    imageContainer: document.getElementById('image-container'),
    imageName: document.getElementById('image-name'),
    imageCounter: document.getElementById('image-counter'),
    dimensions: document.getElementById('dimensions'),
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    btnApplyCrop: document.getElementById('btn-apply-crop'),
    btnCancelCrop: document.getElementById('btn-cancel-crop'),
    btnTrash: document.getElementById('btn-trash'),
    cropOverlay: document.getElementById('crop-overlay'),
    cropRegion: document.getElementById('crop-region'),
    emptyState: document.getElementById('empty-state'),
    toast: document.getElementById('toast'),
    loading: document.getElementById('loading')
};

// Aspect ratio presets (width:height)
const RATIOS = {
    '1:1': { w: 1, h: 1 },
    '2:3': { w: 2, h: 3 },
    '3:2': { w: 3, h: 2 },
    '9:16': { w: 9, h: 16 },
    '16:9': { w: 16, h: 9 }
};

// Initialize application
async function init() {
    await loadImageList();
    setupEventListeners();

    if (state.images.length > 0) {
        displayImage(0);
    } else {
        showEmptyState();
    }
}

// Load list of images from API
async function loadImageList() {
    try {
        const response = await fetch('/api/images');
        const data = await response.json();
        state.images = data.images || [];
    } catch (error) {
        showToast('Failed to load images', 'error');
        console.error('Failed to load images:', error);
    }
}

// Display image at given index
async function displayImage(index) {
    if (index < 0 || index >= state.images.length) return;

    state.currentIndex = index;
    const filename = state.images[index];

    // Update image source with cache-busting
    elements.mainImage.src = `/api/image/${encodeURIComponent(filename)}?t=${Date.now()}`;

    // Update UI
    elements.imageName.textContent = filename;
    elements.imageCounter.textContent = `(${index + 1}/${state.images.length})`;

    // Update navigation buttons
    elements.btnPrev.disabled = index === 0;
    elements.btnNext.disabled = index === state.images.length - 1;

    // Fetch and display image info
    try {
        const response = await fetch(`/api/image/${encodeURIComponent(filename)}/info`);
        const info = await response.json();
        state.imageInfo = info;
        elements.dimensions.textContent = `Original: ${info.width} × ${info.height}`;
    } catch (error) {
        elements.dimensions.textContent = 'Original: -- × --';
    }

    // Exit crop mode when changing images
    exitCropMode();
}

// Navigation
function navigatePrev() {
    if (state.currentIndex > 0) {
        displayImage(state.currentIndex - 1);
    }
}

function navigateNext() {
    if (state.currentIndex < state.images.length - 1) {
        displayImage(state.currentIndex + 1);
    }
}

// Scale image
async function scaleImage(width, height) {
    const filename = state.images[state.currentIndex];
    showLoading(true);

    try {
        const response = await fetch(`/api/image/${encodeURIComponent(filename)}/scale`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ width, height })
        });

        const result = await response.json();

        if (result.success) {
            showToast(`Scaled to ${width}×${height}`, 'success');
            // Refresh current image
            await refreshCurrentImage();
        } else {
            showToast(result.error || 'Failed to scale', 'error');
        }
    } catch (error) {
        showToast('Failed to scale image', 'error');
        console.error('Scale error:', error);
    } finally {
        showLoading(false);
    }
}

// Crop functions
function startCrop(ratioKey) {
    const ratio = RATIOS[ratioKey];
    if (!ratio || !state.imageInfo) return;

    state.cropMode = true;
    state.cropRatio = ratio;

    // Calculate initial crop region (centered, maximum size)
    const imgRect = elements.mainImage.getBoundingClientRect();
    const containerRect = elements.imageContainer.getBoundingClientRect();

    // Calculate image display dimensions
    const displayWidth = imgRect.width;
    const displayHeight = imgRect.height;

    // Calculate crop size that fits within image
    let cropWidth, cropHeight;
    if (displayWidth / displayHeight > ratio.w / ratio.h) {
        // Image is wider than ratio
        cropHeight = displayHeight * 0.8;
        cropWidth = cropHeight * (ratio.w / ratio.h);
    } else {
        // Image is taller than ratio
        cropWidth = displayWidth * 0.8;
        cropHeight = cropWidth * (ratio.h / ratio.w);
    }

    // Center the crop region
    const offsetX = imgRect.left - containerRect.left;
    const offsetY = imgRect.top - containerRect.top;

    state.cropRegion = {
        x: offsetX + (displayWidth - cropWidth) / 2,
        y: offsetY + (displayHeight - cropHeight) / 2,
        width: cropWidth,
        height: cropHeight
    };

    // Update UI
    updateCropRegionDisplay();
    elements.cropOverlay.classList.remove('hidden');
    elements.btnApplyCrop.classList.remove('hidden');
    elements.btnCancelCrop.classList.remove('hidden');

    // Highlight active ratio button
    document.querySelectorAll('.crop-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.ratio === ratioKey);
    });
}

function updateCropRegionDisplay() {
    const { x, y, width, height } = state.cropRegion;
    elements.cropRegion.style.left = `${x}px`;
    elements.cropRegion.style.top = `${y}px`;
    elements.cropRegion.style.width = `${width}px`;
    elements.cropRegion.style.height = `${height}px`;
}

function exitCropMode() {
    state.cropMode = false;
    state.cropRatio = null;
    elements.cropOverlay.classList.add('hidden');
    elements.btnApplyCrop.classList.add('hidden');
    elements.btnCancelCrop.classList.add('hidden');
    document.querySelectorAll('.crop-btn').forEach(btn => btn.classList.remove('active'));
}

async function applyCrop() {
    if (!state.cropMode || !state.imageInfo) return;

    const filename = state.images[state.currentIndex];
    const imgRect = elements.mainImage.getBoundingClientRect();
    const containerRect = elements.imageContainer.getBoundingClientRect();

    // Calculate image offset within container
    const offsetX = imgRect.left - containerRect.left;
    const offsetY = imgRect.top - containerRect.top;

    // Convert display coordinates to image coordinates
    const scaleX = state.imageInfo.width / imgRect.width;
    const scaleY = state.imageInfo.height / imgRect.height;

    const cropX = Math.round((state.cropRegion.x - offsetX) * scaleX);
    const cropY = Math.round((state.cropRegion.y - offsetY) * scaleY);
    const cropWidth = Math.round(state.cropRegion.width * scaleX);
    const cropHeight = Math.round(state.cropRegion.height * scaleY);

    showLoading(true);

    try {
        const response = await fetch(`/api/image/${encodeURIComponent(filename)}/crop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                x: cropX,
                y: cropY,
                width: cropWidth,
                height: cropHeight
            })
        });

        const result = await response.json();

        if (result.success) {
            showToast('Cropped successfully', 'success');
            exitCropMode();
            await refreshCurrentImage();
        } else {
            showToast(result.error || 'Failed to crop', 'error');
        }
    } catch (error) {
        showToast('Failed to crop image', 'error');
        console.error('Crop error:', error);
    } finally {
        showLoading(false);
    }
}

// Trash image
async function trashImage() {
    const filename = state.images[state.currentIndex];

    if (!confirm(`Move "${filename}" to trash?`)) return;

    showLoading(true);

    try {
        const response = await fetch(`/api/image/${encodeURIComponent(filename)}/trash`, {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            showToast('Moved to trash', 'success');

            // Remove from list
            state.images.splice(state.currentIndex, 1);

            if (state.images.length === 0) {
                showEmptyState();
            } else {
                // Stay at same index or go back if at end
                const newIndex = Math.min(state.currentIndex, state.images.length - 1);
                displayImage(newIndex);
            }
        } else {
            showToast(result.error || 'Failed to trash', 'error');
        }
    } catch (error) {
        showToast('Failed to move to trash', 'error');
        console.error('Trash error:', error);
    } finally {
        showLoading(false);
    }
}

// Refresh current image after edit
async function refreshCurrentImage() {
    await loadImageList();
    if (state.currentIndex < state.images.length) {
        displayImage(state.currentIndex);
    }
}

// UI Helpers
function showEmptyState() {
    elements.imageContainer.classList.add('hidden');
    elements.emptyState.classList.remove('hidden');
}

function showToast(message, type = 'info') {
    elements.toast.textContent = message;
    elements.toast.className = `toast visible ${type}`;

    setTimeout(() => {
        elements.toast.classList.remove('visible');
    }, 3000);
}

function showLoading(show) {
    elements.loading.classList.toggle('hidden', !show);
}

// Event Listeners
function setupEventListeners() {
    // Navigation
    elements.btnPrev.addEventListener('click', navigatePrev);
    elements.btnNext.addEventListener('click', navigateNext);

    // Scale buttons
    document.querySelectorAll('.scale-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const width = parseInt(btn.dataset.width);
            const height = parseInt(btn.dataset.height);
            scaleImage(width, height);
        });
    });

    // Crop buttons
    document.querySelectorAll('.crop-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            startCrop(btn.dataset.ratio);
        });
    });

    // Crop actions
    elements.btnApplyCrop.addEventListener('click', applyCrop);
    elements.btnCancelCrop.addEventListener('click', exitCropMode);

    // Trash button
    if (elements.btnTrash) {
        elements.btnTrash.addEventListener('click', trashImage);
    }

    // Crop drag handling
    elements.cropOverlay.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);

    // Touch support
    elements.cropOverlay.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', endDrag);

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
}

// Drag handling for crop region
function startDrag(e) {
    if (!state.cropMode) return;
    state.isDragging = true;
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    state.dragStart = { x: clientX, y: clientY };
    e.preventDefault();
}

function drag(e) {
    if (!state.isDragging) return;

    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;

    const deltaX = clientX - state.dragStart.x;
    const deltaY = clientY - state.dragStart.y;

    // Get bounds
    const imgRect = elements.mainImage.getBoundingClientRect();
    const containerRect = elements.imageContainer.getBoundingClientRect();
    const offsetX = imgRect.left - containerRect.left;
    const offsetY = imgRect.top - containerRect.top;

    // Calculate new position with constraints
    let newX = state.cropRegion.x + deltaX;
    let newY = state.cropRegion.y + deltaY;

    // Constrain to image bounds
    newX = Math.max(offsetX, Math.min(newX, offsetX + imgRect.width - state.cropRegion.width));
    newY = Math.max(offsetY, Math.min(newY, offsetY + imgRect.height - state.cropRegion.height));

    state.cropRegion.x = newX;
    state.cropRegion.y = newY;

    state.dragStart = { x: clientX, y: clientY };
    updateCropRegionDisplay();
}

function endDrag() {
    state.isDragging = false;
}

function handleTouchStart(e) {
    startDrag(e);
}

function handleTouchMove(e) {
    if (state.isDragging) {
        e.preventDefault();
        drag(e);
    }
}

// Keyboard shortcuts
function handleKeyboard(e) {
    // Ignore if typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
        case 'ArrowLeft':
            navigatePrev();
            break;
        case 'ArrowRight':
            navigateNext();
            break;
        case 'Delete':
            if (elements.btnTrash) trashImage();
            break;
        case 'Escape':
            if (state.cropMode) exitCropMode();
            break;
        case '1':
            startCrop('1:1');
            break;
        case '2':
            startCrop('2:3');
            break;
        case '3':
            startCrop('3:2');
            break;
        case '4':
            startCrop('9:16');
            break;
        case '5':
            startCrop('16:9');
            break;
    }
}

// Start the application
document.addEventListener('DOMContentLoaded', init);
