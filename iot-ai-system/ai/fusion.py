import joblib
import pandas as pd
import numpy as np

class WAFAlgorithm: 
    """Weighted Anomaly Fusion (WAF): The PFE Custom Algorithm"""
    def __init__(self, model_path):
        self.ai_model = joblib.load(model_path)
        self.vibration_limit = 3.5 # Physical threshold based on ISO standards
        
    def predict(self, data_dict):
        # 1. Prepare input for the AI model
        df = pd.DataFrame([data_dict])
        features = ['vibration', 'current_amp', 'temperature', 'vibration_delta', 'current_delta']
        
        # 2. AI Perspective (Pattern Recognition)
        ai_score = float(self.ai_model.predict(df[features])[0])
        
        # 3. Statistical Perspective (Strict threshold check)
        stat_score = (data_dict['vibration'] / self.vibration_limit) * 2.0
        
        # 4. Temporal Perspective (Acceleration check)
        delta_score = abs(data_dict['vibration_delta']) * 5.0
        
        # 5. FUSION LOGIC (The Weights)
        # 50% AI + 30% Physical Limit + 20% Change Speed
        final_score = (ai_score * 0.5) + (stat_score * 0.3) + (delta_score * 0.2)
        final_score = max(0, min(5, final_score)) # Clamp between 0-5
        
        # 6. TECHNICIAN DECISION MATRIX
        if final_score < 1.5:
            status = "HEALTHY"
            color = "#27ae60" # Green
            directive = "Normal Operation. No intervention required."
            action_label = "Monitor"
        elif final_score < 2.5:
            status = "WARNING"
            color = "#f1c40f" # Yellow
            action_label = "Inspection Required"
            # Logic-based advice
            if data_dict['vibration_delta'] > 0.3:
                directive = "Abnormal Vibration Spike: Check for loose bolts or alignment."
            else:
                directive = "Thermal Increase Detected: Check lubrication and cooling fans."
        else:
            status = "CRITICAL"
            color = "#e74c3c" # Red
            action_label = "STOP MACHINE"
            directive = "EMERGENCY: High failure risk. Shutdown and inspect drive shaft."
            
        return {
            "score": round(float(final_score), 2),
            "ai_logic_only": round(float(ai_score), 2),
            "status": status,
            "color": color,
            "recommendation": directive,
            "technician_action": action_label
        }