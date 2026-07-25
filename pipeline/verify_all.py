"""Run the asset verify stages concurrently, reporting them in a fixed order.

The four stages are independent -- each reads the shared catalog and writes only
under its own directory -- so they overlap safely. Wall time is the slowest
stage rather than their sum. Output is buffered per stage and replayed in
declaration order so a failure reads exactly as it does when run alone.
"""
from __future__ import annotations

import subprocess
import sys
import pathlib

HERE = pathlib.Path(__file__).parent

STAGES: list[tuple[str, list[str]]] = [
    ("contract", [sys.executable, str(HERE / "test_contract.py")]),
    ("effects", [sys.executable, str(HERE / "effects" / "verify.py")]),
    ("icons", [sys.executable, str(HERE / "icons" / "verify.py")]),
    ("backdrops", [sys.executable, str(HERE / "backdrops.py"), "verify"]),
]


def main() -> int:
    running = [
        (name, subprocess.Popen(argv, stdout=subprocess.PIPE,
                                stderr=subprocess.STDOUT, text=True))
        for name, argv in STAGES
    ]
    failed: list[str] = []
    for name, process in running:
        output, _ = process.communicate()
        sys.stdout.write(output)
        if process.returncode != 0:
            failed.append(name)
    if failed:
        print(f"\nassets:verify FAILED in: {', '.join(failed)}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
