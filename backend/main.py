import cv2
import numpy as np
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, db
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize Firebase
# Note: You need to provide the path to your service account key or use env variables
firebase_config = os.getenv('FIREBASE_CONFIG_PATH')
if firebase_config:
    cred = credentials.Certificate(firebase_config)
    firebase_admin.initialize_app(cred, {
        'databaseURL': os.getenv('FIREBASE_DATABASE_URL')
    })

orb = cv2.ORB_create(nfeatures=500)
bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)

def base64_to_image(base64_string):
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    img_data = base64.b64decode(base64_string)
    nparr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "engine": "OpenCV Python"})

@app.route('/extract-features', methods=['POST'])
def extract_features():
    try:
        data = request.json
        image_data = data.get('image')
        if not image_data:
            return jsonify({"error": "No image data provided"}), 400

        img = base64_to_image(image_data)
        kp, des = orb.detectAndCompute(img, None)

        if des is None:
            return jsonify({"error": "No features found"}), 400

        # Convert descriptors to list for JSON serialization
        return jsonify({
            "descriptors": des.tolist(),
            "rows": des.shape[0],
            "cols": des.shape[1]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/match-face', methods=['POST'])
def match_face():
    try:
        data = request.json
        query_image = data.get('image')
        profiles = data.get('profiles', []) # List of profiles with descriptors

        if not query_image or not profiles:
            return jsonify({"error": "Missing image or profiles"}), 400

        img = base64_to_image(query_image)
        kp_query, des_query = orb.detectAndCompute(img, None)

        if des_query is None:
            return jsonify({"match": None, "reason": "No features in query"})

        best_match = None
        max_good_matches = 0

        for profile in profiles:
            if 'descriptors' not in profile or not profile['descriptors']:
                continue
            
            des_db = np.array(profile['descriptors'], dtype=np.uint8)
            matches = bf.match(des_query, des_db)
            
            # Filter good matches
            good_matches = [m for m in matches if m.distance < 50]
            
            if len(good_matches) > max_good_matches and len(good_matches) > 30:
                max_good_matches = len(good_matches)
                best_match = profile['id']

        return jsonify({"match": best_match, "score": max_good_matches})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
