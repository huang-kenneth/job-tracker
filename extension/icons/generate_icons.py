"""Generate placeholder icon PNGs (indigo solid squares). Stdlib only."""
import struct
import zlib
from pathlib import Path


def make_png(size, r, g, b):
    def chunk(tag, data):
        c = tag + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xFFFFFFFF)

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)

    raw = bytearray()
    for _ in range(size):
        raw.append(0)           # filter type: None
        for _ in range(size):
            raw += bytes([r, g, b])

    return (
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', ihdr)
        + chunk(b'IDAT', zlib.compress(bytes(raw)))
        + chunk(b'IEND', b'')
    )


base = Path(__file__).parent
# Indigo #4f46e5 = rgb(79, 70, 229)
for size in [16, 48, 128]:
    (base / f'icon-{size}.png').write_bytes(make_png(size, 79, 70, 229))
    print(f'icon-{size}.png generated')
