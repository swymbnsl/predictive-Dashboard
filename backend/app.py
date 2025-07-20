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

# Load model, scaler, and feature list
model = joblib.load(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)
with open(FEATURES_PATH, 'rb') as f:
    required_features = pickle.load(f)

# Fault label encoder (ensure order matches training)
# le = LabelEncoder()
# le.fit(['Bearing Fault', 'Cavitation', 'Imbalance', 'Misalignment', 'Normal'])
with open('models/label_encoder.pkl', 'rb') as f:
    le = pickle.load(f)

base_columns = [
    'Rotational_Speed_RPM', 'Torque_Nm',
    'Vibration_X_mm_s', 'Vibration_Y_mm_s', 'Vibration_Z_mm_s',
    'Temperature_C', 'Pressure_bar', 'Flow_Rate_LPM'
]

last_predicted_file = None

# --- Simulator Model Files ---
SIM_MODEL_PATH = 'models/sim_model.pkl'
SIM_SCALER_PATH = 'models/sim_scaler.pkl'
SIM_FEATURES_PATH = 'models/sim_features.pkl'
SIM_LABEL_ENCODER_PATH = 'models/sim_label_encoder.pkl'

@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-store'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/')
def home():
    return '✅ Predictive Maintenance API is running'

@app.route('/reset', methods=['POST'])
def reset_backend():
    global last_predicted_file
    if last_predicted_file and os.path.exists(last_predicted_file):
        os.remove(last_predicted_file)
    last_predicted_file = None
    return jsonify({'message': 'Backend state reset.'}), 200

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/predict', methods=['POST'])
def predict():
    global last_predicted_file

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

            if 'Timestamp' in df.columns:
                df['Timestamp'] = pd.to_datetime(df['Timestamp'], errors='coerce')
            else:
                df['Timestamp'] = pd.date_range(start='2025-01-01', periods=len(df), freq='H')

            missing_cols = [col for col in base_columns if col not in df.columns]
            if missing_cols:
                return jsonify({'error': f'Missing required columns: {missing_cols}'}), 400

            # Fill missing values like training
            df[base_columns] = df[base_columns].fillna(df[base_columns].mean())

            # 🔧 Feature engineering
            df['Vibration_Mean'] = df[['Vibration_X_mm_s', 'Vibration_Y_mm_s', 'Vibration_Z_mm_s']].mean(axis=1)
            df['Vibration_Std'] = df[['Vibration_X_mm_s', 'Vibration_Y_mm_s', 'Vibration_Z_mm_s']].std(axis=1)
            df['Vibration_Range'] = df[['Vibration_X_mm_s', 'Vibration_Y_mm_s', 'Vibration_Z_mm_s']].max(axis=1) - \
                                    df[['Vibration_X_mm_s', 'Vibration_Y_mm_s', 'Vibration_Z_mm_s']].min(axis=1)
            df['Flow_to_Pressure'] = df['Flow_Rate_LPM'] / (df['Pressure_bar'] + 1e-3)
            df['Torque_RPM'] = df['Torque_Nm'] * df['Rotational_Speed_RPM']
            df['Temp_Pressure'] = df['Temperature_C'] * df['Pressure_bar']

            # Handle any remaining NaN or inf
            df.replace([np.inf, -np.inf], np.nan, inplace=True)
            df.fillna(0, inplace=True)

            # Final feature selection
            if not all(feat in df.columns for feat in required_features):
                return jsonify({'error': f'Missing features: {set(required_features) - set(df.columns)}'}), 400

            X_input = df[required_features]
            print('[DEBUG] Backend features:', list(X_input.columns))
            print('[DEBUG] Model expects:', required_features)
            X_input = X_input[required_features]  # Force correct order
            print('\n[DEBUG] Features sent to model:')
            print(X_input.head())
            X_scaled = scaler.transform(X_input)
            print('[DEBUG] Scaled features:')
            print(X_scaled[:5])
            preds = model.predict(X_scaled)
            print('[DEBUG] Model predictions:')
            print(preds[:10])
            df['Fault_Type'] = le.inverse_transform(preds)

            # Save predicted file
            output_filename = f'predicted_{filename}'
            output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)
            df.to_csv(output_path, index=False)
            last_predicted_file = output_path

            # Summary stats
            fault_counts = {k: int(v) for k, v in dict(Counter(df['Fault_Type'])).items()}
            trend_cols = ['Timestamp', 'Fault_Type'] + base_columns
            trend_cols = [col for col in trend_cols if col in df.columns]
            trend_data = df[trend_cols].dropna().to_dict(orient='records')

            return jsonify({
                'message': '✅ Prediction successful',
                'total_records': len(df),
                'unique_fault_types': list(df['Fault_Type'].unique()),
                'summary': fault_counts,
                'download_url': f'/download/{output_filename}',
                'trend_data': trend_data
            })

        except Exception as e:
            return jsonify({'error': str(e)}), 500

    return jsonify({'error': 'Invalid file format'}), 400

