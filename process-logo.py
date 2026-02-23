"""
Process logo image: remove white background around circle, make transparent.
Usage: python3 process-logo.py <input_path> <output_path>
"""
import sys
from PIL import Image, ImageDraw
import math

def remove_white_bg_circle(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size

    # Find the circle bounds by detecting non-white pixels
    pixels = img.load()

    # Determine the center and radius of the circular logo
    # Strategy: find bounding box of non-white content
    min_x, min_y = width, height
    max_x, max_y = 0, 0

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            # Check if pixel is not white/near-white
            if r < 240 or g < 240 or b < 240:
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)

    # Calculate center and radius from bounding box
    center_x = (min_x + max_x) / 2
    center_y = (min_y + max_y) / 2
    radius = max((max_x - min_x) / 2, (max_y - min_y) / 2)

    # Add small padding
    radius = radius + 2

    # Create circular mask
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse(
        [center_x - radius, center_y - radius, center_x + radius, center_y + radius],
        fill=255
    )

    # Apply mask - make pixels outside circle transparent
    output = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    output.paste(img, mask=mask)

    # Crop to the circle bounds with small margin
    margin = 4
    crop_box = (
        max(0, int(center_x - radius - margin)),
        max(0, int(center_y - radius - margin)),
        min(width, int(center_x + radius + margin)),
        min(height, int(center_y + radius + margin))
    )
    output = output.crop(crop_box)

    output.save(output_path, "PNG")
    print(f"Processed logo saved to {output_path}")
    print(f"Size: {output.size[0]}x{output.size[1]}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 process-logo.py <input> <output>")
        sys.exit(1)
    remove_white_bg_circle(sys.argv[1], sys.argv[2])
