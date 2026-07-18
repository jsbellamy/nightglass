"""PROTOTYPE path-A harness — wipe me when trial #19 closes.

Path A as it can actually be run under the commercial license gate: the ticket's
original "pose-conditioned" wording assumed an OpenPose ControlNet, but every
published FLUX pose ControlNet ships under flux-1-dev-non-commercial-license
(see the constraint-check comment on #19), so no ControlNet is used here.

Instead each keyframe is img2img-denoised **from the frozen canonical anchor**
with a fixed seed, varying only the pose clause. The anchor supplies identity;
the prompt supplies the pose. Denoise strength is the dial that trades pose range
against identity hold, so it is a sweepable parameter, not a constant.

Graph: CheckpointLoaderSimple -> LoadImage -> ImageScale -> VAEEncode
       -> KSampler(denoise<1) -> VAEDecode -> SaveImage
Core nodes only. Archives the exact submitted workflow JSON per frame.
"""
import json, sys, time, urllib.request, uuid, pathlib, shutil, hashlib

COMFY = "http://127.0.0.1:8188"
HERE = pathlib.Path(__file__).parent
RAW = HERE / "rawA"; RAW.mkdir(exist_ok=True)
COMFY_OUT = pathlib.Path(r"C:\ComfyUI\exports")
W, H = 512, 768                      # 2:3, aspect-matched to 32x48 (as phase 1)

sys.path.insert(0, str(HERE))
from actions import CHARACTERS, NEG


def workflow(anchor, prompt, negative, seed, denoise, steps):
    return {
        "4":  {"class_type": "CheckpointLoaderSimple",
               "inputs": {"ckpt_name": "flux1-schnell-fp8.safetensors"}},
        "10": {"class_type": "LoadImage", "inputs": {"image": anchor}},
        "11": {"class_type": "ImageScale",
               "inputs": {"image": ["10", 0], "upscale_method": "lanczos",
                          "width": W, "height": H, "crop": "center"}},
        "12": {"class_type": "VAEEncode",
               "inputs": {"pixels": ["11", 0], "vae": ["4", 2]}},
        "6":  {"class_type": "CLIPTextEncode",
               "inputs": {"clip": ["4", 1], "text": prompt}},
        "7":  {"class_type": "CLIPTextEncode",
               "inputs": {"clip": ["4", 1], "text": negative}},
        "3":  {"class_type": "KSampler",
               "inputs": {"model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0],
                          "latent_image": ["12", 0], "seed": seed, "steps": steps,
                          "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple",
                          "denoise": denoise}},
        "8":  {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
        "9":  {"class_type": "SaveImage",
               "inputs": {"images": ["8", 0], "filename_prefix": "c19a"}},
    }


def post(path, payload):
    req = urllib.request.Request(COMFY + path, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req))


def get(path):
    return json.load(urllib.request.urlopen(COMFY + path))


def run(name, wf):
    pid = post("/prompt", {"prompt": wf, "client_id": str(uuid.uuid4())})["prompt_id"]
    t0 = time.time()
    while True:
        hist = get(f"/history/{pid}")
        if pid in hist:
            break
        if time.time() - t0 > 300:
            print(f"[{name}] TIMEOUT"); return None
        time.sleep(1.0)
    img = hist[pid]["outputs"]["9"]["images"][0]
    src = COMFY_OUT / img["subfolder"] / img["filename"] if img["subfolder"] else COMFY_OUT / img["filename"]
    dest = RAW / f"{name}.png"
    shutil.copy(src, dest)
    (RAW / f"{name}.workflow.json").write_text(json.dumps(wf, indent=1))
    sha = hashlib.sha256(dest.read_bytes()).hexdigest()[:16]
    print(f"[{name}] {time.time()-t0:4.1f}s sha={sha}", flush=True)
    return dest


def main(chars, action_filter, denoises, steps):
    for tag in chars:
        ident, anchor, seed, script = CHARACTERS[tag]
        for action, frames in script.items():
            if action_filter and action not in action_filter:
                continue
            for dn in denoises:
                for fname, _hold, pose in frames:
                    prompt = f"{ident}, {pose}"
                    name = f"{tag}_{action}_{fname}_d{int(dn*100)}"
                    run(name, workflow(anchor, prompt, NEG, seed, dn, steps))


if __name__ == "__main__":
    # usage: gen_a.py <chars csv> <actions csv|all> <denoise csv> [steps]
    chars = sys.argv[1].split(",") if len(sys.argv) > 1 else ["knight", "wizard"]
    acts = None if len(sys.argv) < 3 or sys.argv[2] == "all" else sys.argv[2].split(",")
    dns = [float(x) for x in sys.argv[3].split(",")] if len(sys.argv) > 3 else [0.55]
    steps = int(sys.argv[4]) if len(sys.argv) > 4 else 8
    main(chars, acts, dns, steps)
