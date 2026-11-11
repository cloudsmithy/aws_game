"""Exercise deltas against real Git commits and independent server releases."""
import contextlib
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest
from unittest.mock import patch

import incremental
import receive
import package


class IncrementalTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.repo = self.root / 'repo'
        self.repo.mkdir()
        self.base = self.root / 'server'
        (self.base / 'releases').mkdir(parents=True)
        self.old_cwd = Path.cwd()
        os.chdir(self.repo)
        self.addCleanup(os.chdir, self.old_cwd)
        self.git('init', '-q')
        self.git('config', 'user.name', 'Deployment test')
        self.git('config', 'user.email', 'test@example.invalid')
        self.git('remote', 'add', 'origin', str(self.repo))
        self.write('code/index.html', b'old page')
        self.write('code/audio/voice.m4a', b'unchanged audio' * 100000)
        self.write('code/obsolete.html', b'old document')
        self.write('docs/guide.html', b'guide')
        self.write('docs/excluded.pdf', b'not published')
        self.write('code/i18n/excluded.json', b'not published')
        self.first = self.commit()
        full = self.root / 'full.tar.gz'
        package.build(self.repo, full, self.first)
        with full.open('rb') as stream:
            receive.operate(self.base, 'deploy ' + self.first, stream)
        self.baseline = receive.inventory(self.base)

    def git(self, *args):
        return subprocess.check_output(['git', *args], stderr=subprocess.DEVNULL).decode().strip()

    def write(self, name, data):
        path = self.repo / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    def commit(self):
        self.git('add', '.')
        self.git('commit', '-qm', 'test revision')
        return self.git('rev-parse', 'HEAD')

    def delta(self, revision, baseline=None):
        out = self.root / 'delta.tar.gz'
        stats = incremental.build(revision, baseline or self.baseline, out)
        return out, stats

    def publish(self, revision, path):
        with path.open('rb') as stream:
            receive.operate(self.base, 'deploy ' + revision, stream)

    def test_page_only_edit_never_fetches_or_uploads_audio(self):
        self.write('code/index.html', b'new page')
        second = self.commit()
        run = subprocess.run
        with patch.object(incremental.subprocess, 'run', wraps=run) as calls:
            out, stats = self.delta(second)
        fetch_input = next(c.kwargs['input'].decode() for c in calls.call_args_list if 'input' in c.kwargs)
        self.assertNotIn(self.git('rev-parse', self.first + ':code/audio/voice.m4a'), fetch_input)
        with tarfile.open(out, 'r:gz') as archive:
            self.assertEqual(set(archive.getnames()), {'index.html', '_deployment.json'})
        self.assertEqual(stats['uploaded_files'], 1)
        self.assertEqual(stats['uploaded_content_bytes'], len(b'new page'))
        self.publish(second, out)
        self.assertEqual((self.base / 'current/index.html').read_bytes(), b'new page')
        self.assertEqual((self.base / 'current/audio/voice.m4a').read_bytes(), b'unchanged audio' * 100000)
        receive.operate(self.base, 'rollback ' + second, io.BytesIO())
        self.assertEqual((self.base / 'current/index.html').read_bytes(), b'old page')

    def test_rename_reuses_blob_and_deleted_paths_disappear(self):
        self.git('mv', 'code/audio/voice.m4a', 'code/audio/renamed.m4a')
        (self.repo / 'code/obsolete.html').unlink()
        revision = self.commit()
        out, stats = self.delta(revision)
        self.assertEqual(stats['uploaded_files'], 0)
        self.publish(revision, out)
        self.assertTrue((self.base / 'current/audio/renamed.m4a').is_file())
        self.assertFalse((self.base / 'current/audio/voice.m4a').exists())
        self.assertFalse((self.base / 'current/obsolete.html').exists())

    def test_stale_baseline_is_rejected_before_switch(self):
        self.write('code/index.html', b'new page')
        revision = self.commit()
        out, _ = self.delta(revision)
        (self.base / 'current/index.html').write_bytes(b'changed independently')
        with self.assertRaisesRegex(ValueError, 'baseline changed'):
            self.publish(revision, out)
        self.assertEqual((self.base / 'current').resolve().name, self.first)

    def test_retry_of_same_revision_is_idempotent_with_new_baseline(self):
        self.write('code/index.html', b'new page')
        revision = self.commit()
        out, _ = self.delta(revision)
        self.publish(revision, out)
        out, stats = self.delta(revision, receive.inventory(self.base))
        self.assertEqual(stats['uploaded_files'], 0)
        self.publish(revision, out)
        self.assertEqual((self.base / 'previous').resolve().name, self.first)

    def test_corrupt_delta_is_rejected(self):
        self.write('code/index.html', b'new page')
        revision = self.commit()
        out, _ = self.delta(revision)
        data = io.BytesIO()
        with tarfile.open(out, 'r:gz') as src, tarfile.open(fileobj=data, mode='w:gz') as dst:
            for member in src:
                content = src.extractfile(member).read()
                if member.name == 'index.html':
                    content = b'corrupt'
                member.size = len(content)
                dst.addfile(member, io.BytesIO(content))
        data.seek(0)
        with self.assertRaisesRegex(ValueError, 'hash mismatch'):
            receive.operate(self.base, 'deploy ' + revision, data)
        self.assertEqual((self.base / 'current').resolve().name, self.first)

    def test_no_current_first_deployment_and_status(self):
        empty = self.root / 'empty'
        (empty / 'releases').mkdir(parents=True)
        with contextlib.redirect_stdout(io.StringIO()) as output:
            receive.operate(empty, 'status', io.BytesIO())
        baseline = json.loads(output.getvalue())
        self.assertEqual(baseline['files'], {})
        out, stats = self.delta(self.first, baseline)
        self.assertEqual(stats['reused_files'], 0)
        with out.open('rb') as stream:
            receive.operate(empty, 'deploy ' + self.first, stream)
        self.assertTrue((empty / 'current/index.html').exists())

    def test_malicious_manifest_path_rejected(self):
        out, _ = self.delta(self.first)
        data = io.BytesIO()
        with tarfile.open(out, 'r:gz') as src, tarfile.open(fileobj=data, mode='w:gz') as dst:
            meta = json.load(src.extractfile('_deployment.json'))
            meta['files']['../escape.html'] = next(iter(meta['files'].values()))
            content = json.dumps(meta).encode()
            member = tarfile.TarInfo('_deployment.json')
            member.size = len(content)
            dst.addfile(member, io.BytesIO(content))
        data.seek(0)
        with self.assertRaisesRegex(ValueError, 'unsafe path'):
            receive.operate(self.base, 'deploy ' + self.first, data)
        self.assertFalse((self.base / 'escape.html').exists())

    def test_old_receiver_response_has_clear_upgrade_error(self):
        with self.assertRaisesRegex(ValueError, 'Upgrade the server receiver'):
            incremental.build(self.first, {}, self.root / 'delta.tar.gz')
