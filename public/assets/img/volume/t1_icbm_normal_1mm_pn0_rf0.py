import gzip
import os

import numpy as np
from PIL import Image
from scipy.ndimage import zoom


def resample_volume_lanczos(byte_array, original_shape, new_shape):
    volume = np.frombuffer(byte_array, dtype=np.uint8).reshape(original_shape)
    zoom_factors = [n / o for n, o in zip(new_shape, original_shape)]
    resampled_volume = zoom(volume, zoom_factors, order=4)
    return resampled_volume


def load_byte_array_from_file(file_path):
    with open(file_path, "rb") as file:
        byte_array = file.read()
    return byte_array


file_path = "t1_icbm_normal_1mm_pn0_rf0.rawb"
byte_array = load_byte_array_from_file(file_path)
original_shape = (181, 217, 181)
new_shape = (180, 216, 180)
resampled_volume = resample_volume_lanczos(byte_array, original_shape, new_shape)

np.save("t1_icbm_normal_1mm_pn0_rf0.npy", resampled_volume)


file_path = "t1_icbm_normal_1mm_pn0_rf0.npy"
data = np.load(file_path)
os.makedirs("slices", exist_ok=True)

for i, slice in enumerate(data):
    img = Image.fromarray(slice)
    if img.mode != "L":
        img = img.convert("L")
    img.save(f"slices/slice_{i:03d}.png")

print(f"Exported {len(data)} slices.")

source_directory = "slices"
final_file_path = "t1_icbm_normal_1mm_pn0_rf0_180x216x180_uint8_1x1.bin"

with open(final_file_path, "wb") as output_file:
    for file_name in sorted(os.listdir(source_directory)):
        if file_name.lower().endswith(".png"):
            source_path = os.path.join(source_directory, file_name)
            img = Image.open(source_path).convert("L")
            img_data = np.array(img, dtype=np.uint8)
            img_data.tofile(output_file)

print("Images have been successfully converted and concatenated.")

with open("t1_icbm_normal_1mm_pn0_rf0_180x216x180_uint8_1x1.bin", "rb") as f:
    bytes_data = f.read()

gzip_filename = "t1_icbm_normal_1mm_pn0_rf0_180x216x180_uint8_1x1.bin-gz"

with gzip.open(gzip_filename, "wb", compresslevel=9) as f:
    f.write(bytes_data)

print(f"File compressed and saved as {gzip_filename}")
