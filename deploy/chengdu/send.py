#!/usr/bin/env python3
"""Stream a release to the forced SSH receiver with bounded progress output."""
from pathlib import Path
import subprocess
import sys
import time


def send(path, command):
    size = path.stat().st_size
    print(f'Uploading {size:,} compressed bytes to chengdu', flush=True)
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    count, last = 0, time.monotonic()
    try:
        with path.open('rb') as stream:
            for block in iter(lambda: stream.read(1024 * 1024), b''):
                process.stdin.write(block)
                count += len(block)
                if time.monotonic() - last >= 5:
                    print(f'Upload: {count:,}/{size:,} bytes ({count * 100 // max(size, 1)}%)', flush=True)
                    last = time.monotonic()
        process.stdin.close()
    except BaseException:
        process.stdin.close()
        process.wait()
        raise
    result = process.wait()
    if result:
        raise subprocess.CalledProcessError(result, command)
    print(f'Uploaded {count:,} bytes; server verified and switched release', flush=True)


if __name__ == '__main__':
    if len(sys.argv) < 4 or sys.argv[2] != '--':
        raise SystemExit('Usage: send.py ARCHIVE -- ssh [options] host "deploy SHA"')
    send(Path(sys.argv[1]), sys.argv[3:])
