#!/usr/bin/env python3
"""
Placeholder generator: emits silent Ogg/Opus files for the marketing
audio sprite + ambient bed. Used ONLY when ffmpeg is unavailable to
assemble real CC0 sources. The resulting file is a structurally valid
Ogg/Opus stream of the requested duration containing only silence
frames, so Howler.js can decode and seek into it without errors.

References:
  - RFC 7845 (Ogg Encapsulation for Opus)
  - RFC 6716 (Opus codec, TOC byte + silence frame)

A "silent" Opus packet is a single TOC byte: 0xF8 (config 31, mono, 1
frame, 20 ms — CELT-only, fullband). An empty payload after the TOC
is interpreted by the decoder as PLC/silence.

Usage:
  python generate-silent-opus.py
"""
from __future__ import annotations
import struct, zlib, sys, os

# ----- CRC32 with Ogg's polynomial (0x04c11db7, no reflection, init 0) -----
def _ogg_crc_table():
    table = []
    for i in range(256):
        r = i << 24
        for _ in range(8):
            r = ((r << 1) ^ 0x04c11db7) & 0xFFFFFFFF if r & 0x80000000 else (r << 1) & 0xFFFFFFFF
        table.append(r)
    return table

_OGG_CRC = _ogg_crc_table()

def ogg_crc32(data: bytes) -> int:
    c = 0
    for b in data:
        c = (((c << 8) & 0xFFFFFFFF) ^ _OGG_CRC[((c >> 24) ^ b) & 0xFF])
    return c & 0xFFFFFFFF


def ogg_page(serial: int, page_no: int, granule: int, packets: list[bytes],
             header_type: int) -> bytes:
    """Build a single Ogg page containing the given packets (each packet
    becomes one or more lacing entries)."""
    segs = []
    for pkt in packets:
        n = len(pkt)
        while n >= 255:
            segs.append(255)
            n -= 255
        segs.append(n)
    if len(segs) > 255:
        raise ValueError("packets exceed one page; not handled by this minimal generator")
    seg_table = bytes(segs)
    body = b"".join(packets)
    header = b"OggS" + bytes([0]) + bytes([header_type]) + \
             struct.pack("<q", granule) + struct.pack("<I", serial) + \
             struct.pack("<I", page_no) + struct.pack("<I", 0) + \
             bytes([len(segs)]) + seg_table
    page = header + body
    crc = ogg_crc32(page)
    return page[:22] + struct.pack("<I", crc) + page[26:]


def opus_id_header(channels: int = 1, pre_skip: int = 312, sample_rate: int = 48000) -> bytes:
    return (b"OpusHead" +
            bytes([1]) +                       # version
            bytes([channels]) +                # channel count
            struct.pack("<H", pre_skip) +      # pre-skip (samples @ 48 kHz)
            struct.pack("<I", sample_rate) +   # original sample rate (info only)
            struct.pack("<h", 0) +             # output gain Q7.8 (0 dB)
            bytes([0]))                        # mapping family 0 (mono/stereo)


def opus_comment_header(vendor: str = "ironpath-placeholder") -> bytes:
    v = vendor.encode()
    return (b"OpusTags" +
            struct.pack("<I", len(v)) + v +
            struct.pack("<I", 0))              # 0 user comments


# Silent CELT-only fullband 20 ms packet: TOC byte 0xF8, no data.
# config = 31 (CELT-only, 20 ms, fullband), s = 0 (mono), c = 0 (1 frame)
SILENT_PACKET = bytes([0xF8])
FRAME_SAMPLES = 960   # 20 ms at 48 kHz


def write_silent_opus(path: str, duration_ms: int, channels: int = 1,
                      serial: int = 0xCAFE) -> int:
    n_frames = max(1, (duration_ms + 19) // 20)  # round up

    parts: list[bytes] = []
    # Page 0: identification header, BOS.
    parts.append(ogg_page(serial, 0, 0, [opus_id_header(channels)], header_type=0x02))
    # Page 1: comment header.
    parts.append(ogg_page(serial, 1, 0, [opus_comment_header()], header_type=0x00))

    # Audio pages: one packet per page keeps the page table tiny and the
    # generator simple. Granule position is monotonic (samples @ 48 kHz).
    page_no = 2
    granule = 0
    for i in range(n_frames):
        granule += FRAME_SAMPLES
        eos = 0x04 if i == n_frames - 1 else 0x00
        parts.append(ogg_page(serial, page_no, granule, [SILENT_PACKET],
                              header_type=eos))
        page_no += 1

    blob = b"".join(parts)
    with open(path, "wb") as fh:
        fh.write(blob)
    return len(blob)


# Sprite layout — keep in lockstep with SPRITE in lib/audio.ts.
# Sprite total duration must be at least the end of the last clip.
SPRITE_TOTAL_MS = 4400        # >= 2600 + 1800
AMBIENT_MS      = 8000        # 8 s loop bed (placeholder)


def main() -> int:
    out_dir = os.path.dirname(os.path.abspath(__file__))
    sprite = os.path.join(out_dir, "sfx-sprite.opus")
    ambient = os.path.join(out_dir, "ambient-bed.opus")

    sprite_size = write_silent_opus(sprite, SPRITE_TOTAL_MS, channels=1)
    ambient_size = write_silent_opus(ambient, AMBIENT_MS, channels=1)

    print(f"sfx-sprite.opus  : {sprite_size:>6} bytes ({SPRITE_TOTAL_MS} ms, mono, silent)")
    print(f"ambient-bed.opus : {ambient_size:>6} bytes ({AMBIENT_MS} ms, mono, silent)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
