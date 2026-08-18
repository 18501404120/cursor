from __future__ import annotations

import unittest
from unittest.mock import patch

from kb_orchestrator.service.git_sync import (
    ERP_PRODUCT_PUSH_BRANCH,
    GIT_PUSH_SYSTEMS,
    LOCAL_SYSTEM_KEY,
    SYSTEM_BRANCH_MAP,
    GitSyncError,
    _ensure_github_repo_access,
    _format_vs_main,
    _is_sensitive_git_path,
    git_sync_manager,
)


class GitSyncTests(unittest.TestCase):
    def test_push_whitelist(self) -> None:
        self.assertIn(LOCAL_SYSTEM_KEY, GIT_PUSH_SYSTEMS)
        self.assertIn("销售系统", GIT_PUSH_SYSTEMS)
        self.assertIn("产品系统", GIT_PUSH_SYSTEMS)
        self.assertNotIn("客服系统", GIT_PUSH_SYSTEMS)

    def test_system_branch_map_uses_feature_branch(self) -> None:
        for name in GIT_PUSH_SYSTEMS:
            if name == LOCAL_SYSTEM_KEY:
                continue
            self.assertEqual(SYSTEM_BRANCH_MAP[name], ERP_PRODUCT_PUSH_BRANCH)
            self.assertEqual(SYSTEM_BRANCH_MAP[name], "feature-chengkaiwu-xiaoshou")

    @patch("kb_orchestrator.service.git_sync._fetch_origin_refs", return_value=True)
    @patch("kb_orchestrator.service.git_sync._fetch_origin_ref", return_value=True)
    def test_list_systems_includes_local_and_push_count(self, _fetch, _fetch_refs) -> None:
        data = git_sync_manager.list_systems()
        items = data["items"]
        self.assertTrue(any(item["key"] == LOCAL_SYSTEM_KEY for item in items))
        self.assertEqual(sum(1 for item in items if item["can_push"]), len(GIT_PUSH_SYSTEMS))
        self.assertTrue(all(
            item.get("can_merge") is (item["key"] in GIT_PUSH_SYSTEMS and item["key"] != LOCAL_SYSTEM_KEY)
            for item in items
        ))

    @patch("kb_orchestrator.service.git_sync._fetch_origin_refs", return_value=True)
    @patch("kb_orchestrator.service.git_sync._fetch_origin_ref", return_value=True)
    def test_list_systems_includes_vs_main(self, _fetch, _fetch_refs) -> None:
        data = git_sync_manager.list_systems()
        erp_pairs = []
        for item in data["items"]:
            self.assertIn("vs_main", item)
            vs_main = item["vs_main"]
            self.assertIn("ahead", vs_main)
            self.assertIn("behind", vs_main)
            self.assertIn("label", vs_main)
            self.assertIn("hint", vs_main)
            self.assertIn("state", vs_main)
            if item.get("kind") == "erp":
                erp_pairs.append((vs_main.get("ahead"), vs_main.get("behind")))
        self.assertTrue(erp_pairs)
        self.assertEqual(len(set(erp_pairs)), 1)

    def test_format_vs_main_labels(self) -> None:
        synced = _format_vs_main(0, 0, fetched=True, can_merge=True)
        self.assertEqual(synced["state"], "synced")
        self.assertEqual(synced["label"], "已同步")
        self.assertEqual(synced["hint"], "synced")

        behind = _format_vs_main(0, 3, fetched=True, can_merge=True)
        self.assertEqual(behind["state"], "behind")
        self.assertEqual(behind["label"], "落后 3 · 建议拉取")
        self.assertEqual(behind["hint"], "pull")

        ahead_merge = _format_vs_main(2, 0, fetched=True, can_merge=True)
        self.assertEqual(ahead_merge["label"], "超前 2 · 可合并")
        self.assertEqual(ahead_merge["hint"], "merge")

        ahead_push = _format_vs_main(2, 0, fetched=True, can_merge=False, can_push=True)
        self.assertEqual(ahead_push["label"], "超前 2 · 可推送")
        self.assertEqual(ahead_push["hint"], "push")

        ahead_readonly = _format_vs_main(2, 0, fetched=True, can_merge=False, can_push=False)
        self.assertEqual(ahead_readonly["label"], "超前 2")
        self.assertEqual(ahead_readonly["hint"], "synced")

        diverged = _format_vs_main(2, 3, fetched=True, can_merge=True)
        self.assertEqual(diverged["state"], "diverged")
        self.assertEqual(diverged["label"], "分叉：超前 2 · 落后 3 · 先拉取")
        self.assertEqual(diverged["hint"], "pull")

        unknown = _format_vs_main(None, None, fetched=False, can_merge=True)
        self.assertEqual(unknown["state"], "unknown")
        self.assertEqual(unknown["label"], "无法比较")

    def test_push_forbidden_system(self) -> None:
        with self.assertRaises(GitSyncError) as ctx:
            git_sync_manager.push_git("客服系统")
        self.assertEqual(ctx.exception.code, "forbidden")

    def test_merge_request_forbidden_system(self) -> None:
        with self.assertRaises(GitSyncError) as ctx:
            git_sync_manager.request_merge_main("客服系统")
        self.assertEqual(ctx.exception.code, "forbidden")

    def test_merge_request_forbidden_local(self) -> None:
        with self.assertRaises(GitSyncError) as ctx:
            git_sync_manager.request_merge_main(LOCAL_SYSTEM_KEY)
        self.assertEqual(ctx.exception.code, "forbidden")

    @patch("kb_orchestrator.service.git_sync._github_request")
    def test_ensure_github_repo_access_translates_404(self, mock_req) -> None:
        def side_effect(method, url, token, payload=None, **kwargs):
            if url.endswith("/user"):
                return {"login": "chengkaiwu-govee"}
            raise GitSyncError(
                "GitHub API 请求失败（404）",
                details="Not Found",
                code="github_api",
            )

        mock_req.side_effect = side_effect
        with self.assertRaises(GitSyncError) as ctx:
            _ensure_github_repo_access("igovee", "ERP_product", "token")
        self.assertEqual(ctx.exception.code, "github_repo_forbidden")
        self.assertIn("igovee/ERP_product", str(ctx.exception))
        self.assertIn("chengkaiwu-govee", ctx.exception.details)

    def test_sensitive_git_path_rules(self) -> None:
        self.assertTrue(_is_sensitive_git_path("config/daily-kb-sync.env"))
        self.assertTrue(_is_sensitive_git_path(".env"))
        self.assertFalse(_is_sensitive_git_path("config/daily-kb-sync.env.example"))
        self.assertFalse(_is_sensitive_git_path("方案设计/foo.html"))


if __name__ == "__main__":
    unittest.main()
