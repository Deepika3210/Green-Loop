import json
import sys
from pathlib import Path

import numpy as np
import tensorflow as tf
from PIL import Image, ImageOps
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input


# ==========================================
# CONFIGURATION
# ==========================================

BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = BASE_DIR / "models" / "green_loop_waste_model.keras"
LABELS_PATH = BASE_DIR / "models" / "class_names.json"

IMAGE_SIZE = (224, 224)


# ==========================================
# VALIDATE INPUT
# ==========================================

if len(sys.argv) < 2:
    print('Usage: python test_prediction.py "path-to-image.jpg"')
    raise SystemExit(1)

image_path = Path(sys.argv[1])

if not image_path.exists():
    print(f"ERROR: Image not found: {image_path}")
    raise SystemExit(1)

if not MODEL_PATH.exists():
    print(f"ERROR: Model not found: {MODEL_PATH}")
    raise SystemExit(1)

if not LABELS_PATH.exists():
    print(f"ERROR: Class labels not found: {LABELS_PATH}")
    raise SystemExit(1)


# ==========================================
# LOAD CLASS LABELS
# ==========================================

with open(LABELS_PATH, "r", encoding="utf-8") as file:
    class_names = json.load(file)

print("Class order:", class_names)


# ==========================================
# LOAD MODEL
# ==========================================

print("\nLoading trained model...")

model = tf.keras.models.load_model(
    MODEL_PATH,
    custom_objects={
        "preprocess_input": preprocess_input
    },
    compile=False
)

print("Model loaded successfully.")


# ==========================================
# PREPARE IMAGE
# ==========================================

try:
    with Image.open(image_path) as original:
        original.verify()

    with Image.open(image_path) as original:
        image = ImageOps.exif_transpose(original).convert("RGB")
        image = image.resize(IMAGE_SIZE)

        image_array = np.asarray(
            image,
            dtype=np.float32
        )

        image_array = preprocess_input(image_array)
        image_array = np.expand_dims(image_array, axis=0)

except Exception as error:
    print("ERROR: Could not process image:", error)
    raise SystemExit(1)


# ==========================================
# PREDICT
# ==========================================

print("\nRunning prediction...")

predictions = model.predict(image_array, verbose=0)[0]

if len(predictions) != len(class_names):
    print("ERROR: Model output count does not match class labels.")
    raise SystemExit(1)


# ==========================================
# DISPLAY RESULTS
# ==========================================

class_meanings = {
    "N": "Non-Recyclable",
    "O": "Organic",
    "R": "Recyclable"
}

print("\n========== GREEN LOOP AI RESULTS ==========")

for label, score in zip(class_names, predictions):
    meaning = class_meanings.get(label, "Unknown")

    print(
        f"{label} ({meaning}): {float(score) * 100:.2f}%"
    )

predicted_index = int(np.argmax(predictions))
predicted_class = class_names[predicted_index]

print("\nPredicted class:", predicted_class)
print(
    "Predicted category:",
    class_meanings.get(predicted_class, "Unknown")
)
print(
    "Confidence:",
    f"{float(predictions[predicted_index]) * 100:.2f}%"
)

print("===========================================")