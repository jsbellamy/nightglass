"""PROTOTYPE BiRefNet alpha arm — wipe me when trial #21 closes.

Acquisition-time background removal: pushes each archived raw RGB reference
through local ComfyUI's *core* BiRefNet node and writes an RGBA PNG back into
the raw bundle. This runs at ACQUISITION time only. The downstream normalizer
never sees ComfyUI -- it consumes the archived RGBA exactly like any other raw.

  LoadImage -> RemoveBackground(birefnet) -> JoinImageWithAlpha -> SaveImage

Emits raw_rgba/<tag>.png plus <tag>.alpha.workflow.json for provenance.
"""
import json, pathlib, sys, time, urllib.request, urllib.parse, uuid

HERE = pathlib.Path(__file__).parent
RAW = HERE / "raw"
OUT = HERE / "raw_rgba"; OUT.mkdir(exist_ok=True)
SERVER = "http://127.0.0.1:8188"
CLIENT = str(uuid.uuid4())


def post(path, payload):
    req = urllib.request.Request(
        f"{SERVER}{path}", data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req).read())


def get(path):
    return json.loads(urllib.request.urlopen(f"{SERVER}{path}").read())


def upload(png: pathlib.Path) -> str:
    """Multipart upload into ComfyUI's input dir; returns the server-side name."""
    boundary = "----nightglass" + uuid.uuid4().hex
    body = b"".join([
        f'--{boundary}\r\nContent-Disposition: form-data; name="image"; '
        f'filename="{png.name}"\r\nContent-Type: image/png\r\n\r\n'.encode(),
        png.read_bytes(),
        f"\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"overwrite\"\r\n\r\ntrue\r\n".encode(),
        f"--{boundary}--\r\n".encode(),
    ])
    req = urllib.request.Request(
        f"{SERVER}/upload/image", data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    return json.loads(urllib.request.urlopen(req).read())["name"]


def workflow(image_name: str, tag: str, invert: bool) -> dict:
    wf = {
        "1": {"class_type": "LoadImage", "inputs": {"image": image_name}},
        "2": {"class_type": "LoadBackgroundRemovalModel",
              "inputs": {"bg_removal_name": "birefnet.safetensors"}},
        "3": {"class_type": "RemoveBackground",
              "inputs": {"bg_removal_model": ["2", 0], "image": ["1", 0]}},
        "5": {"class_type": "JoinImageWithAlpha",
              "inputs": {"image": ["1", 0], "alpha": ["3", 0]}},
        "6": {"class_type": "SaveImage",
              "inputs": {"images": ["5", 0], "filename_prefix": f"ng_alpha_{tag}"}},
    }
    if invert:
        wf["4"] = {"class_type": "InvertMask", "inputs": {"mask": ["3", 0]}}
        wf["5"]["inputs"]["alpha"] = ["4", 0]
    return wf


def run(tag: str, invert: bool) -> pathlib.Path:
    name = upload(RAW / f"{tag}.png")
    wf = workflow(name, tag, invert)
    pid = post("/prompt", {"prompt": wf, "client_id": CLIENT})["prompt_id"]
    while True:
        hist = get(f"/history/{pid}")
        if pid in hist:
            break
        time.sleep(0.4)
    img = hist[pid]["outputs"]["6"]["images"][0]
    q = urllib.parse.urlencode(
        {"filename": img["filename"], "subfolder": img.get("subfolder", ""),
         "type": img["type"]})
    data = urllib.request.urlopen(f"{SERVER}/view?{q}").read()
    dst = OUT / f"{tag}.png"
    dst.write_bytes(data)
    (OUT / f"{tag}.alpha.workflow.json").write_text(json.dumps(wf, indent=2))
    return dst


if __name__ == "__main__":
    args = sys.argv[1:]
    invert = "--invert" in args
    for tag in [a for a in args if not a.startswith("--")]:
        p = run(tag, invert)
        print(f"{tag}: {p} ({p.stat().st_size} bytes)")
