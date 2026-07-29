from __future__ import annotations

import unittest

from kb_orchestrator.service.git_sync import (
    GIT_PUSH_SYSTEMS,
    LOCAL_SYSTEM_KEY,
    SYSTEM_BRANCH_MAP,
    GitSyncError,
    git_sync_manager,
)


class GitSyncTests(unittest.TestCase):
    def test_push_whitelist(self) -> None:
        self.assertIn(LOCAL_SYSTEM_KEY, GIT_PUSH_SYSTEMS)
        self.assertIn("销售系统", GIT_PUSH_SYSTEMS)
        self.assertIn("产品系统", GIT_PUSH_SYSTEMS)
        self.assertNotIn("客服系统", GIT_PUSH_SYSTEMS)

    def test_system_branch_map_covers_push_systems_except_local(self) -> None:
        for name in GIT_PUSH_SYSTEMS:
            if name == LOCAL_SYSTEM_KEY:
                continue
            self.assertIn(name, SYSTEM_BRANCH_MAP)

    def test_list_systems_includes_local_and_push_count(self) -> None:
        data = git_sync_manager.list_systems()
        items = data["items"]
        self.assertTrue(any(item["key"] == LOCAL_SYSTEM_KEY for item in items))
        self.assertEqual(sum(1 for item in items if item["can_push"]), len(GIT_PUSH_SYSTEMS))

    def test_push_forbidden_system(self) -> None:
        with self.assertRaises(GitSyncError) as ctx:
            git_sync_manager.push_git("客服系统")
        self.assertEqual(ctx.exception.code, "forbidden")


if __name__ == "__main__":
    unittest.main()
