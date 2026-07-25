#!/bin/sh
python3 -m http.server 4175 --directory "$(dirname "$0")"
