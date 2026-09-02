from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from kb_orchestrator.service.preview_tree import (
    infer_badge,
    inject_inline_manifest,
    refresh_preview_trees,
    scan_html_tree,
)


class PreviewTreeTests(unittest.TestCase):
    def test_scan_includes_nested_html_and_skips_archive(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            (root / "03方案框架" / "产品架构").mkdir(parents=True)
            (root / "_archive").mkdir()
            (root / "03方案框架" / "方案框架.html").write_text("a", encoding="utf-8")
            (root / "03方案框架" / "产品架构" / "研发知识解耦产品架构.html").write_text(
                "b", encoding="utf-8"
            )
            (root / "_archive" / "old.html").write_text("c", encoding="utf-8")
            (root / "index.html").write_text("self", encoding="utf-8")

            tree = scan_html_tree(root, skip_root_index=True, open_depth=3)
            names = self._file_names(tree)
            self.assertIn("方案框架.html", names)
            self.assertIn("研发知识解耦产品架构.html", names)
            self.assertNotIn("old.html", names)
            self.assertNotIn("index.html", names)

    def test_infer_badge_uses_map_and_defaults(self) -> None:
        badges = {"项目/框架/方案框架.html": {"badge": "总览"}}
        mapped = infer_badge("项目/框架/方案框架.html", "方案框架.html", badges)
        self.assertEqual(mapped["badge"], "总览")
        demo = infer_badge("项目/a/项目知识库-demo.html", "项目知识库-demo.html", {})
        self.assertEqual(demo["badge"], "Demo")

    def test_refresh_writes_manifests(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            repo = Path(raw)
            project = repo / "方案设计" / "文件夹" / "项目" / "研发体现知识解耦"
            project.mkdir(parents=True)
            (project / "新品.html").write_text("ok", encoding="utf-8")
            (repo / "方案设计" / "文件夹" / "需求").mkdir(parents=True)
            (repo / ".git").mkdir()

            logs = refresh_preview_trees(repo)
            self.assertTrue(any("已更新" in line for line in logs))

            manifest = repo / "方案设计" / "文件夹" / "项目" / "preview-manifest.json"
            data = json.loads(manifest.read_text(encoding="utf-8"))
            names = self._file_names(data["tree"])
            self.assertIn("新品.html", names)

    def test_inject_inline_manifest_replaces_script(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            html_path = Path(raw) / "index.html"
            html_path.write_text(
                '<html><body><script src="../规范/assets/prototype-preview-tree.js"></script></body></html>',
                encoding="utf-8",
            )
            changed = inject_inline_manifest(
                html_path,
                {"tree": [{"type": "file", "name": "a.html", "href": "a.html"}]},
            )
            self.assertTrue(changed)
            html = html_path.read_text(encoding="utf-8")
            self.assertIn('"name": "a.html"', html)
            self.assertEqual(html.count('id="ppt-manifest"'), 1)
            self.assertLess(html.find('id="ppt-manifest"'), html.find('prototype-preview-tree.js'))

    def _file_names(self, nodes: list) -> set[str]:
        found: set[str] = set()
        for node in nodes:
            if node.get("type") == "file":
                found.add(node["name"])
            else:
                found.update(self._file_names(node.get("children") or []))
        return found


if __name__ == "__main__":
    unittest.main()
