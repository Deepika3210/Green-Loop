import json
from pathlib import Path

import numpy as np
import tensorflow as tf
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.utils import load_img, img_to_array

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "green_loop_waste_model.keras"
CLASS_NAMES_PATH = BASE_DIR / "models" / "class_names.json"

# Load the saved class labels
with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as file:
    class_names = json.load(file)

# Load the trained model
model = tf.keras.models.load_model(
    MODEL_PATH,
    custom_objects={"preprocess_input": preprocess_input}
)

# Confirmed/expected label descriptions
class_meanings = {
    "N": "Non-Recyclable",
    "O": "Organic",
    "R": "Recyclable",
}

image_path = input("Enter the full path of a waste image: ").strip().strip('"')

# Load and prepare the image
image = load_img(image_path, target_size=(224, 224))
image_array = img_to_array(image)
image_array = np.expand_dims(image_array, axis=0)

# Predict
predictions = model.predict(image_array, verbose=0)[0]
predicted_index = int(np.argmax(predictions))
predicted_class = class_names[predicted_index]
confidence = float(predictions[predicted_index]) * 100

print("\n========== GREEN LOOP AI RESULT ==========")
print("Predicted class:", predicted_class)
print("Predicted category:", class_meanings.get(
    predicted_class, "Meaning not verified"
))
print(f"Model confidence: {confidence:.2f}%")

print("\nAll class scores:")
for index, label in enumerate(class_names):
    print(f"{label}: {predictions[index] * 100:.2f}%")

print("\nNote: This is a model prediction, not proof that an item is recyclable.")