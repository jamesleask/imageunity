"""
ImageUnity Server Package
"""

from flask import Flask
import os


def create_app(image_dir: str, trash_dir: str = None, copy_mode: bool = False):
    """
    Create and configure the Flask application.
    
    Args:
        image_dir: Path to directory containing images
        trash_dir: Optional path to trash directory
        copy_mode: If True, save copies instead of overwriting
    
    Returns:
        Configured Flask application
    """
    app = Flask(
        __name__,
        static_folder='../static',
        template_folder='../templates'
    )
    
    # Store configuration
    app.config['IMAGE_DIR'] = image_dir
    app.config['TRASH_DIR'] = trash_dir
    app.config['COPY_MODE'] = copy_mode
    
    # Register routes
    from . import routes
    app.register_blueprint(routes.bp)
    
    return app
