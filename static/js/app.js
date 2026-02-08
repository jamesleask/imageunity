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
    isResizing: false,
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
    loading: document.getElementById('loading'),
    confirmModal: document.getElementById('confirm-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalMessage: document.getElementById('modal-message'),
    modalBtnCancel: document.getElementById('modal-btn-cancel'),
    modalBtnConfirm: document.getElementById('modal-btn-confirm'),
    scaleButtons: document.getElementById('scale-buttons'),
    resizeHandle: document.querySelector('.resize-handle')
};

// Aspect ratio presets (width:height)
const RATIOS = {
    '1:1': { w: 1, h: 1, targets: [512, 768, 1024] },
    '2:3': { w: 2, h: 3, targets: [[512, 768], [682, 1024], [853, 1280]] },
    '3:2': { w: 3, h: 2, targets: [[768, 512], [1024, 682], [1280, 853]] },
    '9:16': { w: 9, h: 16, targets: [[512, 910], [576, 1024], [720, 1280]] },
    '16:9': { w: 16, h: 9, targets: [[910, 512], [1024, 576], [1280, 720]] }
};

// Initialize application
async function init() {
    await loadImageList();
    setupEventListeners();

    // Initialize Lucide icons
    if (window.lucide) {
        lucide.createIcons();
    }

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
        const response = await fetch(`/api/image/${encodeURIComponent(filename)}/info?t=${Date.now()}`);
        const info = await response.json();
        state.imageInfo = info;
        elements.dimensions.textContent = `Dimensions: ${info.width} × ${info.height}`;
    } catch (error) {
        elements.dimensions.textContent = 'Dimensions: -- × --';
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
            // Refresh current image, possibly jumping to new file
            await refreshCurrentImage(result.filename);
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

    updateScaleButtons();
}

function updateScaleButtons() {
    elements.scaleButtons.innerHTML = '';
    const ratio = state.cropRatio;

    if (!ratio) {
        // Default square buttons
        [512, 768, 1024].forEach(size => {
            const btn = document.createElement('button');
            btn.className = 'scale-btn';
            btn.dataset.width = size;
            btn.dataset.height = size;
            btn.textContent = `${size}²`;
            btn.onclick = () => scaleImage(size, size);
            elements.scaleButtons.appendChild(btn);
        });
    } else {
        // Ratio-specific buttons
        ratio.targets.forEach(target => {
            const [w, h] = Array.isArray(target) ? target : [target, target];
            const btn = document.createElement('button');
            btn.className = 'scale-btn';
            btn.dataset.width = w;
            btn.dataset.height = h;
            btn.textContent = `${w}×${h}`;
            btn.onclick = () => scaleImage(w, h);
            elements.scaleButtons.appendChild(btn);
        });
    }
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
    updateScaleButtons();
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
            await refreshCurrentImage(result.filename);
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

    const confirmed = await showModal(
        'Delete Image',
        `Are you sure you want to move "${filename}" to trash? This can be undone if a trash directory is configured.`
    );

    if (!confirmed) return;

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
async function refreshCurrentImage(newFilename = null) {
    await loadImageList();

    if (newFilename) {
        const index = state.images.indexOf(newFilename);
        if (index !== -1) {
            state.currentIndex = index;
        }
    }

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

function showModal(title, message) {
    return new Promise((resolve) => {
        elements.modalTitle.textContent = title;
        elements.modalMessage.textContent = message;
        elements.confirmModal.classList.remove('hidden');

        const onCancel = () => {
            elements.confirmModal.classList.add('hidden');
            cleanup();
            resolve(false);
        };

        const onConfirm = () => {
            elements.confirmModal.classList.add('hidden');
            cleanup();
            resolve(true);
        };

        const cleanup = () => {
            elements.modalBtnCancel.removeEventListener('click', onCancel);
            elements.modalBtnConfirm.removeEventListener('click', onConfirm);
        };

        elements.modalBtnCancel.addEventListener('click', onCancel);
        elements.modalBtnConfirm.addEventListener('click', onConfirm);
    });
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

    // Resize handle
    elements.resizeHandle.addEventListener('mousedown', (e) => {
        state.isResizing = true;
        const clientX = e.clientX || e.touches?.[0]?.clientX;
        const clientY = e.clientY || e.touches?.[0]?.clientY;
        state.dragStart = { x: clientX, y: clientY };
        e.stopPropagation();
        e.preventDefault();
    });

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
    if (!state.isDragging && !state.isResizing) return;

    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;

    const deltaX = clientX - state.dragStart.x;
    const deltaY = clientY - state.dragStart.y;

    // Get bounds
    const imgRect = elements.mainImage.getBoundingClientRect();
    const containerRect = elements.imageContainer.getBoundingClientRect();
    const offsetX = imgRect.left - containerRect.left;
    const offsetY = imgRect.top - containerRect.top;

    if (state.isResizing) {
        // Handle resizing while maintaining aspect ratio
        const ratio = state.cropRatio.w / state.cropRatio.h;
        let newWidth = state.cropRegion.width + deltaX;
        let newHeight = newWidth / ratio;

        // Constrain to image bounds
        if (state.cropRegion.x + newWidth > offsetX + imgRect.width) {
            newWidth = (offsetX + imgRect.width) - state.cropRegion.x;
            newHeight = newWidth / ratio;
        }
        if (state.cropRegion.y + newHeight > offsetY + imgRect.height) {
            newHeight = (offsetY + imgRect.height) - state.cropRegion.y;
            newWidth = newHeight * ratio;
        }

        // Minimum size constraint
        if (newWidth >= 50 && newHeight >= 50) {
            state.cropRegion.width = newWidth;
            state.cropRegion.height = newHeight;
        }
    } else {
        // Handle moving
        let newX = state.cropRegion.x + deltaX;
        let newY = state.cropRegion.y + deltaY;

        // Constrain to image bounds
        newX = Math.max(offsetX, Math.min(newX, offsetX + imgRect.width - state.cropRegion.width));
        newY = Math.max(offsetY, Math.min(newY, offsetY + imgRect.height - state.cropRegion.height));

        state.cropRegion.x = newX;
        state.cropRegion.y = newY;
    }

    state.dragStart = { x: clientX, y: clientY };
    updateCropRegionDisplay();
}

function endDrag() {
    state.isDragging = false;
    state.isResizing = false;
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
