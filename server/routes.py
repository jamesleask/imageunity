"""
Flask routes for ImageUnity API.
"""

from flask import Blueprint, render_template, jsonify, request, send_file, current_app
from processor.image_processor import ImageProcessor
import os

bp = Blueprint('main', __name__)


def get_processor():
    """Get an ImageProcessor instance with current app config."""
    return ImageProcessor(
        image_dir=current_app.config['IMAGE_DIR'],
        trash_dir=current_app.config['TRASH_DIR'],
        copy_mode=current_app.config['COPY_MODE']
    )


@bp.route('/')
def index():
    """Serve the main HTML page."""
    return render_template(
        'index.html',
        trash_enabled=current_app.config['TRASH_DIR'] is not None,
        copy_mode=current_app.config['COPY_MODE']
    )


@bp.route('/api/images')
def list_images():
    """Return list of all images in the directory."""
    processor = get_processor()
    images = processor.list_images()
    return jsonify({'images': images, 'count': len(images)})


@bp.route('/api/image/<filename>')
def get_image(filename):
    """Serve an image file."""
    processor = get_processor()
    
    # Validate filename to prevent path traversal
    if not processor.is_valid_filename(filename):
        return jsonify({'error': 'Invalid filename'}), 400
    
    image_path = processor.get_image_path(filename)
    if not os.path.exists(image_path):
        return jsonify({'error': 'Image not found'}), 404
    
    return send_file(image_path)


@bp.route('/api/image/<filename>/info')
def get_image_info(filename):
    """Get image dimensions and metadata."""
    processor = get_processor()
    
    if not processor.is_valid_filename(filename):
        return jsonify({'error': 'Invalid filename'}), 400
    
    info = processor.get_image_info(filename)
    if info is None:
        return jsonify({'error': 'Image not found'}), 404
    
    return jsonify(info)


@bp.route('/api/image/<filename>/scale', methods=['POST'])
def scale_image(filename):
    """Scale image to specified dimensions."""
    processor = get_processor()
    
    if not processor.is_valid_filename(filename):
        return jsonify({'error': 'Invalid filename'}), 400
    
    data = request.get_json()
    if not data or 'width' not in data or 'height' not in data:
        return jsonify({'error': 'Missing width or height'}), 400
    
    try:
        width = int(data['width'])
        height = int(data['height'])
    except ValueError:
        return jsonify({'error': 'Invalid dimensions'}), 400
    
    result = processor.scale_image(filename, width, height)
    if result is None:
        return jsonify({'error': 'Failed to scale image'}), 500
    
    return jsonify({'success': True, 'filename': result})


@bp.route('/api/image/<filename>/crop', methods=['POST'])
def crop_image(filename):
    """Crop image with specified parameters."""
    processor = get_processor()
    
    if not processor.is_valid_filename(filename):
        return jsonify({'error': 'Invalid filename'}), 400
    
    data = request.get_json()
    required = ['x', 'y', 'width', 'height']
    if not data or not all(k in data for k in required):
        return jsonify({'error': 'Missing crop parameters'}), 400
    
    try:
        x = int(data['x'])
        y = int(data['y'])
        width = int(data['width'])
        height = int(data['height'])
    except ValueError:
        return jsonify({'error': 'Invalid crop parameters'}), 400
    
    result = processor.crop_image(filename, x, y, width, height)
    if result is None:
        return jsonify({'error': 'Failed to crop image'}), 500
    
    return jsonify({'success': True, 'filename': result})


@bp.route('/api/image/<filename>/trash', methods=['POST'])
def trash_image(filename):
    """Move image to trash folder."""
    processor = get_processor()
    
    if current_app.config['TRASH_DIR'] is None:
        return jsonify({'error': 'Trash not configured'}), 400
    
    if not processor.is_valid_filename(filename):
        return jsonify({'error': 'Invalid filename'}), 400
    
    success = processor.move_to_trash(filename)
    if not success:
        return jsonify({'error': 'Failed to move to trash'}), 500
    
    return jsonify({'success': True})
