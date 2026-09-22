import os
import time
import requests
import imag

class SimSat:
    def __init__(self, sequence, upload_url, fetch_url, normal=5, rapid=3):
        self.imag = sequence
        self.index = 0
        self.upload_url = upload_url
        self.fetch_url = fetch_url
        self.interval = normal
        self.normal = normal
        self.rapid = rapid

    def send(self, image_path):
        script_dir = os.path.dirname(os.path.abspath(__file__))
        absolute_image_path = os.path.join(script_dir, image_path)

        if not os.path.exists(absolute_image_path):
            print(f"Error: File not found -> {absolute_image_path}")
            return False

        try:
            with open(absolute_image_path, "rb") as f:
                # The backend Multer middleware expects the file under the key 'image'
                files = {"image": (os.path.basename(absolute_image_path), f, "image/png")}
                response = requests.post(self.upload_url, files=files)
                response.raise_for_status()
                return True
        except requests.exceptions.RequestException as e:
            print(f"API Upload Error: {e}")
            return False

    def get_latest_status(self):
        try:
            # Query the backend to get the latest DB state
            response = requests.get(self.fetch_url)
            response.raise_for_status()
            data = response.json()
            
            # If any active cyclone requires rapid monitoring, switch mode
            for cyclone in data:
                if cyclone.get("status") == "Rapid Monitoring":
                    return "Rapid Monitoring"
            return "Monitoring"
            
        except requests.exceptions.RequestException as e:
            print(f"Error fetching DB data: {e}")
            return "Monitoring" # Fallback to default

    def run(self):
        while self.index < len(self.imag):
            timestamp, image_path = self.imag[self.index]
            self.index += 1
            
            print(f"\n[{timestamp}] Transmitting {image_path}...")
            upload_success = self.send(image_path)
            
            current_status = "Monitoring"
            if upload_success:
                # Give the backend a brief moment to finish DB insertion before querying
                time.sleep(0.5) 
                current_status = self.get_latest_status()
                
                # Adjust interval based on the database status
                if current_status == "Rapid Monitoring":
                    self.interval = self.rapid
                else:
                    self.interval = self.normal
                    
            print(f"Database Status: {current_status} | Next frame in {self.interval}s")
            time.sleep(self.interval)

if __name__ == "__main__":
    UPLOAD_API = "http://localhost:3000/api/satellite/upload"
    FETCH_API = "http://localhost:3000/api/cyclones"
    
    sim = SimSat(sequence=imag.imag, upload_url=UPLOAD_API, fetch_url=FETCH_API)
    sim.run()