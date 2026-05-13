# ai/preprocess.py
import pandas as pd
import json
import os

def load_and_engineer(file_path):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    
    print(f"--- Engineering Features for: {os.path.basename(file_path)} ---")
    df = pd.read_csv(file_path)
    
    # 1. Expand JSON sensors
    sensors_df = df['sensors'].apply(json.loads).apply(pd.Series)
    df = pd.concat([df, sensors_df], axis=1)
    
    # 2. Sort by device and time (Critical for deltas)
    df = df.sort_values(by=['device_id', 'timestamp'])
    
    # 3. Create 'Deltas' (The speed of change)
    # This is the "PFE Innovation": watching acceleration, not just values.
    df['vibration_delta'] = df.groupby('device_id')['vibration'].diff().fillna(0)
    df['current_delta'] = df.groupby('device_id')['current_amp'].diff().fillna(0)
    
    return df