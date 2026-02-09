
import pytest
from PIL import Image
from processor.image_processor import ImageProcessor
from pathlib import Path
import os

def test_rgba_to_jpeg_conversion(tmp_path):
    img_dir = tmp_path / "images"
    img_dir.mkdir()
    
    # Create an RGBA image with transparency
    # Red with 50% transparency
    rgba_img = Image.new('RGBA', (100, 100), color=(255, 0, 0, 128))
    img_path = img_dir / "transparent.png"
    rgba_img.save(img_path)
    
    # Force a .jpg extension for the output by using copy_mode and a trick
    jpeg_fake_path = img_dir / "transparent.jpg"
    rgba_img.save(jpeg_fake_path, format="PNG") # PNG data in .jpg extension
    
    processor = ImageProcessor(str(img_dir), copy_mode=False)
    
    # This should now succeed instead of raising an error
    result = processor.crop_image("transparent.jpg", 0, 0, 50, 50)
    
    assert result is not None
    assert result == "transparent.jpg"
    
    # Verify the saved image is indeed RGB and has no alpha
    with Image.open(jpeg_fake_path) as img:
        assert img.mode == "RGB"
        # Check a pixel to see if it's red (it should be red on white background)
        pixel = img.getpixel((0, 0))
        assert pixel[0] == 255
        assert pixel[1] > 0 
        assert pixel[2] > 0

def test_la_to_jpeg_conversion(tmp_path):
    img_dir = tmp_path / "images"
    img_dir.mkdir()
    
    # Create an LA image (Luminance + Alpha)
    la_img = Image.new('LA', (100, 100), color=(128, 128))
    img_path = img_dir / "gray_alpha.jpg"
    la_img.save(img_path, format="PNG")
    
    processor = ImageProcessor(str(img_dir), copy_mode=False)
    result = processor.crop_image("gray_alpha.jpg", 0, 0, 50, 50)
    
    assert result is not None
    with Image.open(img_dir / "gray_alpha.jpg") as img:
        assert img.mode == "RGB"
