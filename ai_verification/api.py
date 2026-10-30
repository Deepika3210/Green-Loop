import io
import json
from pathlib import Path

import numpy as np
import tensorflow as tf

from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input


# ==========================================
# CONFIGURATION
# ==========================================

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "green_loop_waste_model.keras"
CLASS_NAMES_PATH = BASE_DIR / "models" / "class_names.json"

IMAGE_SIZE = (224, 224)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


# ==========================================
# LOAD TRAINED MODEL
# ==========================================

if not MODEL_PATH.exists():
    raise FileNotFoundError(f"Model not found: {MODEL_PATH}")

if not CLASS_NAMES_PATH.exists():
    raise FileNotFoundError(
        f"Class names file not found: {CLASS_NAMES_PATH}"
    )

with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as file:
    class_names = json.load(file)

model = tf.keras.models.load_model(
    MODEL_PATH,
    custom_objects={"preprocess_input": preprocess_input}
)


# ==========================================
# CLASS DEFINITIONS
# ==========================================

CLASS_MEANINGS = {
    "N": "Non-Recyclable",
    "R": "Recyclable",
}


# ==========================================
# FASTAPI APPLICATION
# ==========================================

app = FastAPI(
    title="Green Loop AI Verification API",
    description="CNN-based waste image classification",
    version="1.0.0"
)


# ==========================================
# HOME ENDPOINT
# ==========================================

@app.get("/")
def home():
    return {
        "message": "Green Loop AI Verification API is running",
        "model_loaded": True,
        "classes": CLASS_MEANINGS
    }


# ==========================================
# HEALTH CHECK
# ==========================================

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": True
    }


# ==========================================
# IMAGE PREDICTION ENDPOINT
# ==========================================

@app.post("/predict")
async def predict_waste(file: UploadFile = File(...)):

    # Check file type
    if file.content_type not in {
        "image/jpeg",
        "image/png",
        "image/webp"
    }:
        raise HTTPException(
            status_code=400,
            detail="Upload a JPEG, PNG, or WEBP image."
        )

    # Read image with a size limit
    image_bytes = await file.read(MAX_FILE_SIZE + 1)

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="The uploaded image is empty."
        )

    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image size must not exceed 10 MB."
        )

    # Decode and prepare the image
        # Decode and prepare the image
    try:
        with Image.open(io.BytesIO(image_bytes)) as original_image:
            original_image.verify()

        with Image.open(io.BytesIO(image_bytes)) as original_image:
            image = original_image.convert("RGB")
            image = image.resize(IMAGE_SIZE)

            image_array = np.asarray(image, dtype=np.float32)

            # Apply MobileNetV2 preprocessing
            image_array = preprocess_input(image_array)

            image_array = np.expand_dims(image_array, axis=0)

    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is not a valid image."
        )

    # Predict using the trained CNN
    try:
        predictions = model.predict(image_array, verbose=0)[0]
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="AI prediction failed."
        )

    predicted_index = int(np.argmax(predictions))
    predicted_class = str(class_names[predicted_index])
    confidence = float(predictions[predicted_index])

    # Return every class score
    class_scores = {
        str(label): round(float(score) * 100, 2)
        for label, score in zip(class_names, predictions)
    }

    return {
        "success": True,
        "predicted_class": predicted_class,
        "predicted_category": CLASS_MEANINGS.get(
            predicted_class,
            "Unknown"
        ),
        "confidence": round(confidence * 100, 2),
        "class_scores": class_scores,
        "model_accuracy": 77.19,
        "message": (
            "Prediction completed. This result does not independently "
            "verify that an item was actually recycled."
        )
    }