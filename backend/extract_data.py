import cv2
import pytesseract
import re
import numpy as np
from PIL import Image
import os
import sys
import json
import requests
import tempfile
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
def extract_timestamp(image_path):
    # 1. Load the image
    img = cv2.imread(image_path)
    height, width, _ = img.shape
    
    # 2. Crop the bottom bar
    bottom_bar = img[height-30:height, 0:width]
    
    # 3. Preprocess for OCR
    gray = cv2.cvtColor(bottom_bar, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
    
    # 4. Extract Text
    raw_text = pytesseract.image_to_string(thresh)
    
    # 5. Parse the Date and Time using Regex
    date_match = re.search(r'(\d{1,2}\s+[A-Z]{3}\s+\d{4})', raw_text)
    time_match = re.search(r'(\d{6})', raw_text)
    
    # Safely handle missing text
    date_str = date_match.group(1) if date_match else "01 JAN 2024" # Safe fallback date
    
    if time_match:
        raw_time = time_match.group(1)
        time_str = f"{raw_time[0:2]}:{raw_time[2:4]}:{raw_time[4:6]} UTC"
    else:
        # Default to midnight if OCR misses the time
        time_str = "00:00:00 UTC" 
        
    return f"{date_str} {time_str}"

def pixel_to_latlong(px_x, px_y):
    pixel_x1, lon1 = 180, 80.0 
    pixel_x2, lon2 = 520, 90.0 
    
    pixel_y1, lat1 = 350, 10.0 
    pixel_y2, lat2 = 100, 20.0 
    
    lon_per_pixel = (lon2 - lon1) / (pixel_x2 - pixel_x1)
    lat_per_pixel = (lat2 - lat1) / (pixel_y2 - pixel_y1) 
    
    target_lon = lon1 + ((px_x - pixel_x1) * lon_per_pixel)
    target_lat = lat1 + ((px_y - pixel_y1) * lat_per_pixel)
    
    return round(target_lat, 2), round(target_lon, 2)

def find_cyclone_center_pixel(image_path):
    try:
        pil_img = Image.open(image_path).convert('RGB')
        img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    except Exception as e:
        return None

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    lower_bound = np.array([0, 100, 200]) 
    upper_bound = np.array([10, 255, 255])
    
    mask = cv2.inRange(hsv, lower_bound, upper_bound)
    M = cv2.moments(mask)
    
    if M["m00"] != 0:
        center_x = int(M["m10"] / M["m00"])
        center_y = int(M["m01"] / M["m00"])
        return center_x, center_y
        
    return None

def determine_region(lat, lon):
    if 5 <= lat <= 22 and 78 <= lon <= 95:
        return "Bay of Bengal"
    elif 5 <= lat <= 25 and 50 <= lon <= 78:
        return "Arabian Sea"
    elif -10 <= lat <= 30 and 100 <= lon <= 150:
        return "Pacific Ocean"
    return "Unknown"

def process_image_input(image_source):
    is_temp = False
    
    # Check if the input is a web URL
    if image_source.startswith(('http://', 'https://')):
        response = requests.get(image_source, stream=True)
        if response.status_code != 200:
            print(json.dumps({"error": "Failed to download image"}))
            sys.exit(1)
            
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as temp_img:
            for chunk in response.iter_content(1024):
                temp_img.write(chunk)
            image_path = temp_img.name
        is_temp = True
    else:
        # Treat as a local file path
        if not os.path.exists(image_source):
            print(json.dumps({"error": f"Local file not found: {image_source}"}))
            sys.exit(1)
        image_path = image_source

    try:
        # Extract timestamp
        timestamp = extract_timestamp(image_path)
        
        # Get coordinates
        center = find_cyclone_center_pixel(image_path)
        if center is None:
            lat, lon, region = None, None, "Unknown"
        else:
            lat, lon = pixel_to_latlong(center[0], center[1])
            region = determine_region(lat, lon)
            
        result = {
            "lat": lat,
            "lon": lon,
            "timestamp": timestamp,
            "region": region
        }
        
        # Output JSON string for Node.js to consume
        print(json.dumps(result))
        
    finally:
        # Clean up temp file only if we downloaded it from the web
        if is_temp and os.path.exists(image_path):
            os.remove(image_path)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Image URL required"}))
        sys.exit(1)
    image_input = sys.argv[1]

    
    process_image_input(image_input)

