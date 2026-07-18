"""PROTOTYPE path-B harness — wipe me when trial #19 closes.

Wan2.2 TI2V-5B (Apache-2.0) image-to-video from the frozen canonical anchor, then
sampled down to 4/6/8 keyframes. The video model is asked for the *whole action*
in one clip rather than per-frame poses, which is the structural difference from
path A: temporal coherence is the model's job, not the prompt's.

Graph: UNETLoader + CLIPLoader(umt5/wan) + VAELoader(wan2.2_vae)
       -> Wan22ImageToVideoLatent(start_image=anchor) -> ModelSamplingSD3
       -> KSampler -> VAEDecode -> SaveImage(batch)
Core nodes only. Archives the exact submitted workflow JSON per clip.
"""
import json, sys, time, urllib.request, uuid, pathlib, shutil, hashlib

COMFY = "http://127.0.0.1:8188"
HERE = pathlib.Path(__file__).parent
RAW = HERE / "rawB"; RAW.mkdir(exist_ok=True)
COMFY_OUT = pathlib.Path(r"C:\ComfyUI\exports")
# Wan2.2 TI2V-5B is trained at 1280x704; running far below that is off-distribution
# and is a prime suspect for drift/deformation, so resolution is a swept parameter.
W, H = 448, 672                      # default: 2:3, /32, modest for a 5B ti2v clip

sys.path.insert(0, str(HERE))
from actions import CHARACTERS, NEG

# one motion sentence per action — the clip-level intent, not per-frame poses
CLIP_PROMPT = {
    "idle": "the character stands still and breathes gently, a slow subtle idle bob, feet planted, staying in place",
    "basic_attack": "the character winds the sword back, swings it forward in a single overhead attack, then returns to a standing rest, feet planted, staying in place",
    "cast": "the character draws the wand back, sweeps it upward and thrusts it forward to cast, then lowers it back to rest, feet planted, staying in place",
    "hurt": "the character flinches backward from a hit, staggers, then steadies back upright, feet planted, staying in place",
    "knockout": "the character buckles, collapses to the knees and falls to the ground, then lies still",
}

NEG_B = NEG + ", camera pan, camera zoom, camera movement, moving background, walking away, leaving frame"


def workflow(anchor, prompt, negative, seed, length, steps, cfg, shift):
    return {
        "20": {"class_type": "UNETLoader",
               "inputs": {"unet_name": "wan2.2_ti2v_5B_fp16.safetensors", "weight_dtype": "default"}},
        "21": {"class_type": "CLIPLoader",
               "inputs": {"clip_name": "umt5_xxl_fp8_e4m3fn_scaled.safetensors", "type": "wan"}},
        "22": {"class_type": "VAELoader", "inputs": {"vae_name": "wan2.2_vae.safetensors"}},
        "10": {"class_type": "LoadImage", "inputs": {"image": anchor}},
        "11": {"class_type": "ImageScale",
               "inputs": {"image": ["10", 0], "upscale_method": "lanczos",
                          "width": W, "height": H, "crop": "center"}},
        "6":  {"class_type": "CLIPTextEncode", "inputs": {"clip": ["21", 0], "text": prompt}},
        "7":  {"class_type": "CLIPTextEncode", "inputs": {"clip": ["21", 0], "text": negative}},
        "12": {"class_type": "Wan22ImageToVideoLatent",
               "inputs": {"vae": ["22", 0], "width": W, "height": H,
                          "length": length, "batch_size": 1, "start_image": ["11", 0]}},
        "23": {"class_type": "ModelSamplingSD3", "inputs": {"model": ["20", 0], "shift": shift}},
        "3":  {"class_type": "KSampler",
               "inputs": {"model": ["23", 0], "positive": ["6", 0], "negative": ["7", 0],
                          "latent_image": ["12", 0], "seed": seed, "steps": steps,
                          "cfg": cfg, "sampler_name": "uni_pc", "scheduler": "simple",
                          "denoise": 1.0}},
        "8":  {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["22", 0]}},
        "9":  {"class_type": "SaveImage",
               "inputs": {"images": ["8", 0], "filename_prefix": "c19b"}},
    }


def post(path, payload):
    req = urllib.request.Request(COMFY + path, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req))


def get(path):
    return json.load(urllib.request.urlopen(COMFY + path))


def run(name, wf, timeout=1800):
    pid = post("/prompt", {"prompt": wf, "client_id": str(uuid.uuid4())})["prompt_id"]
    print(f"[{name}] queued {pid}", flush=True)
    t0 = time.time()
    while True:
        hist = get(f"/history/{pid}")
        if pid in hist:
            break
        if time.time() - t0 > timeout:
            print(f"[{name}] TIMEOUT"); return None
        time.sleep(2.0)
    st = hist[pid].get("status", {})
    if st.get("status_str") == "error":
        print(f"[{name}] ERROR: {json.dumps(st)[:900]}")
        return None
    imgs = hist[pid]["outputs"]["9"]["images"]
    out = RAW / name
    out.mkdir(exist_ok=True)
    for i, img in enumerate(imgs):
        src = COMFY_OUT / img["subfolder"] / img["filename"] if img["subfolder"] else COMFY_OUT / img["filename"]
        shutil.copy(src, out / f"f{i:03d}.png")
    (RAW / f"{name}.workflow.json").write_text(json.dumps(wf, indent=1))
    print(f"[{name}] {len(imgs)} frames  {time.time()-t0:.1f}s", flush=True)
    return out


def main(chars, action_filter, length, steps, cfg, shift, suffix=""):
    for tag in chars:
        _ident, anchor, seed, script = CHARACTERS[tag]
        for action in script:
            if action_filter and action not in action_filter:
                continue
            run(f"{tag}_{action}{suffix}",
                workflow(anchor, CLIP_PROMPT[action], NEG_B, seed, length, steps, cfg, shift))


if __name__ == "__main__":
    # usage: gen_b.py <chars csv> <actions csv|all> [length] [steps] [cfg] [shift] [WxH] [suffix]
    chars = sys.argv[1].split(",") if len(sys.argv) > 1 else ["knight", "wizard"]
    acts = None if len(sys.argv) < 3 or sys.argv[2] == "all" else sys.argv[2].split(",")
    length = int(sys.argv[3]) if len(sys.argv) > 3 else 25
    steps = int(sys.argv[4]) if len(sys.argv) > 4 else 20
    cfg = float(sys.argv[5]) if len(sys.argv) > 5 else 5.0
    shift = float(sys.argv[6]) if len(sys.argv) > 6 else 8.0
    if len(sys.argv) > 7:
        W, H = (int(v) for v in sys.argv[7].lower().split("x"))
    suffix = sys.argv[8] if len(sys.argv) > 8 else ""
    main(chars, acts, length, steps, cfg, shift, suffix)
