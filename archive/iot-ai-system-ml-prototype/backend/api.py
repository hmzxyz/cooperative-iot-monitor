# backend/api.py
from fastapi import FastAPI
from pydantic import BaseModel
import sys
import os

# Ensure the app can find the 'ai' folder
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from ai.fusion import WAFAlgorithm

app = FastAPI(title="PFE Industrial Intelligence API")

# Initialize the Custom Algorithm
# This path works when you start the server from the project root
detector = WAFAlgorithm("models/xgb_base.pkl")

class SensorData(BaseModel):
    vibration: float
    current_amp: float
    temperature: float
    vibration_delta: float
    current_delta: float

@app.post("/predict")
def get_prediction(data: SensorData):
    return detector.predict(data.dict())