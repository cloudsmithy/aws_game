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


def unpack(stream, destination, revision):
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
    match = re.fullmatch(r'(deploy|rollback) ([0-9a-f]{40})', command)
    if not match:
        raise ValueError('only deploy SHA or rollback SHA is permitted')
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
        unpack(stream, candidate, revision)
        target = releases / revision
        if target.exists():
            # An immutable release cannot be replaced by a different archive.
            if (target / '_deployment.json').read_bytes() != (candidate / '_deployment.json').read_bytes():
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
