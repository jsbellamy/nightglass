"""PROTOTYPE Qwen-Image-Edit-2511 pose-edit harness — wipe me when trial #26 closes.

Path C of the body-motion route: instruction-driven edits of the frozen canonical
Knight anchor (core ComfyUI, no custom nodes). Reuses #19's action script; pose
clauses are rephrased as edit instructions so the model is asked to change pose
while holding identity — the mechanism #19's schnell img2img lacked.

Graph mirrors the core blueprint `Image Edit (Qwen 2511)` with Comfy-Org fp8
repacks. FluxKontextMultiReferenceLatentMethod is omitted (blueprint note: not
needed for Comfy files). Archives the exact submitted workflow JSON per frame.
"""
import hashlib
import json
import pathlib
import shutil
import sys
import time
import urllib.request
import uuid

COMFY = "http://127.0.0.1:8188"
HERE = pathlib.Path(__file__).parent
RAW = HERE / "rawQ"
RAW.mkdir(exist_ok=True)
COMFY_OUT = pathlib.Path(r"C:\ComfyUI\exports")

# Protocol: 2511 fp8 if available; Comfy-Org ships 2511 as fp8mixed (no e4m3fn pack).
UNET = "qwen_image_edit_2511_fp8mixed.safetensors"
CLIP = "qwen_2.5_vl_7b_fp8_scaled.safetensors"
VAE = "qwen_image_vae.safetensors"
STEPS = 20
CFG = 4.0
SHIFT = 3.1

sys.path.insert(0, str(HERE))
from actions import CHARACTERS, NEG

# Edit instructions — #19 pose clauses rephrased as "same character, …" edits.
# Protocol asks for the four basic_attack keys plus one hurt recoil and one
# knockout prone.
EDITS = {
    "knight": {
        "basic_attack": [
            ("a0", "same character, crouch back into a wind-up, draw the sword back behind the shoulder, tuck the shield close, shift weight onto the back foot"),
            ("a1", "same character, lunge forward, swing the sword high overhead at the peak of the arc, extend the shield arm out for balance"),
            ("a2", "same character, swing the sword down and forward at full extension in front of the body, plant the front foot, lean the body forward"),
            ("a3", "same character, recover upright, return the sword toward the side, bring the shield back forward, center the weight"),
        ],
        "hurt": [
            ("a0", "same character, flinch backward in a recoil, tip the head back, knock the shield arm aside, twist the torso away, skid one foot back"),
        ],
        "knockout": [
            ("a2", "same character, lying fallen on the ground on its side, eyes closed, sword and shield on the ground beside it, completely still and prone"),
        ],
    },
}


def workflow(anchor, prompt, negative, seed, steps=STEPS, cfg=CFG):
    # API graph equivalent of the 2511 blueprint subgraph (single reference image).
    return {
        "4": {
            "class_type": "UNETLoader",
            "inputs": {"unet_name": UNET, "weight_dtype": "default"},
        },
        "21": {
            "class_type": "CLIPLoader",
            "inputs": {"clip_name": CLIP, "type": "qwen_image"},
        },
        "22": {"class_type": "VAELoader", "inputs": {"vae_name": VAE}},
        "10": {"class_type": "LoadImage", "inputs": {"image": anchor}},
        "11": {
            "class_type": "FluxKontextImageScale",
            "inputs": {"image": ["10", 0]},
        },
        "2": {
            "class_type": "ModelSamplingAuraFlow",
            "inputs": {"model": ["4", 0], "shift": SHIFT},
        },
        "7": {
            "class_type": "CFGNorm",
            "inputs": {"model": ["2", 0], "strength": 1.0},
        },
        "13": {
            "class_type": "TextEncodeQwenImageEditPlus",
            "inputs": {
                "clip": ["21", 0],
                "prompt": prompt,
                "vae": ["22", 0],
                "image1": ["11", 0],
            },
        },
        "9": {
            "class_type": "TextEncodeQwenImageEditPlus",
            "inputs": {
                "clip": ["21", 0],
                "prompt": negative,
                "vae": ["22", 0],
                "image1": ["11", 0],
            },
        },
        "14": {
            "class_type": "VAEEncode",
            "inputs": {"pixels": ["11", 0], "vae": ["22", 0]},
        },
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "model": ["7", 0],
                "positive": ["13", 0],
                "negative": ["9", 0],
                "latent_image": ["14", 0],
                "seed": seed,
                "steps": steps,
                "cfg": cfg,
                "sampler_name": "euler",
                "scheduler": "simple",
                "denoise": 1.0,
            },
        },
        "8": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["3", 0], "vae": ["22", 0]},
        },
        "99": {
            "class_type": "SaveImage",
            "inputs": {"images": ["8", 0], "filename_prefix": "c26q"},
        },
    }


def post(path, payload):
    req = urllib.request.Request(
        COMFY + path,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    return json.load(urllib.request.urlopen(req))


def get(path):
    return json.load(urllib.request.urlopen(path if path.startswith("http") else COMFY + path))


def run(name, wf, timeout=600):
    pid = post("/prompt", {"prompt": wf, "client_id": str(uuid.uuid4())})["prompt_id"]
    t0 = time.time()
    while True:
        hist = get(f"/history/{pid}")
        if pid in hist:
            outs = hist[pid].get("outputs", {})
            if "99" in outs and outs["99"].get("images"):
                break
            err = hist[pid].get("status", {})
            if err.get("status_str") == "error":
                print(f"[{name}] ERROR {err}", flush=True)
                (RAW / f"{name}.error.json").write_text(json.dumps(hist[pid], indent=1))
                return None
        if time.time() - t0 > timeout:
            print(f"[{name}] TIMEOUT", flush=True)
            return None
        time.sleep(1.0)
    img = hist[pid]["outputs"]["99"]["images"][0]
    src = (
        COMFY_OUT / img["subfolder"] / img["filename"]
        if img["subfolder"]
        else COMFY_OUT / img["filename"]
    )
    dest = RAW / f"{name}.png"
    shutil.copy(src, dest)
    (RAW / f"{name}.workflow.json").write_text(json.dumps(wf, indent=1))
    sha = hashlib.sha256(dest.read_bytes()).hexdigest()[:16]
    print(f"[{name}] {time.time() - t0:5.1f}s sha={sha}", flush=True)
    return dest


def main(seeds_per=3, steps=STEPS):
    tag = "knight"
    ident, anchor, base_seed, _script = CHARACTERS[tag]
    seeds = [base_seed + i for i in range(seeds_per)]
    edits = EDITS[tag]
    for action, frames in edits.items():
        for fname, instruction in frames:
            # Identity context stays in the instruction; NEG suppresses effects.
            prompt = instruction
            for seed in seeds:
                name = f"{tag}_{action}_{fname}_s{seed}"
                if (RAW / f"{name}.png").exists():
                    print(f"[{name}] skip (exists)", flush=True)
                    continue
                run(name, workflow(anchor, prompt, NEG, seed, steps=steps))


if __name__ == "__main__":
    # usage: gen_qwen.py [seeds_per] [steps]
    seeds_per = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    steps = int(sys.argv[2]) if len(sys.argv) > 2 else STEPS
    main(seeds_per, steps)
