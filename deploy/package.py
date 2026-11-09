#!/usr/bin/env python3
"""Build a static-only release without executing repository code."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import tarfile
import io


def build(root, output, revision):
    if not re.fullmatch(r'[0-9a-f]{40}', revision):
        raise ValueError('revision must be a full commit SHA')
    paths = [root / name for name in ('index.html', '404.html', '更新说明.html', '更新说明.pdf')]
    for directory in ('code', '手册'):
        base = root / directory
        if not base.is_dir() or base.is_symlink():
            raise ValueError(f'missing or unsafe directory: {directory}')
        paths.extend(sorted(base.rglob('*')))
    files = {}
    for path in paths:
        if path.is_symlink():
            raise ValueError(f'symlinks are forbidden: {path}')
        if path.is_dir():
            continue
        if not path.is_file():
            raise ValueError(f'missing or unsafe file: {path}')
        name = path.relative_to(root).as_posix()
        files[name] = {'size': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
    if 'code/index.html' not in files:
        raise ValueError('missing game entry point')
    manifest = json.dumps({'revision': revision, 'files': files}, ensure_ascii=False, sort_keys=True).encode()
    output.parent.mkdir(parents=True, exist_ok=True)
    with tarfile.open(output, 'w:gz') as archive:
        for name in sorted(files):
            archive.add(root / name, arcname=name, recursive=False)
        info = tarfile.TarInfo('_deployment.json')
        info.size = len(manifest)
        info.mode = 0o644
        archive.addfile(info, io.BytesIO(manifest))
    print(f'{len(files)} files, {sum(f["size"] for f in files.values())} bytes; revision {revision}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path('.'))
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--revision', required=True)
    args = parser.parse_args()
    build(args.root.resolve(), args.output, args.revision)
