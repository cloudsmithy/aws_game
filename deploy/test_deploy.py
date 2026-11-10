import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest


def module(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(name + '.py'))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


package = module('package')
receiver = module('receive')


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / 'source'
        self.source.mkdir()
        for name in ('index.html', '404.html', 'docs/更新说明.html', 'docs/更新说明.pdf', 'code/index.html', 'code/audio/voice.m4a', 'docs/手册/玩法.pdf'):
            path = self.source / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b'content')
        self.base = self.root / 'server'
        (self.base / 'releases').mkdir(parents=True)

    def bundle(self, revision='a' * 40):
        path = self.root / 'bundle.tar.gz'
        package.build(self.source, path, revision)
        return path.read_bytes()

    def deploy(self, revision):
        receiver.operate(self.base, 'deploy ' + revision, io.BytesIO(self.bundle(revision)))

    def malformed(self, name, kind=tarfile.REGTYPE):
        data = io.BytesIO()
        with tarfile.open(fileobj=data, mode='w:gz') as archive:
            member = tarfile.TarInfo(name)
            member.type = kind
            member.linkname = '/tmp/escape'
            archive.addfile(member)
        data.seek(0)
        return data

    def test_real_layout_unicode_and_audio_preserved(self):
        self.deploy('a' * 40)
        current = self.base / 'current'
        self.assertEqual((current / 'docs/手册/玩法.pdf').read_bytes(), b'content')
        self.assertTrue((current / 'code/audio/voice.m4a').is_file())

    def test_bad_archive_cannot_change_current(self):
        self.deploy('a' * 40)
        for name, kind in [('../escape.html', tarfile.REGTYPE), ('/escape.html', tarfile.REGTYPE), ('link.html', tarfile.SYMTYPE), ('hard.html', tarfile.LNKTYPE), ('code/run.py', tarfile.REGTYPE)]:
            with self.subTest(name=name), self.assertRaises(ValueError):
                receiver.operate(self.base, 'deploy ' + 'b' * 40, self.malformed(name, kind))
        self.assertEqual((self.base / 'current').resolve().name, 'a' * 40)

    def test_hash_mismatch_rejected(self):
        raw = self.bundle()
        changed = io.BytesIO()
        with tarfile.open(fileobj=io.BytesIO(raw), mode='r:gz') as src, tarfile.open(fileobj=changed, mode='w:gz') as dst:
            for info in src:
                data = src.extractfile(info).read()
                if info.name == 'code/index.html':
                    data = b'changed'
                info.size = len(data)
                dst.addfile(info, io.BytesIO(data))
        changed.seek(0)
        with self.assertRaisesRegex(ValueError, 'hash mismatch'):
            receiver.operate(self.base, 'deploy ' + 'a' * 40, changed)
        self.assertFalse((self.base / 'current').exists())

    def test_revision_mismatch_rejected(self):
        with self.assertRaisesRegex(ValueError, 'revision mismatch'):
            receiver.operate(self.base, 'deploy ' + 'b' * 40, io.BytesIO(self.bundle()))

    def test_rollback_and_retention(self):
        for char in 'abcd':
            self.deploy(char * 40)
        self.assertEqual(len(list((self.base / 'releases').iterdir())), 3)
        receiver.operate(self.base, 'rollback ' + 'd' * 40, io.BytesIO())
        self.assertEqual((self.base / 'current').resolve().name, 'c' * 40)
        with self.assertRaisesRegex(ValueError, 'current revision changed'):
            receiver.operate(self.base, 'rollback ' + 'd' * 40, io.BytesIO())

    def test_same_revision_is_idempotent_but_immutable(self):
        self.deploy('a' * 40)
        self.deploy('a' * 40)
        (self.source / 'index.html').write_bytes(b'different')
        with self.assertRaisesRegex(ValueError, 'different content'):
            self.deploy('a' * 40)

    def test_arbitrary_ssh_command_rejected(self):
        for command in ('id', 'deploy master', 'deploy ' + 'a' * 40 + ';id'):
            with self.assertRaises(ValueError):
                receiver.operate(self.base, command, io.BytesIO())

    def test_source_symlink_rejected(self):
        (self.source / 'code/link.html').symlink_to('/etc/passwd')
        with self.assertRaisesRegex(ValueError, 'symlinks'):
            self.bundle()


if __name__ == '__main__':
    unittest.main()
