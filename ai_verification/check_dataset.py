from pathlib import Path

DATASET_DIR = Path("dataset")

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

if not DATASET_DIR.exists():
    print("ERROR: Dataset folder not found!")
    print("Expected location:", DATASET_DIR.resolve())
    raise SystemExit(1)

print("Dataset location:", DATASET_DIR.resolve())
print("\nDataset folders and image counts:\n")

total_images = 0

for folder in sorted(DATASET_DIR.rglob("*")):
    if not folder.is_dir():
        continue

    image_count = sum(
        1
        for file in folder.iterdir()
        if file.is_file()
        and file.suffix.lower() in IMAGE_EXTENSIONS
    )

    if image_count > 0:
        print(f"{folder.relative_to(DATASET_DIR)}: {image_count} images")
        total_images += image_count

print(f"\nTotal images found: {total_images}")

if total_images == 0:
    print("No images found. Check the dataset extraction and folder location.")