"""Testes sem rede, contas reais ou produção."""
import hashlib
import io
import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
sys.dont_write_bytecode = True
import loja

SHA = 'a' * 40
REPO = 'example-owner/example-matrix'

def fixture(root, prefix=''):
    archive = root / ('github-fixture.zip' if prefix else 'fixture.zip')
    config = {'vars': {'STORE_MODE': 'template', 'META_ENABLED': 'false', 'ADMIN_EMAIL': '', 'ORDER_FROM_EMAIL': '', 'META_PIXEL_ID': '', 'REDELIVERY_PRODUCT_ID': ''}}
    with zipfile.ZipFile(archive, 'w') as z:
        for name in loja.REQUIRED:
            text = json.dumps(config) if name == 'wrangler.jsonc' else '{}' if name.endswith('.json') else 'Exemplo ficticio'
            z.writestr(prefix + name, text)
    manifest = {'commit': SHA, 'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(), 'fonte': 'github', 'repositorio': REPO, 'referenciaSolicitada': 'main'}
    return archive, manifest

class WorkflowTests(unittest.TestCase):
    def test_cli_requires_explicit_repository_for_downloading_another_copy(self):
        with self.assertRaises(SystemExit) as raised:
            loja.main(['iniciar', '--destino', 'C:/tmp/loja-teste'])
        self.assertEqual(raised.exception.code, 2)

    def test_new_store_uses_github_records_origin_and_does_not_overwrite(self):
        with tempfile.TemporaryDirectory(prefix='skill-loja-') as folder:
            root = Path(folder); archive, manifest = fixture(root); dest = root / 'loja'
            with patch.object(loja, 'github_archive', return_value=(archive, manifest)) as download:
                result = loja.initialize(str(dest), REPO)
                self.assertEqual(download.call_args.args[:2], (REPO, 'main'))
                self.assertEqual(result['fonte'], 'github')
                self.assertEqual(result['commitBase'], SHA)
                self.assertFalse((dest / '.git').exists())
                self.assertTrue(loja.audit(str(dest), 'matriz')['diagnosticoEstaticoAprovado'])
                self.assertFalse(loja.audit(str(dest), 'ativacao')['diagnosticoEstaticoAprovado'])
                self.assertIn('loja.nome', loja.status(str(dest))['camposAusentes'])
                state = loja.read_json(dest / 'PROJETO-LOJA.json')
                self.assertEqual(state['origem']['repositorio'], REPO)
                self.assertFalse(state['validacoes']['emailRecebido'])
                marker = dest / 'trabalho.txt'; marker.write_text('preservar', encoding='utf-8')
                with self.assertRaises(ValueError):
                    loja.initialize(str(dest))
                self.assertEqual(marker.read_text(encoding='utf-8'), 'preservar')
                self.assertEqual(download.call_count, 1)

    def test_access_failure_stops_without_local_fallback(self):
        with tempfile.TemporaryDirectory(prefix='skill-loja-') as folder:
            dest = Path(folder) / 'loja'
            with patch.object(loja, 'github_archive', side_effect=ValueError('sem acesso')):
                with self.assertRaises(ValueError):
                    loja.initialize(str(dest))
            self.assertFalse(dest.exists())
            self.assertFalse((loja.SKILL / 'assets/projeto-base.zip').exists())

    def test_changed_download_is_rejected_before_creating_directory(self):
        with tempfile.TemporaryDirectory(prefix='skill-loja-') as folder:
            root = Path(folder); archive, manifest = fixture(root)
            archive.write_bytes(b'alterado depois da conferencia')
            with self.assertRaises(ValueError):
                loja.materialize(str(root / 'loja'), archive, manifest)
            self.assertFalse((root / 'loja').exists())

    def test_github_resolves_commit_then_downloads_that_exact_revision(self):
        with tempfile.TemporaryDirectory(prefix='skill-loja-') as folder:
            root = Path(folder); raw, _ = fixture(root, 'repo-123/'); payload = raw.read_bytes(); calls = []
            def run(args, **kwargs):
                calls.append(args)
                if any('/commits/' in arg for arg in args):
                    return SimpleNamespace(returncode=0, stdout=(SHA+'\n').encode())
                kwargs['stdout'].write(payload)
                return SimpleNamespace(returncode=0)
            with patch.object(loja.shutil, 'which', return_value='gh'), patch.object(loja.subprocess, 'run', side_effect=run):
                archive, manifest = loja.github_archive(REPO, 'main', root)
            self.assertEqual(manifest['commit'], SHA)
            self.assertIn('/zipball/'+SHA, calls[1][-1])
            self.assertTrue(all('shell' not in call for call in calls))
            with zipfile.ZipFile(archive) as z:
                loja.safe_members(z)
                self.assertIn('wrangler.jsonc', z.namelist())

    def test_unsafe_archive_paths_and_private_files_are_rejected(self):
        for name in ('../fora.txt', 'C:/fora.txt', '..\\fora.txt', '.GIT/config', '.dev.vars', 'manual.pdf', 'CON.txt', 'pasta../x'):
            with self.subTest(name=name):
                stream=io.BytesIO()
                with zipfile.ZipFile(stream,'w') as z:
                    for required in loja.REQUIRED:
                        z.writestr(required,'{}')
                    z.writestr(name,'ficticio')
                stream.seek(0)
                with zipfile.ZipFile(stream) as z, self.assertRaises(ValueError):
                    loja.safe_members(z)

    def test_jsonc_preserves_urls_and_strings(self):
        parsed=loja.jsonc('{/*a*/"url":"https://example.invalid/a//b","v":[1,2,],//fim\n"name":"a\\\"b",}')
        self.assertEqual(parsed['url'],'https://example.invalid/a//b')
        self.assertEqual(parsed['name'],'a"b')
        self.assertEqual(parsed['v'],[1,2])

    def test_secret_is_reported_without_its_value(self):
        with tempfile.TemporaryDirectory(prefix='skill-loja-') as folder:
            root=Path(folder); archive, manifest=fixture(root); dest=root/'loja'
            loja.materialize(str(dest),archive,manifest)
            secret='re_'+'A'*30
            (dest/'dist/vazamento.js').write_text("const key='"+secret+"';",encoding='utf-8')
            result=loja.audit(str(dest),'matriz')
            self.assertFalse(result['diagnosticoEstaticoAprovado'])
            self.assertIn('dist/vazamento.js',json.dumps(result))
            self.assertNotIn(secret,json.dumps(result))

if __name__ == '__main__':
    unittest.main(verbosity=2)
