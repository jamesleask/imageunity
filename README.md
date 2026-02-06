# ImageUnity

A lightweight Python web application for preparing images for LoRA training.

## Features

- 🖼️ Browse and navigate through images in a folder
- 📐 Scale images to common training sizes (512², 768², 1024²)
- ✂️ Crop images to common aspect ratios with visual selection
- 🗑️ Move unwanted images to a trash folder
- 🔒 Runs locally on your machine

## Installation

```bash
# Clone the repository
git clone https://github.com/james/imageunity.git
cd imageunity

# Install dependencies
pip install -r requirements.txt
```

## Usage

### Basic Usage

```bash
python app.py --dir /path/to/your/images
```

Then open `http://localhost:5000` in your browser.

### Command Line Options

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--dir` | `-d` | Required | Directory containing images |
| `--trash` | `-t` | None | Optional trash directory |
| `--host` | `-H` | 127.0.0.1 | Host to bind |
| `--port` | `-p` | 5000 | Port to listen on |
| `--copy` | `-c` | Off | Non-destructive mode |

### Examples

```bash
# Basic usage
python app.py --dir ./images

# With trash folder
python app.py --dir ./images --trash ./trash

# Listen on all interfaces (for network access)
python app.py --dir ./images --host 0.0.0.0

# Non-destructive mode (save copies instead of overwriting)
python app.py --dir ./images --copy
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| ← / → | Navigate images |
| Delete | Move to trash |
| 1-5 | Quick crop ratios |
| Escape | Cancel crop mode |

## Supported Image Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)
- BMP (.bmp)

## License

MIT
