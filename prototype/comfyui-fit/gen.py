"""PROTOTYPE harness — wipe me when trial #15 closes.

Submits a pinned FLUX.1-schnell API workflow to a local ComfyUI, waits for the
result via /history, and archives the raw PNG + the exact submitted workflow JSON
(provenance) into prototype/comfyui-fit/raw/. No custom nodes; core graph only.
"""
import json, sys, time, urllib.request, uuid, pathlib, shutil, hashlib

COMFY = "http://127.0.0.1:8188"
HERE = pathlib.Path(__file__).parent
RAW = HERE / "raw"
COMFY_OUT = pathlib.Path(r"C:\ComfyUI\exports")

# --- pinned FLUX.1-schnell graph (fp8 all-in-one checkpoint: model+clip+vae) ---
def workflow(prompt, negative, seed, w=512, h=768, steps=4):
    return {
        "4": {"class_type": "CheckpointLoaderSimple",
              "inputs": {"ckpt_name": "flux1-schnell-fp8.safetensors"}},
        "6": {"class_type": "CLIPTextEncode",
              "inputs": {"clip": ["4", 1], "text": prompt}},
        "7": {"class_type": "CLIPTextEncode",
              "inputs": {"clip": ["4", 1], "text": negative}},
        "5": {"class_type": "EmptySD3LatentImage",
              "inputs": {"width": w, "height": h, "batch_size": 1}},
        "3": {"class_type": "KSampler",
              "inputs": {"model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0],
                         "latent_image": ["5", 0], "seed": seed, "steps": steps,
                         "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple",
                         "denoise": 1.0}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
        "9": {"class_type": "SaveImage",
              "inputs": {"images": ["8", 0], "filename_prefix": f"c15_{seed}"}},
    }

def post(path, payload):
    req = urllib.request.Request(COMFY + path, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req))

def get(path):
    return json.load(urllib.request.urlopen(COMFY + path))

def run(tag, prompt, negative, seed, w=512, h=768):
    wf = workflow(prompt, negative, seed, w, h)
    pid = post("/prompt", {"prompt": wf, "client_id": str(uuid.uuid4())})["prompt_id"]
    print(f"[{tag} seed={seed}] queued {pid}", flush=True)
    t0 = time.time()
    while True:
        hist = get(f"/history/{pid}")
        if pid in hist:
            break
        if time.time() - t0 > 300:
            print(f"[{tag}] TIMEOUT"); return None
        time.sleep(1.5)
    outs = hist[pid]["outputs"]["9"]["images"]
    img = outs[0]
    src = COMFY_OUT / img["subfolder"] / img["filename"] if img["subfolder"] else COMFY_OUT / img["filename"]
    dest = RAW / f"{tag}_seed{seed}.png"
    shutil.copy(src, dest)
    sha = hashlib.sha256(dest.read_bytes()).hexdigest()[:16]
    (RAW / f"{tag}_seed{seed}.workflow.json").write_text(json.dumps(wf, indent=1))
    print(f"[{tag} seed={seed}] {dest.name}  {time.time()-t0:.1f}s  sha={sha}", flush=True)
    return dest

if __name__ == "__main__":
    spec = json.loads(pathlib.Path(sys.argv[1]).read_text())
    for job in spec:
        run(job["tag"], job["prompt"], job["negative"], job["seed"])
