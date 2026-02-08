import pytest
import os
import shutil
from pathlib import Path
from PIL import Image
from processor.image_processor import ImageProcessor

@pytest.fixture
def test_data(tmp_path):
    """Fixture to set up temporary image directory and trash directory."""
    img_dir = tmp_path / "images"
    trash_dir = tmp_path / "trash"
    img_dir.mkdir()
    trash_dir.mkdir()
    
    # Create a dummy image
    img_path = img_dir / "test.jpg"
    img = Image.new('RGB', (100, 100), color=(255, 0, 0))
    img.save(img_path)
    
    return {
        "img_dir": str(img_dir),
        "trash_dir": str(trash_dir),
        "test_image": "test.jpg",
        "test_image_path": img_path
    }

def test_list_images(test_data):
    processor = ImageProcessor(test_data["img_dir"])
    images = processor.list_images()
    assert "test.jpg" in images
    assert len(images) == 1

def test_get_image_info(test_data):
    processor = ImageProcessor(test_data["img_dir"])
    info = processor.get_image_info(test_data["test_image"])
    assert info is not None
    assert info["width"] == 100
    assert info["height"] == 100
    assert info["filename"] == "test.jpg"

def test_scale_image(test_data):
    processor = ImageProcessor(test_data["img_dir"], copy_mode=True)
    new_filename = processor.scale_image(test_data["test_image"], 50, 50)
    assert new_filename == "test_50x50.jpg"
    assert os.path.exists(os.path.join(test_data["img_dir"], new_filename))
    
    # Verify dimensions of new image
    with Image.open(os.path.join(test_data["img_dir"], new_filename)) as img:
        assert img.width == 50
        assert img.height == 50

def test_crop_image(test_data):
    processor = ImageProcessor(test_data["img_dir"], copy_mode=True)
    new_filename = processor.crop_image(test_data["test_image"], 0, 0, 50, 50)
    assert "crop" in new_filename
    assert os.path.exists(os.path.join(test_data["img_dir"], new_filename))
    
    with Image.open(os.path.join(test_data["img_dir"], new_filename)) as img:
        assert img.width == 50
        assert img.height == 50

def test_move_to_trash(test_data):
    processor = ImageProcessor(test_data["img_dir"], trash_dir=test_data["trash_dir"])
    success = processor.move_to_trash(test_data["test_image"])
    assert success is True
    assert not os.path.exists(test_data["test_image_path"])
    assert os.path.exists(os.path.join(test_data["trash_dir"], test_data["test_image"]))

def test_invalid_filename(test_data):
    processor = ImageProcessor(test_data["img_dir"])
    assert processor.is_valid_filename("test.jpg") is True
    assert processor.is_valid_filename("../test.jpg") is False
    assert processor.is_valid_filename("sub/test.jpg") is False
