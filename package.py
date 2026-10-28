#!/usr/bin/env python3
"""Package the extension into build/ for Firefox (.xpi) and Chrome/Edge stores (.zip).

Usage: python3 package.py
"""

import json
import sys
import zipfile
from pathlib import Path

# Runtime files only; docs and editor settings are not shipped.
FILES = [
    "manifest.json",
    "rules.js",
    "content.js",
    "popup.html",
    "popup.js",
    "popup.css",
    "options.html",
    "options.js",
    "options.css",
]


def main():
    root = Path(__file__).resolve().parent
    version = json.loads((root / "manifest.json").read_text(encoding="utf-8"))["version"]

    missing = [name for name in FILES if not (root / name).is_file()]
    if missing:
        sys.exit(f"Missing files: {', '.join(missing)}")

    build = root / "build"
    build.mkdir(exist_ok=True)

    for extension in ("xpi", "zip"):
        output = build / f"chrome-tab-title-{version}.{extension}"

        # Entries are added by bare name so manifest.json sits at the archive
        # root, as Firefox requires.
        with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
            for name in FILES:
                archive.write(root / name, name)

        print(f"Created {output}")


if __name__ == "__main__":
    main()
