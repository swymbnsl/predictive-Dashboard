from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import joblib
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)  # Allow requests from frontend

UPLOAD_FOLDER = 'uploads'
MODEL_PATH = 'models/model.pkl'
ALLOWED_EXTENSIONS = {'csv'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Load the trained model
model = joblib.load(MODEL_PATH)

# Check file type
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def home():
    return '🚀 Predictive Maintenance API Running'

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        try:
            # Load CSV
            df = pd.read_csv(filepath)

            # Predict
            predictions = model.predict(df.drop(columns=['Pump_ID'], errors='ignore'))

            # Add predictions to DataFrame
            df['Prediction'] = predictions

            # Save report
            output_path = os.path.join(app.config['UPLOAD_FOLDER'], f"prediction_{filename}")
            df.to_csv(output_path, index=False)

            return jsonify({
                'message': 'Prediction completed',
                'download_url': f'/download/{os.path.basename(output_path)}',
                'total_records': len(df)
            })

        except Exception as e:
            return jsonify({'error': str(e)}), 500

    return jsonify({'error': 'Invalid file format'}), 400

@app.route('/download/<filename>', methods=['GET'])
def download(filename):
    return app.send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True)
