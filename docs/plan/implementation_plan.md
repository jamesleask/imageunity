# ImageUnity - Implementation Plan

This document outlines the step-by-step implementation plan for the ImageUnity web application.

## Phase 1: Project Setup

### Step 1.1: Initialize Project Structure
Create the following directory structure:
```
imageunity/
├── app.py              # Entry point with CLI
├── requirements.txt    # Python dependencies
├── README.md           # Usage documentation
├── server/
│   ├── __init__.py
│   └── routes.py       # Flask routes
├── processor/
│   ├── __init__.py
│   └── image_processor.py
├── static/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
└── templates/
    └── index.html
```

### Step 1.2: Define Dependencies
Create `requirements.txt`:
```
Flask>=2.0.0
Pillow>=9.0.0
```

---

## Phase 2: Backend Implementation

### Step 2.1: Create Entry Point (`app.py`)
Implement CLI argument parsing:
- `--dir` / `-d`: Image directory (required)
- `--trash` / `-t`: Trash directory (optional)
- `--host` / `-H`: Bind host (default: 127.0.0.1)
- `--port` / `-p`: Bind port (default: 5000)
- `--copy` / `-c`: Non-destructive mode (save as copies instead of overwriting)

Validate directories exist, initialize Flask app, and start server.

### Step 2.2: Implement Image Processor (`processor/image_processor.py`)

#### Core Functions:
1. `list_images(directory)` → List of image filenames
2. `get_image_info(path)` → Dict with dimensions, format, size
3. `scale_image(path, width, height, copy_mode)` → Overwrite or save copy based on mode
4. `crop_image(path, x, y, w, h, copy_mode)` → Overwrite or save copy based on mode
5. `move_to_trash(path, trash_dir)` → Move file, return success

#### Implementation Details:
- Support formats: `.jpg`, `.jpeg`, `.png`, `.webp`, `.bmp`
- Use Pillow's `Image.LANCZOS` for high-quality scaling
- Preserve EXIF orientation when processing
- Generate unique filenames to avoid overwrites

### Step 2.3: Implement Flask Routes (`server/routes.py`)

| Route | Implementation |
|-------|----------------|
| `GET /` | Render `index.html` template |
| `GET /api/images` | Return JSON list of images |
| `GET /api/image/<name>` | Send file with proper MIME type |
| `GET /api/image/<name>/info` | Return dimensions and metadata |
| `POST /api/image/<name>/scale` | Body: `{width, height}`, save and respond |
| `POST /api/image/<name>/crop` | Body: `{x, y, width, height}`, save and respond |
| `POST /api/image/<name>/trash` | Move to trash, return status |

#### Security:
- Sanitize filenames to prevent path traversal
- Validate image exists before operations
- Return appropriate HTTP status codes

---

## Phase 3: Frontend Implementation

### Step 3.1: HTML Structure (`templates/index.html`)
- Header with app title and status
- Main image display area (responsive, centered)
- Navigation bar with prev/next buttons
- Action panel with scale/crop controls
- Delete button (conditionally shown if trash enabled)

### Step 3.2: Styling (`static/css/style.css`)
- Dark theme for comfortable image viewing
- Responsive layout (works on tablet and desktop)
- Button styling with clear visual hierarchy
- Overlay styling for crop selection

### Step 3.3: JavaScript Application (`static/js/app.js`)

#### State Management:
```javascript
const state = {
    images: [],
    currentIndex: 0,
    cropMode: false,
    cropRatio: null,
    cropRegion: { x: 0, y: 0, width: 0, height: 0 }
};
```

#### Core Functions:
1. `loadImageList()` - Fetch image list from API
2. `displayImage(index)` - Load and display image
3. `navigatePrev()` / `navigateNext()` - Navigation
4. `scaleImage(width, height)` - Call scale API
5. `startCrop(ratio)` - Enter crop mode
6. `applyCrop()` - Submit crop to API
7. `moveToTrash()` - Call trash API

#### Crop Interaction:
- Draw overlay on canvas
- Handle mouse/touch events for drag
- Constrain to aspect ratio
- Show visual feedback

---

## Phase 4: Integration & Polish

### Step 4.1: Wire Frontend to Backend
- Test all API endpoints manually
- Handle loading states
- Display error messages in UI

### Step 4.2: Add Keyboard Shortcuts
| Key | Action |
|-----|--------|
| ← / → | Navigate images |
| Delete | Move to trash |
| 1-5 | Quick crop ratios |
| Escape | Cancel crop mode |

### Step 4.3: Progress Indicators
- Loading spinner during operations
- Success/error toast notifications
- Image counter display

---

## Phase 5: Testing & Documentation

### Step 5.1: Manual Testing Checklist
- [ ] App starts with valid directory
- [ ] App shows error for invalid directory
- [ ] Images display correctly
- [ ] Navigation works (buttons and keyboard)
- [ ] Scale operations produce correct output
- [ ] Crop selection UI is intuitive
- [ ] Crop produces correct output
- [ ] Trash moves files correctly
- [ ] Trash button hidden when not configured
- [ ] Host binding options work

### Step 5.2: Create README
Document:
- Installation steps
- Usage examples
- Command-line options
- Keyboard shortcuts

---

## Verification Plan

### Automated Tests
Create `tests/` directory with:
```
tests/
├── test_image_processor.py
└── test_routes.py
```

Run tests with:
```bash
python -m pytest tests/ -v
```

### Browser Testing
1. Start the server:
   ```bash
   python app.py --dir ./test_images --trash ./trash
   ```
2. Open `http://localhost:5000` in browser
3. Verify all UI interactions work correctly

### Manual Verification
1. Prepare test images of various sizes and formats
2. Test each button and feature
3. Verify output files are correctly named and sized
4. Check that trash functionality works as expected

---

## Implementation Order

1. **Day 1**: Phase 1 + Step 2.1 (Project setup, CLI entry point)
2. **Day 2**: Step 2.2 (Image processor with tests)
3. **Day 3**: Step 2.3 + 3.1 (Routes + HTML structure)
4. **Day 4**: Steps 3.2-3.3 (Styling + JavaScript)
5. **Day 5**: Phase 4 (Integration, polish, keyboard shortcuts)
6. **Day 6**: Phase 5 (Testing and documentation)

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| Flask | ≥2.0.0 | Web server and routing |
| Pillow | ≥9.0.0 | Image processing |
| pytest | ≥7.0.0 | Testing (dev only) |

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Large images slow to process | Show progress indicator, process in background |
| Memory issues with large images | Use Pillow's lazy loading, limit preview size |
| Browser compatibility | Target modern browsers, use vanilla JS |
