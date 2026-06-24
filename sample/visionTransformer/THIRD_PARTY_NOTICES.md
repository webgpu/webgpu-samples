# Third-Party Notices

## Model Weights

The model weights (`public/assets/models/deit-tiny-int8.bin`) are derived from
**DeiT-Tiny** (`facebook/deit-tiny-patch16-224`) by Meta Research.

- Paper: "Training data-efficient image transformers & distillation through attention" (Touvron et al., 2021)
- Source: https://huggingface.co/facebook/deit-tiny-patch16-224
- License: Apache License 2.0 (https://www.apache.org/licenses/LICENSE-2.0)

The weights have been quantized to int8 with per-tensor scale factors.

## ImageNet Class Labels

The class labels (`public/assets/models/imagenet-labels.json`) are human-readable
English descriptions derived from WordNet synsets via the `timm` library.

- WordNet License: https://wordnet.princeton.edu/license-and-commercial-use
- timm Library: Apache License 2.0

## Sample Images

The sample images in `public/assets/img/vit-samples/` are sourced from
[Unsplash](https://unsplash.com/) and used under the
[Unsplash License](https://unsplash.com/license), which permits free use
for commercial and non-commercial purposes without attribution.

- `golden-retriever.jpg` — Photo by [Unsplash](https://unsplash.com/photos/552053831-71594a27632d)
- `tabby-cat.jpg` — Photo by [Unsplash](https://unsplash.com/photos/514888286974-6c03e2ca1dba)
- `macaw.jpg` — Photo by [Unsplash](https://unsplash.com/photos/552728089-57bdde30beb3)
- `sunflower.jpg` — Photo by [Unsplash](https://unsplash.com/photos/597848212624-a19eb35e2651)
