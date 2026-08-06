from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from kb_orchestrator.service.git_sync import (
    ERP_PRODUCT_PUSH_BRANCH,
    GIT_PUSH_SYSTEMS,
    LOCAL_SYSTEM_KEY,
    SYSTEM_BRANCH_MAP,
    GitSyncError,
    _is_sensitive_git_path,
    git_sync_manager,
)


class GitSyncTests(unittest.TestCase):
    def test_push_whitelist(self) -> None:
        self.assertIn(LOCAL_SYSTEM_KEY, GIT_PUSH_SYSTEMS)
        self.assertIn("销售系统", GIT_PUSH_SYSTEMS)
        self.assertIn("产品系统", GIT_PUSH_SYSTEMS)
        self.assertNotIn("客服系统", GIT_PUSH_SYSTEMS)

    def test_system_branch_map_uses_single_push_branch(self) -> None:
        for name in GIT_PUSH_SYSTEMS:
            if name == LOCAL_SYSTEM_KEY:
                continue
            self.assertEqual(SYSTEM_BRANCH_MAP[name], ERP_PRODUCT_PUSH_BRANCH)

    def test_list_systems_includes_local_and_push_count(self) -> None:
        data = git_sync_manager.list_systems()
        items = data["items"]
        self.assertTrue(any(item["key"] == LOCAL_SYSTEM_KEY for item in items))
        self.assertEqual(sum(1 for item in items if item["can_push"]), len(GIT_PUSH_SYSTEMS))

    def test_push_forbidden_system(self) -> None:
        with self.assertRaises(GitSyncError) as ctx:
            git_sync_manager.push_git("客服系统")
        self.assertEqual(ctx.exception.code, "forbidden")

    def test_merge_request_forbidden_system(self) -> None:
        with self.assertRaises(GitSyncError) as ctx:
            git_sync_manager.request_merge_main("客服系统")
        self.assertEqual(ctx.exception.code, "forbidden")

    @patch.dict(os.environ, {"GITHUB_TOKEN": ""}, clear=False)
    def test_merge_request_requires_token(self) -> None:
        with self.assertRaises(GitSyncError) as ctx:
            git_sync_manager.request_merge_main("销售系统")
        self.assertEqual(ctx.exception.code, "no_token")

    def test_sensitive_git_path_rules(self) -> None:
        self.assertTrue(_is_sensitive_git_path("config/daily-kb-sync.env"))
        self.assertTrue(_is_sensitive_git_path(".env"))
        self.assertFalse(_is_sensitive_git_path("config/daily-kb-sync.env.example"))
        self.assertFalse(_is_sensitive_git_path("方案设计/foo.html"))


if __name__ == "__main__":
    unittest.main()
