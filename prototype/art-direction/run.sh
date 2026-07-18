#!/bin/sh
python3 -m http.server 4174 --directory "$(dirname "$0")"
