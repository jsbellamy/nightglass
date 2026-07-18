#!/bin/sh
python3 -m http.server 4173 --directory "$(dirname "$0")"

