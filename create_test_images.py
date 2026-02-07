from PIL import Image, ImageDraw

def create_test_image(filename, size, color, text):
    img = Image.new('RGB', size, color=color)
    d = ImageDraw.Draw(img)
    d.text((10, 10), text, fill=(255, 255, 255))
    img.save(filename)

create_test_image('test_images/red_512.jpg', (512, 512), (255, 0, 0), '512x512 Red')
create_test_image('test_images/green_1024x768.png', (1024, 768), (0, 255, 0), '1024x768 Green')
create_test_image('test_images/blue_1920x1080.webp', (1920, 1080), (0, 0, 255), '1920x1080 Blue')