@app.route('/predict_simulator', methods=['POST'])
def predict_simulator():
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
            # Load simulator model and files
            sim_model = joblib.load(SIM_MODEL_PATH)
            sim_scaler = joblib.load(SIM_SCALER_PATH)
            with open(SIM_FEATURES_PATH, 'rb') as f:
                sim_required_features = pickle.load(f)
            with open(SIM_LABEL_ENCODER_PATH, 'rb') as f:
                sim_le = pickle.load(f)

            df = pd.read_csv(filepath)

            if 'Timestamp' in df.columns:
                df['Timestamp'] = pd.to_datetime(df['Timestamp'], errors='coerce')
            else:
                df['Timestamp'] = pd.date_range(start='2025-01-01', periods=len(df), freq='H')

            # Fill missing values
            for col in sim_required_features:
                if col not in df.columns:
                    df[col] = df[col].mean() if col in df else 0
            df[sim_required_features] = df[sim_required_features].fillna(df[sim_required_features].mean())

            # Feature engineering (same as training)
            if 'Vibration_Mean' in sim_required_features:
                df['Vibration_Mean'] = df[['Vibration_X_mm_s', 'Vibration_Y_mm_s', 'Vibration_Z_mm_s']].mean(axis=1)
            if 'Vibration_Std' in sim_required_features:
                df['Vibration_Std'] = df[['Vibration_X_mm_s', 'Vibration_Y_mm_s', 'Vibration_Z_mm_s']].std(axis=1)
            if 'Vibration_Range' in sim_required_features:
                df['Vibration_Range'] = df[['Vibration_X_mm_s', 'Vibration_Y_mm_s', 'Vibration_Z_mm_s']].max(axis=1) - \
                                        df[['Vibration_X_mm_s', 'Vibration_Y_mm_s', 'Vibration_Z_mm_s']].min(axis=1)
            if 'Flow_to_Pressure' in sim_required_features:
                df['Flow_to_Pressure'] = df['Flow_Rate_LPM'] / (df['Pressure_bar'] + 1e-3)
            if 'Torque_RPM' in sim_required_features:
                df['Torque_RPM'] = df['Torque_Nm'] * df['Rotational_Speed_RPM']
            if 'Temp_Pressure' in sim_required_features:
                df['Temp_Pressure'] = df['Temperature_C'] * df['Pressure_bar']

            # Handle NaN/inf
            df.replace([np.inf, -np.inf], np.nan, inplace=True)
            df.fillna(0, inplace=True)

            # Final feature selection
            if not all(feat in df.columns for feat in sim_required_features):
                return jsonify({'error': f'Missing features: {set(sim_required_features) - set(df.columns)}'}), 400

            X_input = df[sim_required_features]
            X_input = X_input[sim_required_features]
            X_scaled = sim_scaler.transform(X_input)

            faults = []
            if df['Temperature_C'].iloc[0] > 80:
                faults.append('Cavitation')
            if df['Vibration_Z_mm_s'].iloc[0] > 3.5 or df['Vibration_X_mm_s'].iloc[0] > 3.5 or df['Vibration_Y_mm_s'].iloc[0] > 3.5:
                faults.append('Imbalance')
            if df['Pressure_bar'].iloc[0] > 8:
                faults.append('Misalignment')
            if df['Torque_Nm'].iloc[0] > 60:
                faults.append('Bearing Fault')
            if df['Rotational_Speed_RPM'].iloc[0] > 1800:
                faults.append('Misalignment')
            if df['Flow_Rate_LPM'].iloc[0] < 150:
                faults.append('Cavitation')

            if faults:
                df['Fault_Type'] = ', '.join(sorted(set(faults)))
            else:
                preds = sim_model.predict(X_scaled)
                df['Fault_Type'] = sim_le.inverse_transform(preds)

            # Summary stats
            from collections import Counter
            fault_counts = {k: int(v) for k, v in dict(Counter(df['Fault_Type'])).items()}
            trend_cols = ['Timestamp', 'Fault_Type'] + list(sim_required_features)
            trend_cols = [col for col in trend_cols if col in df.columns]
            trend_data = df[trend_cols].dropna().to_dict(orient='records')

            return jsonify({
                'message': '✅ Simulator Prediction successful',
                'total_records': len(df),
                'unique_fault_types': list(df['Fault_Type'].unique()),
                'summary': fault_counts,
                'trend_data': trend_data
            })

        except Exception as e:
            return jsonify({'error': str(e)}), 500

    return jsonify({'error': 'Invalid file format'}), 400

@app.route('/get_trend_data', methods=['GET'])
def get_trend_data():
    global last_predicted_file
    if not last_predicted_file or not os.path.exists(last_predicted_file):
        return jsonify({'error': 'No recent prediction found'}), 404

    df = pd.read_csv(last_predicted_file)
    df['Timestamp'] = pd.to_datetime(df['Timestamp'], errors='coerce')
    df = df.dropna(subset=['Timestamp'])

    trend_cols = ['Timestamp', 'Fault_Type'] + base_columns
    trend_data = df[trend_cols].dropna().to_dict(orient='records')

    return jsonify({
        'trend_data': trend_data,
        'min_date': df['Timestamp'].min().isoformat(),
        'max_date': df['Timestamp'].max().isoformat()
    })

@app.route('/download/<filename>', methods=['GET'])
def download(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=True)

if __name__ == "__main__":
    from waitress import serve
    serve(app, host="0.0.0.0", port=8000)


