"""
Image processing utilities for ImageUnity.
"""

import os
import shutil
from pathlib import Path
from typing import List, Optional, Dict
from PIL import Image

# Supported image extensions
SUPPORTED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp'}


class ImageProcessor:
    """Handles image operations: listing, scaling, cropping, and trash management."""
    
    def __init__(self, image_dir: str, trash_dir: Optional[str] = None, copy_mode: bool = False):
        """
        Initialize the image processor.
        
        Args:
            image_dir: Directory containing images
            trash_dir: Optional directory for trashed images
            copy_mode: If True, save copies instead of overwriting originals
        """
        self.image_dir = Path(image_dir)
        self.trash_dir = Path(trash_dir) if trash_dir else None
        self.copy_mode = copy_mode
    
    def list_images(self) -> List[str]:
        """
        List all supported image files in the directory.
        
        Returns:
            Sorted list of image filenames
        """
        images = []
        for f in self.image_dir.iterdir():
            if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS:
                images.append(f.name)
        return sorted(images)
    
    def is_valid_filename(self, filename: str) -> bool:
        """
        Check if filename is valid (no path traversal).
        
        Args:
            filename: The filename to validate
            
        Returns:
            True if valid, False otherwise
        """
        # Prevent path traversal
        if '..' in filename or '/' in filename or '\\' in filename:
            return False
        return True
    
    def get_image_path(self, filename: str) -> Path:
        """
        Get full path to an image file.
        
        Args:
            filename: The image filename
            
        Returns:
            Full path to the image
        """
        return self.image_dir / filename
    
    def get_image_info(self, filename: str) -> Optional[Dict]:
        """
        Get image dimensions and metadata.
        
        Args:
            filename: The image filename
            
        Returns:
            Dict with width, height, format, size, or None if error
        """
        image_path = self.get_image_path(filename)
        if not image_path.exists():
            return None
        
        try:
            with Image.open(image_path) as img:
                # Handle EXIF orientation
                img = self._apply_exif_orientation(img)
                caption_path = self.image_dir / f"{Path(filename).stem}.txt"
                return {
                    'filename': filename,
                    'width': img.width,
                    'height': img.height,
                    'format': img.format or 'Unknown',
                    'size': image_path.stat().st_size,
                    'has_caption': caption_path.exists()
                }
        except Exception:
            return None

    def get_caption(self, filename: str) -> str:
        """
        Get existing caption for an image.
        
        Args:
            filename: The image filename
            
        Returns:
            Caption text, or empty string if no caption exists
        """
        caption_path = self.image_dir / f"{Path(filename).stem}.txt"
        if caption_path.exists():
            try:
                return caption_path.read_text(encoding='utf-8').strip()
            except Exception as e:
                print(f"Error reading caption: {e}")
        return ""

    def save_caption(self, filename: str, text: str) -> bool:
        """
        Save or update a caption for an image.
        
        Args:
            filename: The image filename
            text: The caption text
            
        Returns:
            True if successful, False otherwise
        """
        caption_path = self.image_dir / f"{Path(filename).stem}.txt"
        try:
            caption_path.write_text(text, encoding='utf-8')
            return True
        except Exception as e:
            print(f"Error saving caption: {e}")
            return False
    
    def _apply_exif_orientation(self, img: Image.Image) -> Image.Image:
        """Apply EXIF orientation to image."""
        try:
            exif = img.getexif()
            orientation = exif.get(274)  # 274 is the orientation tag
            
            if orientation == 3:
                img = img.rotate(180, expand=True)
            elif orientation == 6:
                img = img.rotate(270, expand=True)
            elif orientation == 8:
                img = img.rotate(90, expand=True)
        except Exception:
            pass
        return img
    
    def _generate_output_path(self, filename: str, suffix: str) -> Path:
        """
        Generate output path based on copy mode.
        
        Args:
            filename: Original filename
            suffix: Suffix to add (e.g., '_512x512')
            
        Returns:
            Output path
        """
        path = Path(filename)
        stem = path.stem
        ext = path.suffix
        
        if self.copy_mode:
            new_name = f"{stem}{suffix}{ext}"
            return self.image_dir / new_name
        else:
            return self.image_dir / filename
    
    def scale_image(self, filename: str, width: int, height: int) -> Optional[str]:
        """
        Scale image to specified dimensions.
        
        Args:
            filename: The image filename
            width: Target width
            height: Target height
            
        Returns:
            Output filename, or None if error
        """
        image_path = self.get_image_path(filename)
        if not image_path.exists():
            return None
        
        try:
            with Image.open(image_path) as img:
                img = self._apply_exif_orientation(img)
                
                # Use LANCZOS for high-quality scaling
                scaled = img.resize((width, height), Image.Resampling.LANCZOS)
                
                # Determine output path
                if self.copy_mode:
                    output_path = self._generate_output_path(filename, f'_{width}x{height}')
                else:
                    output_path = image_path
                
                # Save using helper to handle transparency
                self._save_image(scaled, output_path, quality=95)
                
                return output_path.name
        except Exception as e:
            print(f"Error scaling image: {e}")
            return None
    
    def crop_image(self, filename: str, x: int, y: int, width: int, height: int) -> Optional[str]:
        """
        Crop image to specified region.
        
        Args:
            filename: The image filename
            x: Left edge of crop region
            y: Top edge of crop region
            width: Width of crop region
            height: Height of crop region
            
        Returns:
            Output filename, or None if error
        """
        image_path = self.get_image_path(filename)
        if not image_path.exists():
            return None
        
        try:
            with Image.open(image_path) as img:
                img = self._apply_exif_orientation(img)
                
                # Validate crop region
                if x < 0 or y < 0 or x + width > img.width or y + height > img.height:
                    return None
                
                # Crop the image
                cropped = img.crop((x, y, x + width, y + height))
                
                # Determine output path
                if self.copy_mode:
                    # Calculate aspect ratio for suffix
                    from math import gcd
                    g = gcd(width, height)
                    ratio = f"{width // g}-{height // g}"
                    output_path = self._generate_output_path(filename, f'_crop_{ratio}')
                else:
                    output_path = image_path
                
                # Save using helper to handle transparency
                self._save_image(cropped, output_path, quality=95)
                
                return output_path.name
        except Exception as e:
            print(f"Error cropping image: {e}")
            return None
    
    def _save_image(self, img: Image.Image, output_path: Path, quality: int = 95) -> None:
        """
        Save image with proper handling of alpha channel for JPEG.
        
        Args:
            img: PIL Image object
            output_path: Path to save the image to
            quality: JPG quality (if applicable)
        """
        target_ext = output_path.suffix.lower()
        
        if target_ext in {'.jpg', '.jpeg'}:
            if img.mode in ("RGBA", "P"):
                # Convert to RGBA first to handle palette images with transparency
                img = img.convert("RGBA")
                # Create white background
                new_img = Image.new("RGB", img.size, (255, 255, 255))
                # Paste using alpha channel as mask
                new_img.paste(img, mask=img.split()[3])
                img = new_img
            elif img.mode == "LA":
                new_img = Image.new("RGB", img.size, (255, 255, 255))
                # LA uses index 1 for alpha
                new_img.paste(img, mask=img.split()[1])
                img = new_img
            elif img.mode != "RGB":
                img = img.convert("RGB")
                
        # Atomic save: save to temp file first, then replace original
        temp_path = output_path.parent / f".tmp_{output_path.name}"
        try:
            img.save(temp_path, quality=quality)
            os.replace(temp_path, output_path)
        except Exception as e:
            if temp_path.exists():
                try:
                    temp_path.unlink()
                except Exception:
                    pass
            raise e

    def move_to_trash(self, filename: str) -> bool:
        """
        Move image to trash directory.
        
        Args:
            filename: The image filename
            
        Returns:
            True if successful, False otherwise
        """
        if not self.trash_dir:
            return False
        
        image_path = self.get_image_path(filename)
        if not image_path.exists():
            return False
        
        try:
            dest = self.trash_dir / filename
            # Handle filename conflicts
            if dest.exists():
                stem = Path(filename).stem
                ext = Path(filename).suffix
                counter = 1
                while dest.exists():
                    dest = self.trash_dir / f"{stem}_{counter}{ext}"
                    counter += 1
            
            shutil.move(str(image_path), str(dest))
            
            # Also move caption file if it exists
            caption_path = self.image_dir / f"{Path(filename).stem}.txt"
            if caption_path.exists():
                caption_dest = self.trash_dir / f"{dest.stem}.txt"
                try:
                    shutil.move(str(caption_path), str(caption_dest))
                except Exception as e:
                    print(f"Error moving caption to trash: {e}")

            return True
        except Exception as e:
            print(f"Error moving to trash: {e}")
            return False
