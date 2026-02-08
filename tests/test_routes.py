import pytest
import os
import json
from pathlib import Path
from PIL import Image
from server import create_app

@pytest.fixture
def app(tmp_path):
    img_dir = tmp_path / "images"
    trash_dir = tmp_path / "trash"
    img_dir.mkdir()
    trash_dir.mkdir()
    
    # Create test image
    img_path = img_dir / "test.jpg"
    img = Image.new('RGB', (100, 100), color=(255, 0, 0))
    img.save(img_path)
    
    app = create_app(str(img_dir), str(trash_dir), copy_mode=True)
    app.config.update({
        "TESTING": True,
    })
    yield app

@pytest.fixture
def client(app):
    return app.test_client()

def test_index_route(client):
    response = client.get('/')
    assert response.status_code == 200
    assert b'ImageUnity' in response.data

def test_api_images(client):
    response = client.get('/api/images')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert "test.jpg" in data["images"]

def test_api_image_info(client):
    response = client.get('/api/image/test.jpg/info')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["width"] == 100
    assert data["height"] == 100

def test_api_scale(client):
    response = client.post('/api/image/test.jpg/scale', 
                           data=json.dumps({"width": 50, "height": 50}),
                           content_type='application/json')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["success"] is True
    assert "test_50x50.jpg" in data["filename"]

def test_api_crop(client):
    response = client.post('/api/image/test.jpg/crop', 
                           data=json.dumps({"x": 0, "y": 0, "width": 50, "height": 50}),
                           content_type='application/json')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["success"] is True

def test_api_trash(client):
    response = client.post('/api/image/test.jpg/trash')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["success"] is True

def test_api_image_not_found(client):
    response = client.get('/api/image/nonexistent.jpg/info')
    assert response.status_code == 404
