from pathlib import Path
import json
import numpy as np
import tensorflow as tf
import matplotlib.pyplot as plt

from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    ConfusionMatrixDisplay
)

from tensorflow.keras import layers, models
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint


# =====================================================
# 1. CONFIGURATION
# =====================================================

BASE_DIR = Path(__file__).resolve().parent
DATASET_DIR = BASE_DIR / "dataset" / "DATASET"

TRAIN_DIR = DATASET_DIR / "TRAIN"
TEST_DIR = DATASET_DIR / "TEST"

MODEL_DIR = BASE_DIR / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH = MODEL_DIR / "green_loop_waste_model.keras"
LABELS_PATH = MODEL_DIR / "class_names.json"

IMAGE_SIZE = (224, 224)
BATCH_SIZE = 16
SEED = 42
EPOCHS = 15

EXPECTED_CLASSES = ["N", "R"]

print("TensorFlow version:", tf.__version__)
print("Training directory:", TRAIN_DIR)
print("Testing directory:", TEST_DIR)


# =====================================================
# 2. VERIFY DATASET
# =====================================================

for directory in [TRAIN_DIR, TEST_DIR]:
    if not directory.exists():
        raise FileNotFoundError(
            f"Dataset directory not found: {directory}"
        )

    actual_classes = sorted(
        folder.name for folder in directory.iterdir()
        if folder.is_dir()
    )

    if actual_classes != EXPECTED_CLASSES:
        raise ValueError(
            f"Incorrect class folders in {directory}\n"
            f"Expected: {EXPECTED_CLASSES}\n"
            f"Found: {actual_classes}\n"
            "Remove unexpected folders before training."
        )

print("\nDataset folder validation passed.")


# =====================================================
# 3. LOAD TRAINING AND VALIDATION DATA
# =====================================================

train_ds = tf.keras.utils.image_dataset_from_directory(
    TRAIN_DIR,
    validation_split=0.20,
    subset="training",
    seed=SEED,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="int",
    class_names=EXPECTED_CLASSES
)

val_ds = tf.keras.utils.image_dataset_from_directory(
    TRAIN_DIR,
    validation_split=0.20,
    subset="validation",
    seed=SEED,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="int",
    class_names=EXPECTED_CLASSES
)

class_names = train_ds.class_names
num_classes = len(class_names)

print("\nDetected classes:", class_names)
print("Number of classes:", num_classes)

if num_classes != 2:
    raise ValueError("This model must have exactly two classes.")

with open(LABELS_PATH, "w", encoding="utf-8") as file:
    json.dump(class_names, file, indent=4)

print("Class mapping saved:", LABELS_PATH)


# =====================================================
# 4. LOAD INDEPENDENT TEST DATA
# =====================================================

test_ds = tf.keras.utils.image_dataset_from_directory(
    TEST_DIR,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    shuffle=False,
    label_mode="int",
    class_names=EXPECTED_CLASSES
)

AUTOTUNE = tf.data.AUTOTUNE

train_ds = train_ds.prefetch(AUTOTUNE)
val_ds = val_ds.prefetch(AUTOTUNE)
test_ds = test_ds.prefetch(AUTOTUNE)


# =====================================================
# 5. BUILD TWO-CLASS MOBILENETV2 MODEL
# =====================================================

base_model = MobileNetV2(
    input_shape=(224, 224, 3),
    include_top=False,
    weights="imagenet"
)

base_model.trainable = False

inputs = layers.Input(shape=(224, 224, 3))

x = layers.Lambda(
    preprocess_input,
    name="mobilenet_preprocessing"
)(inputs)

x = base_model(x, training=False)
x = layers.GlobalAveragePooling2D()(x)
x = layers.Dropout(0.30)(x)

outputs = layers.Dense(
    num_classes,
    activation="softmax",
    name="waste_classification"
)(x)

model = models.Model(inputs, outputs)

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"]
)

model.summary()


# =====================================================
# 6. TRAINING CALLBACKS
# =====================================================

callbacks = [
    ModelCheckpoint(
        filepath=str(MODEL_PATH),
        monitor="val_loss",
        save_best_only=True,
        verbose=1
    ),
    EarlyStopping(
        monitor="val_loss",
        patience=3,
        restore_best_weights=True,
        verbose=1
    )
]


# =====================================================
# 7. TRAIN MODEL
# =====================================================

