#!/usr/bin/env python3
"""Build the bookmarklet from src.js.

Reads src.js, wraps it in a javascript: IIFE, URL-encodes it, and prints to stdout.
Copy the output and save it as a browser bookmark URL.
"""
import re
import sys
from pathlib import Path
from urllib.parse import quote

src = Path(__file__).parent / "src.js"
code = src.read_text(encoding="utf-8")

# Strip single-line comments (but not URLs — skip lines that look like they're inside strings)
code = re.sub(r'(?m)^\s*//.*$', '', code)
# Collapse blank lines
code = re.sub(r'\n{3,}', '\n\n', code)
# Trim
code = code.strip()

# Wrap in IIFE if not already wrapped (src.js already wraps itself, so unwrap and re-wrap cleanly)
# The src.js starts with (function(){ and ends with })();
# We just URL-encode the whole thing for use as a bookmarklet
bookmarklet = "javascript:" + quote(code, safe="")

print(bookmarklet)
