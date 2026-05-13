# ai/train.py
import joblib
import os
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from preprocess import load_and_engineer

# CORRECT PATH: Looking from the root into the data folder
DATA_PATH = 'data/sensor_readings_202605111214.csv'
MODEL_DIR = 'models'

if not os.path.exists(MODEL_DIR):
    os.makedirs(MODEL_DIR)

# Load and Prepare
df = load_and_engineer(DATA_PATH)

# Features
features = ['vibration', 'current_amp', 'temperature', 'vibration_delta', 'current_delta']
X = df[features]
y = df['anomaly_score']

# Train
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
print("Training the Brain (XGBoost)...")
model = XGBRegressor(n_estimators=100, max_depth=4, learning_rate=0.1)
model.fit(X_train, y_train)

# Save
joblib.dump(model, os.path.join(MODEL_DIR, 'xgb_base.pkl'))
print(f"✅ Success: Model saved in {MODEL_DIR}/xgb_base.pkl")