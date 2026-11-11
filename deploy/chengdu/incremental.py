#!/usr/bin/env python3
"""Plan from Git trees; fetch and package only blobs missing from the live server."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import tarfile

from package import LEGACY_STUB


def git(*args, **kwargs):
    return subprocess.check_output(['git', *args], **kwargs)


def blob_id(data):
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()


def targets(revision):
    if not re.fullmatch(r'[0-9a-f]{40}', revision):
        raise ValueError('full commit SHA required')
    result = {}
    for record in git('ls-tree', '-r', '-z', revision).split(b'\0'):
        if not record:
            continue
        header, path = record.split(b'\t', 1)
        mode, kind, oid = header.decode().split()
        path = path.decode('utf-8')
        if path.startswith('code/') and not path.startswith('code/i18n/'):
            name = path[len('code/'):]
        elif path.startswith('docs/') and path.endswith('.html') and path.count('/') == 1:
            name = path
        else:
            continue
        if mode not in ('100644', '100755') or kind != 'blob':
            raise ValueError(f'non-regular deployment file: {path}')
        if name in result or name == '_deployment.json':
            raise ValueError(f'reserved or duplicate output path: {name}')
        result[name] = oid
    if 'index.html' not in result:
        raise ValueError('missing game entry point')
    # Match package.py's existing root layout and legacy entry-point redirect.
    result['code/index.html'] = blob_id(LEGACY_STUB)
    return result


def build(revision, baseline, output, stats_output=None):
    if baseline.get('protocol') != 'incremental-v1':
        raise ValueError('Upgrade the server receiver before enabling incremental deployment')
    if not re.fullmatch(r'[0-9a-f]{64}', baseline.get('digest', '')):
        raise ValueError('invalid server inventory digest')
    old = baseline['files']
    by_oid = {item['git_blob_sha']: item for item in old.values()}
    wanted = targets(revision)
    stub_oid = blob_id(LEGACY_STUB)
    changed = {name: oid for name, oid in wanted.items() if oid not in by_oid}
    fetch = sorted(set(changed.values()) - {stub_oid})
    if fetch:
        print(f'Fetching {len(fetch)} changed Git blobs (unchanged assets are not downloaded)', flush=True)
        # One batch fetch, rather than one lazy network request per file. This uses
        # the public repo remote; no deploy credential is sent to GitHub.
        subprocess.run(['git', '-c', 'fetch.negotiationAlgorithm=noop', 'fetch', '--no-tags',
                        '--no-write-fetch-head', '--recurse-submodules=no', 'origin', '--stdin'],
                       input=''.join(oid + '\n' for oid in fetch).encode(), check=True)
    files = {}
    transferred = 0
    output.parent.mkdir(parents=True, exist_ok=True)
    with tarfile.open(output, 'w:gz') as archive:
        for name, oid in sorted(wanted.items()):
            if oid in by_oid:
                files[name] = {'git_blob_sha': oid, 'size': by_oid[oid]['size']}
                continue
            data = LEGACY_STUB if oid == stub_oid else git('cat-file', 'blob', oid)
            if blob_id(data) != oid:
                raise ValueError(f'Git blob mismatch: {name}')
            files[name] = {'git_blob_sha': oid, 'size': len(data)}
            member = tarfile.TarInfo(name)
            member.size, member.mode = len(data), 0o644
            archive.addfile(member, io.BytesIO(data))
            transferred += len(data)
        manifest = {'protocol': 'incremental-v1', 'revision': revision,
                    'base_digest': baseline['digest'], 'files': files}
        data = json.dumps(manifest, sort_keys=True, ensure_ascii=False).encode()
        member = tarfile.TarInfo('_deployment.json')
        member.size, member.mode = len(data), 0o644
        archive.addfile(member, io.BytesIO(data))
    stats = {'files': len(files), 'uploaded_files': len(changed),
             'reused_files': len(files) - len(changed), 'uploaded_content_bytes': transferred,
             'archive_bytes': output.stat().st_size,
             'removed_paths': len(set(old) - set(files)), 'revision': revision}
    if stats_output:
        stats_output.write_text(json.dumps(stats, indent=2))
    print(json.dumps(stats, indent=2), flush=True)
    return stats


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--revision', required=True)
    parser.add_argument('--baseline', type=Path)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--stats', type=Path)
    parser.add_argument('--plan', action='store_true')
    args = parser.parse_args()
    if args.plan:
        print(f'{len(targets(args.revision))} deployment paths; no asset blobs downloaded')
    else:
        if not args.baseline or not args.output:
            parser.error('--baseline and --output required')
        build(args.revision, json.loads(args.baseline.read_text()), args.output, args.stats)
