# ai/visualize.py
import pandas as pd
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import os
from preprocess import load_and_engineer

# 1. Setup paths and Styling
sns.set_theme(style="whitegrid")
DATA_PATH = 'data/sensor_readings_202605111214.csv'
MODEL_PATH = 'models/xgb_base.pkl'
OUTPUT_DIR = 'reports/visuals'

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# Move to root if script is run from inside /ai
if os.getcwd().endswith('ai'):
    os.chdir('..')

# 2. Load Data and Model
print("📊 Loading data and AI model...")
df = load_and_engineer(DATA_PATH)
model = joblib.load(MODEL_PATH)

# 3. Generate AI Predictions
features = ['vibration', 'current_amp', 'temperature', 'vibration_delta', 'current_delta']
df['ai_pred'] = model.predict(df[features])

# 4. Apply Custom WAF (Weighted Anomaly Fusion) Logic
def calculate_fusion(row):
    vibration_limit = 3.5
    stat_score = (row['vibration'] / vibration_limit) * 2.0
    delta_score = abs(row['vibration_delta']) * 5.0
    # Your specific weights: 50% AI, 30% Stats, 20% Physics (Deltas)
    return (row['ai_pred'] * 0.5) + (stat_score * 0.3) + (delta_score * 0.2)

df['fusion_score'] = df.apply(calculate_fusion, axis=1)

# --- VISUALIZATION 1: Feature Importance ---
plt.figure(figsize=(10, 6))
importances = model.feature_importances_
indices = np.argsort(importances)
plt.title('Feature Importance: Why the AI makes decisions')
plt.barh(range(len(indices)), importances[indices], color='#34495e', align='center')
plt.yticks(range(len(indices)), [features[i] for i in indices])
plt.xlabel('Relative Importance')
plt.tight_layout()
plt.savefig(f'{OUTPUT_DIR}/feature_importance.png')

# --- VISUALIZATION 2: AI vs Fusion (The PFE "Proof") ---
plt.figure(figsize=(14, 7))
# We take a sample of the last 150 points for clarity
sample = df.tail(150).reset_index()
plt.plot(sample.index, sample['ai_pred'], label='Standard XGBoost Prediction', color='#3498db', alpha=0.6)
plt.plot(sample.index, sample['fusion_score'], label='Custom WAF Fusion (Hybrid)', color='#e74c3c', linewidth=2.5)

# Highlight where Fusion is more sensitive than AI
plt.fill_between(sample.index, sample['ai_pred'], sample['fusion_score'], 
                 where=(sample['fusion_score'] > sample['ai_pred']),
                 color='#e74c3c', alpha=0.2, label='Safety Margin (Added Sensitivity)')

plt.axhline(y=1.8, color='orange', linestyle='--', label='Warning Threshold')
plt.axhline(y=2.5, color='red', linestyle=':', label='Critical Limit')
plt.title('Inference Comparison: Standard AI vs. Your Hybrid Algorithm')
plt.ylabel('Anomaly Score')
plt.xlabel('Time (Sample Ticks)')
plt.legend(loc='upper left')
plt.tight_layout()
plt.savefig(f'{OUTPUT_DIR}/fusion_analysis.png')

# --- VISUALIZATION 3: Correlation Heatmap ---
plt.figure(figsize=(8, 6))
correlation = df[features + ['fusion_score']].corr()
sns.heatmap(correlation, annot=True, cmap='RdYlGn', center=0)
plt.title('Sensor Correlation with Anomaly Score')
plt.tight_layout()
plt.savefig(f'{OUTPUT_DIR}/correlation_matrix.png')

print(f"✅ Success! Charts generated in: {OUTPUT_DIR}")