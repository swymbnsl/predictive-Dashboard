from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
import numpy as np
import os
import joblib
import pickle
from werkzeug.utils import secure_filename
from sklearn.preprocessing import LabelEncoder
from collections import Counter

app = Flask(__name__)
CORS(app)

# Config
UPLOAD_FOLDER = 'uploads'
MODEL_PATH = 'models/model.pkl'
SCALER_PATH = 'models/scaler.pkl'
FEATURES_PATH = 'models/features.pkl'
ALLOWED_EXTENSIONS = {'csv'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Load model, scaler, features
model = joblib.load(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)
with open(FEATURES_PATH, 'rb') as f:
    required_features = pickle.load(f)

# Label encoder for decoding predicted classes
le = LabelEncoder()
fault_labels = ['Bearing Fault', 'Cavitation', 'Imbalance', 'Misalignment', 'Normal']
le.fit(fault_labels)
print("Label encoding map:", dict(zip(le.classes_, le.transform(le.classes_))))

# Required input columns
base_columns = [
    'Rotational_Speed_RPM',
    'Torque_Nm',
    'Vibration_X_mm_s',
    'Vibration_Y_mm_s',
    'Vibration_Z_mm_s',
    'Temperature_C',
    'Pressure_bar',
    'Flow_Rate_LPM'
]

@app.route('/')
def home():
    return '✅ Predictive Maintenance API is running'

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        try:
            df = pd.read_csv(filepath)

            # Validate input columns
            missing_cols = [col for col in base_columns if col not in df.columns]
            if missing_cols:
                return jsonify({'error': f'Missing required columns: {missing_cols}'}), 400

            # Fill NaNs
            df[base_columns] = df[base_columns].fillna(df[base_columns].mean())

            # Feature Engineering
            df['Vibration_Mean'] = df[['Vibration_X_mm_s', 'Vibration_Y_mm_s', 'Vibration_Z_mm_s']].mean(axis=1)
            df['Vibration_Std'] = df[['Vibration_X_mm_s', 'Vibration_Y_mm_s', 'Vibration_Z_mm_s']].std(axis=1)
            df['Vibration_Range'] = df[['Vibration_X_mm_s', 'Vibration_Y_mm_s', 'Vibration_Z_mm_s']].max(axis=1) - \
                                    df[['Vibration_X_mm_s', 'Vibration_Y_mm_s', 'Vibration_Z_mm_s']].min(axis=1)
            df['Flow_to_Pressure'] = df['Flow_Rate_LPM'] / (df['Pressure_bar'] + 1e-3)
            df['Torque_RPM'] = df['Torque_Nm'] * df['Rotational_Speed_RPM']
            df['Temp_Pressure'] = df['Temperature_C'] * df['Pressure_bar']

            # Replace inf/nan
            df.replace([np.inf, -np.inf], np.nan, inplace=True)
            df.fillna(0, inplace=True)

            # Ensure all required features exist
            missing = list(set(required_features) - set(df.columns))
            if missing:
                return jsonify({'error': f'Missing engineered features: {missing}'}), 400

            X_input = df[required_features]
            X_scaled = scaler.transform(X_input)
            preds = model.predict(X_scaled)

            df['Fault_Type'] = le.inverse_transform(preds)

            # Save predictions
            output_filename = f'predicted_{filename}'
            output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)
            df.to_csv(output_path, index=False)

            # Summary stats
            fault_counts = {k: int(v) for k, v in dict(Counter(df['Fault_Type'])).items()}
            total_records = int(len(df))
            unique_faults = list(map(str, df['Fault_Type'].unique()))

            return jsonify({
                'message': '✅ Prediction successful',
                'total_records': total_records,
                'unique_fault_types': unique_faults,
                'summary': fault_counts,
                'download_url': f'/download/{output_filename}'
            })

        except Exception as e:
            return jsonify({'error': str(e)}), 500

    return jsonify({'error': 'Invalid file format'}), 400

@app.route('/download/<filename>', methods=['GET'])
def download(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True)
