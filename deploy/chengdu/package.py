#!/usr/bin/env python3
"""Build a static-only release without executing repository code."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import tarfile
import io


LEGACY_STUB = ('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">'
               '<script>location.replace("../index.html" + location.search + location.hash);</script>'
               '<meta http-equiv="refresh" content="0; url=../index.html"></head>'
               '<body><a href="../index.html">云上大亨 · Cloud Tycoon</a></body></html>\n').encode()


def build(root, output, revision):
    if not re.fullmatch(r'[0-9a-f]{40}', revision):
        raise ValueError('revision must be a full commit SHA')
    # Site layout: code/ goes to the site root (without code/i18n/, the translation tables), and only the
    # HTML pages directly in docs/ are served under /docs/. PDFs and Markdown stay in the repository.
    entries = []
    for directory, prefix in (('code', ''), ('docs', 'docs/')):
        base = root / directory
        if not base.is_dir() or base.is_symlink():
            raise ValueError(f'missing or unsafe directory: {directory}')
        for path in sorted(base.rglob('*')):
            rel = path.relative_to(base).as_posix()
            if directory == 'code' and (rel == 'i18n' or rel.startswith('i18n/')):
                continue
            if directory == 'docs' and not (path.suffix == '.html' and '/' not in rel):
                continue
            entries.append((path, prefix + rel))
    files, sources = {}, {}
    for path, name in entries:
        if path.is_symlink():
            raise ValueError(f'symlinks are forbidden: {path}')
        if path.is_dir():
            continue
        if not path.is_file():
            raise ValueError(f'missing or unsafe file: {path}')
        files[name] = {'size': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
        sources[name] = path
    if 'index.html' not in files:
        raise ValueError('missing game entry point')
    # Old address /code/index.html: a tiny redirect to the site root. Also keeps the receiver already
    # installed on the server happy (it checks for both index.html and code/index.html).
    extra = {'code/index.html': LEGACY_STUB}
    for name, data in extra.items():
        files[name] = {'size': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
    manifest = json.dumps({'revision': revision, 'files': files}, ensure_ascii=False, sort_keys=True).encode()
    output.parent.mkdir(parents=True, exist_ok=True)
    with tarfile.open(output, 'w:gz') as archive:
        for name in sorted(files):
            if name in extra:
                info = tarfile.TarInfo(name)
                info.size = len(extra[name])
                info.mode = 0o644
                archive.addfile(info, io.BytesIO(extra[name]))
            else:
                archive.add(sources[name], arcname=name, recursive=False)
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