print("\nStarting two-class CNN training...\n")

from sklearn.utils.class_weight import compute_class_weight

# Calculate class weights from the training dataset
class_weights = compute_class_weight(
    class_weight="balanced",
    classes=np.array([0, 1]),
    y=np.concatenate([
        labels.numpy()
        for _, labels in train_ds
    ])
)

class_weight_dict = {
    0: float(class_weights[0]),
    1: float(class_weights[1])
}

print("Class weights:", class_weight_dict)

history = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=EPOCHS,
    callbacks=callbacks,
    class_weight=class_weight_dict
)


# =====================================================
# 8. LOAD BEST MODEL
# =====================================================

best_model = tf.keras.models.load_model(
    MODEL_PATH,
    custom_objects={"preprocess_input": preprocess_input},
    compile=False
)

best_model.compile(
    optimizer="adam",
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"]
)


# =====================================================
# 9. SAVE TRAINING GRAPHS
# =====================================================

plt.figure(figsize=(10, 5))
plt.plot(history.history["accuracy"], label="Training Accuracy")
plt.plot(history.history["val_accuracy"], label="Validation Accuracy")
plt.xlabel("Epoch")
plt.ylabel("Accuracy")
plt.title("Green Loop Two-Class Training Accuracy")
plt.legend()
plt.grid(True)
plt.savefig(MODEL_DIR / "training_accuracy.png", bbox_inches="tight")
plt.close()

plt.figure(figsize=(10, 5))
plt.plot(history.history["loss"], label="Training Loss")
plt.plot(history.history["val_loss"], label="Validation Loss")
plt.xlabel("Epoch")
plt.ylabel("Loss")
plt.title("Green Loop Two-Class Training Loss")
plt.legend()
plt.grid(True)
plt.savefig(MODEL_DIR / "training_loss.png", bbox_inches="tight")
plt.close()


# =====================================================
# 10. EVALUATE TEST DATA
# =====================================================

print("\nEvaluating on the independent test dataset...\n")

test_loss, test_accuracy = best_model.evaluate(
    test_ds,
    verbose=1
)

print(f"\nTest Loss: {test_loss:.4f}")
print(f"Test Accuracy: {test_accuracy:.4f}")
print(f"Test Accuracy Percentage: {test_accuracy * 100:.2f}%")


# =====================================================
# 11. CLASSIFICATION REPORT
# =====================================================

y_true = np.concatenate([
    labels.numpy() for _, labels in test_ds
])

probabilities = best_model.predict(test_ds, verbose=1)
y_pred = np.argmax(probabilities, axis=1)

report = classification_report(
    y_true,
    y_pred,
    labels=[0, 1],
    target_names=class_names,
    zero_division=0
)

print("\nClassification Report:\n")
print(report)

with open(
    MODEL_DIR / "classification_report.txt",
    "w",
    encoding="utf-8"
) as file:
    file.write(report)


# =====================================================
# 12. CONFUSION MATRIX
# =====================================================

cm = confusion_matrix(
    y_true,
    y_pred,
    labels=[0, 1]
)

display = ConfusionMatrixDisplay(
    confusion_matrix=cm,
    display_labels=class_names
)

fig, ax = plt.subplots(figsize=(7, 7))
display.plot(
    ax=ax,
    cmap="Blues",
    values_format="d"
)

plt.title("Green Loop Two-Class Confusion Matrix")
plt.tight_layout()
plt.savefig(
    MODEL_DIR / "confusion_matrix.png",
    bbox_inches="tight"
)
plt.close(fig)


# =====================================================
# 13. COMPLETION SUMMARY
# =====================================================

print("\n========================================")
print("TWO-CLASS TRAINING COMPLETED")
print("========================================")
print("Model:", MODEL_PATH)
print("Class mapping:", LABELS_PATH)
print("Accuracy graph:", MODEL_DIR / "training_accuracy.png")
print("Loss graph:", MODEL_DIR / "training_loss.png")
print("Classification report:", MODEL_DIR / "classification_report.txt")
print("Confusion matrix:", MODEL_DIR / "confusion_matrix.png")

print("\nIMPORTANT:")
print("N = Non-Recyclable")
print("R = Recyclable")
print("Validate these meanings against your dataset labels.")
print("Organic waste will be forced into one of these two classes.")