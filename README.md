# ImageUnity

A lightweight Python web application for preparing images for LoRA training. Features sequential cropping, scaling, and image captioning in a streamlined, dark-themed UI.

![ImageUnity Preview](/docs/screenshot.png)

## Features

- 🖼️ **Browse & Navigate**: Quickly scroll through your dataset.
- 📐 **Smart Scaling**: Auto-detects image aspect ratios and suggests relevant resolutions.
- ✂️ **Sequential Processing**: Apply a crop and then scale to multiple resolutions in one click.
- 📝 **ML Captioning**: Edit and save `.txt` captions directly next to your images.
- 🗑️ **Smart Trash**: Moving an image to trash automatically brings its caption along.
- 🔒 **Privacy Focused**: Runs entirely locally on your machine.

## Installation

```bash
# Clone the repository
git clone https://github.com/jamesleask/imageunity.git
cd imageunity

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Usage

### Basic Usage

Make sure your virtual environment is activated:

```bash
source .venv/bin/activate
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
