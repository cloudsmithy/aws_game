#!/usr/bin/env python3
"""Root-installed forced SSH command. Never executes uploaded files or shell commands."""
import fcntl
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import sys
import tarfile
import tempfile

BASE = Path('/srv/aws-game')
MAX_ARCHIVE = 256 * 1024**2
MAX_EXPANDED = 512 * 1024**2
SUFFIXES = {'.html', '.css', '.js', '.mjs', '.json', '.txt', '.md', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.mp3', '.m4a', '.ogg', '.wav', '.mp4', '.webm', '.pdf', '.wasm', '.xml', '.avif', '.webmanifest'}


def switch(base, name, target):
    temporary = base / ('.' + name + '-next')
    temporary.unlink(missing_ok=True)
    temporary.symlink_to(target)
    os.replace(temporary, base / name)


def safe_name(name):
    parts = PurePosixPath(name).parts
    if (not parts or name.startswith('/')
            or any(p in ('', '.', '..') or p.startswith('.') for p in parts)
            or str(PurePosixPath(name)) != name or '\\' in name
            or any(ord(c) < 32 or ord(c) == 127 for c in name)
            or len(name.encode()) > 512 or PurePosixPath(name).suffix.lower() not in SUFFIXES):
        raise ValueError(f'unsafe path: {name!r}')


def file_blob_id(path):
    digest = hashlib.sha1(b'blob ' + str(path.stat().st_size).encode() + b'\0')
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def inventory(base):
    files = {}
    total = 0
    current = base / 'current'
    if current.exists():
        if not current.is_symlink() or not current.resolve().is_dir():
            raise ValueError('current must be a release symlink')
        for path in sorted(current.rglob('*')):
            if path.is_symlink():
                raise ValueError('symlink in current release')
            if path.is_dir():
                continue
            name = path.relative_to(current).as_posix()
            if name == '_deployment.json':
                continue
            safe_name(name)
            if not path.is_file():
                raise ValueError('non-regular current file')
            files[name] = {'git_blob_sha': file_blob_id(path), 'size': path.stat().st_size}
            total += path.stat().st_size
            if len(files) > 5000 or total > MAX_EXPANDED:
                raise ValueError('current release exceeds inventory limits')
    digest = hashlib.sha256(json.dumps(files, sort_keys=True).encode()).hexdigest()
    return {'protocol': 'incremental-v1', 'digest': digest, 'files': files}


def assemble_delta(destination, manifest, names, base, baseline):
    if base is None or baseline is None or manifest.get('base_digest') != baseline['digest']:
        raise ValueError('server baseline changed; rebuild the delta from a fresh status')
    expected = manifest['files']
    if not isinstance(expected, dict) or len(expected) > 5000:
        raise ValueError('invalid target manifest')
    by_oid = {v['git_blob_sha']: name for name, v in baseline['files'].items()}
    required_uploads = set()
    total = 0
    for name, item in expected.items():
        safe_name(name)
        if name == '_deployment.json' or not isinstance(item, dict):
            raise ValueError('reserved or malformed manifest entry')
        size, oid = item.get('size'), item.get('git_blob_sha')
        if type(size) is not int or size < 0 or not isinstance(oid, str) or not re.fullmatch(r'[0-9a-f]{40}', oid):
            raise ValueError('invalid target size or hash')
        total += size
        if total > MAX_EXPANDED:
            raise ValueError('assembled release exceeds size limit')
        if oid not in by_oid:
            required_uploads.add(name)
    if names - {'_deployment.json'} != required_uploads:
        raise ValueError('delta upload list mismatch')
    for name, item in expected.items():
        path = destination / name
        oid = item['git_blob_sha']
        if name not in required_uploads:
            source = base / 'current' / by_oid[oid]
            path.parent.mkdir(parents=True, exist_ok=True, mode=0o755)
            # Copy, never hard-link: releases remain isolated for rollback.
            shutil.copyfile(source, path)
            path.chmod(0o644)
        if path.stat().st_size != item['size'] or file_blob_id(path) != oid:
            raise ValueError(f'assembled file hash mismatch: {name}')
    if not {'index.html', 'code/index.html'}.issubset(expected):
        raise ValueError('missing entry points')


def unpack(stream, destination, revision, base=None, baseline=None):
    """Validate the complete archive before publishing; reject links and traversal."""
    with tempfile.TemporaryFile() as incoming:
        size = 0
        while True:
            block = stream.read(1024 * 1024)
            if not block:
                break
            size += len(block)
            if size > MAX_ARCHIVE:
                raise ValueError('archive exceeds 256 MiB')
            incoming.write(block)
        incoming.seek(0)
        with tarfile.open(fileobj=incoming, mode='r:gz') as archive:
            members = []
            names = set()
            total = 0
            # Iterate with bounds instead of loading an unbounded member table.
            for member in archive:
                name = member.name
                parts = PurePosixPath(name).parts
                if (not member.isfile() or not parts or name.startswith('/')
                        or any(p in ('', '.', '..') or p.startswith('.') for p in parts)
                        or str(PurePosixPath(name)) != name or '\\' in name
                        or any(ord(c) < 32 or ord(c) == 127 for c in name)
                        or name in names or len(name.encode()) > 512
                        or PurePosixPath(name).suffix.lower() not in SUFFIXES):
                    raise ValueError(f'unsafe archive entry: {name!r}')
                names.add(name)
                members.append(member)
                total += member.size
                if len(members) > 5000 or total > MAX_EXPANDED:
                    raise ValueError('expanded archive limit exceeded')
            for member in members:
                path = destination / member.name
                path.parent.mkdir(parents=True, exist_ok=True, mode=0o755)
                with archive.extractfile(member) as source, path.open('xb') as target:
                    shutil.copyfileobj(source, target)
                path.chmod(0o644)
    meta = destination / '_deployment.json'
    if meta.stat().st_size > 2 * 1024**2:
        raise ValueError('manifest too large')
    manifest = json.loads(meta.read_text())
    if manifest['revision'] != revision:
        raise ValueError('manifest revision mismatch')
    if manifest.get('protocol') == 'incremental-v1':
        assemble_delta(destination, manifest, names, base, baseline)
        return
    expected = manifest['files']
    if set(expected) != names - {'_deployment.json'}:
        raise ValueError('manifest file list mismatch')
    for name, item in expected.items():
        path = destination / name
        if path.stat().st_size != item['size'] or hashlib.sha256(path.read_bytes()).hexdigest() != item['sha256']:
            raise ValueError(f'file hash mismatch: {name}')
    if not {'index.html', 'code/index.html'}.issubset(expected):
        raise ValueError('missing entry points')


def operate(base, command, stream):
    if command == 'status':
        print(json.dumps(inventory(base), sort_keys=True))
        return
    match = re.fullmatch(r'(deploy|rollback) ([0-9a-f]{40})', command)
    if not match:
        raise ValueError('only status, deploy SHA or rollback SHA is permitted')
    action, revision = match.groups()
    releases = base / 'releases'
    if action == 'rollback':
        current = base / 'current'
        if not current.is_symlink() or current.resolve().name != revision:
            raise ValueError('refusing rollback: current revision changed')
        previous = base / 'previous'
        if not previous.is_symlink() or not previous.resolve().is_dir():
            raise ValueError('no previous release')
        switch(base, 'current', os.readlink(previous))
        print('Rolled back', revision)
        return
    candidate = Path(tempfile.mkdtemp(prefix='.incoming-', dir=base))
    try:
        unpack(stream, candidate, revision, base, inventory(base))
        target = releases / revision
        if target.exists():
            # An immutable release cannot be replaced by a different archive.
            previous_manifest = json.loads((target / '_deployment.json').read_text())
            candidate_manifest = json.loads((candidate / '_deployment.json').read_text())
            old_files = {p.relative_to(target).as_posix(): file_blob_id(p) for p in target.rglob('*') if p.is_file() and p.relative_to(target).as_posix() != '_deployment.json'}
            new_files = {p.relative_to(candidate).as_posix(): file_blob_id(p) for p in candidate.rglob('*') if p.is_file() and p.relative_to(candidate).as_posix() != '_deployment.json'}
            if previous_manifest['revision'] != candidate_manifest['revision'] or old_files != new_files:
                raise ValueError('revision already exists with different content')
        else:
            candidate.rename(target)
        current = base / 'current'
        if current.is_symlink() and current.resolve() != target:
            switch(base, 'previous', os.readlink(current))
        switch(base, 'current', 'releases/' + revision)
        # Keep current, previous, and at most one other release. Reject symlinks.
        protected = {p.resolve() for p in (base / 'current', base / 'previous') if p.is_symlink()}
        others = sorted((p for p in releases.iterdir() if p.is_dir() and not p.is_symlink() and p.resolve() not in protected), key=lambda p: p.stat().st_mtime, reverse=True)
        for old in others[max(0, 3 - len(protected)):]:
            if re.fullmatch(r'[0-9a-f]{40}|bootstrap', old.name):
                shutil.rmtree(old)
        print('Deployed', revision)
    finally:
        if candidate.exists():
            shutil.rmtree(candidate)


def main():
    os.umask(0o022)
    with (BASE / '.deploy.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        operate(BASE, os.environ.get('SSH_ORIGINAL_COMMAND', ''), sys.stdin.buffer)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('Deployment rejected:', error, file=sys.stderr)
        sys.exit(1)
