import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder, StandardScaler
from xgboost import XGBClassifier  # ✅ switched from RandomForest to XGBoost
import pickle

# 1. Create synthetic data for all fault types
fault_types = ['Bearing Fault', 'Cavitation', 'Imbalance', 'Misalignment', 'Normal']
rows = []
for fault in fault_types:
    for i in range(30):  # Add 30 synthetic rows per fault
        if fault == 'Normal':
            row = {
                'Rotational_Speed_RPM': 1500 + np.random.normal(0, 50),
                'Torque_Nm': 40 + np.random.normal(0, 5),
                'Vibration_X_mm_s': 2 + np.random.normal(0, 0.2),
                'Vibration_Y_mm_s': 2 + np.random.normal(0, 0.2),
                'Vibration_Z_mm_s': 2 + np.random.normal(0, 0.2),
                'Temperature_C': 70 + np.random.normal(0, 5),
                'Pressure_bar': 5 + np.random.normal(0, 0.5),
                'Flow_Rate_LPM': 200 + np.random.normal(0, 10),
                'Fault_Type': fault
            }
        else:
            row = {
                'Rotational_Speed_RPM': 3000 + np.random.normal(0, 100),
                'Torque_Nm': 100 + np.random.normal(0, 10),
                'Vibration_X_mm_s': 10 + np.random.normal(0, 1),
                'Vibration_Y_mm_s': 10 + np.random.normal(0, 1),
                'Vibration_Z_mm_s': 10 + np.random.normal(0, 1),
                'Temperature_C': 200 + np.random.normal(0, 10),
                'Pressure_bar': 0.5 + np.random.normal(0, 0.2),
                'Flow_Rate_LPM': 50 + np.random.normal(0, 5),
                'Fault_Type': fault
            }
        rows.append(row)

df = pd.DataFrame(rows)

# Feature engineering
df['Vibration_Mean'] = df[['Vibration_X_mm_s', 'Vibration_Y_mm_s', 'Vibration_Z_mm_s']].mean(axis=1)
df['Vibration_Std'] = df[['Vibration_X_mm_s', 'Vibration_Y_mm_s', 'Vibration_Z_mm_s']].std(axis=1)
df['Vibration_Range'] = df[['Vibration_X_mm_s', 'Vibration_Y_mm_s', 'Vibration_Z_mm_s']].max(axis=1) - \
                        df[['Vibration_X_mm_s', 'Vibration_Y_mm_s', 'Vibration_Z_mm_s']].min(axis=1)
df['Flow_to_Pressure'] = df['Flow_Rate_LPM'] / (df['Pressure_bar'] + 1e-3)
df['Torque_RPM'] = df['Torque_Nm'] * df['Rotational_Speed_RPM']
df['Temp_Pressure'] = df['Temperature_C'] * df['Pressure_bar']

# Label encoding
le = LabelEncoder()
df['Fault_Label'] = le.fit_transform(df['Fault_Type'])

# Split features and target
feature_cols = df.columns.difference(['Fault_Type', 'Fault_Label'])
X = df[feature_cols]
y = df['Fault_Label']

# Save feature list
with open("sim_features.pkl", "wb") as f:
    pickle.dump(feature_cols.tolist(), f)

# Scale features
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Save scaler
with open("sim_scaler.pkl", "wb") as f:
    pickle.dump(scaler, f)

# ✅ Train XGBoost model
model = XGBClassifier(use_label_encoder=False, eval_metric='mlogloss', random_state=42)
model.fit(X_scaled, y)

# ✅ Save XGBoost model properly
model.save_model("sim_model.json")  # ⬅️ this replaces pickle

# Save label encoder
with open("sim_label_encoder.pkl", "wb") as f:
    pickle.dump(le, f)

# Test prediction
test_row = np.zeros((1, len(feature_cols)))
test_row[0, list(feature_cols).index('Temperature_C')] = 200
test_row[0, list(feature_cols).index('Vibration_Z_mm_s')] = 10
test_row[0, list(feature_cols).index('Pressure_bar')] = 0.5
test_row_scaled = scaler.transform(test_row)

# Predict using trained model
pred_label = model.predict(test_row_scaled)
print("Predicted label for extreme values:", le.inverse_transform(pred_label))
