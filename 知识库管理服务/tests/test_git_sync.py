from __future__ import annotations

import unittest
from datetime import datetime, timedelta
from unittest.mock import patch
from zoneinfo import ZoneInfo

from kb_orchestrator.service.git_sync import (
    CODE_REPO_BACKEND,
    CODE_REPO_FRONTEND,
    CODE_REPO_KEYS,
    ERP_PRODUCT_PUSH_BRANCH,
    GIT_PUSH_SYSTEMS,
    LOCAL_SYSTEM_KEY,
    SYSTEM_BRANCH_MAP,
    GitSyncError,
    _ensure_github_repo_access,
    _format_vs_main,
    _is_sensitive_git_path,
    _vs_main_slot_start,
    _vs_main_snapshot_due,
    git_sync_manager,
)

SHANGHAI = ZoneInfo("Asia/Shanghai")


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

    @patch("kb_orchestrator.service.git_sync._save_vs_main_snapshot")
    @patch("kb_orchestrator.service.git_sync._load_vs_main_snapshot", return_value={})
    @patch("kb_orchestrator.service.git_sync._fetch_origin_refs", return_value=True)
    @patch("kb_orchestrator.service.git_sync._fetch_origin_ref", return_value=True)
    def test_list_systems_includes_local_and_push_count(
        self, _fetch, _fetch_refs, _load, _save
    ) -> None:
        data = git_sync_manager.list_systems()
        items = data["items"]
        self.assertTrue(any(item["key"] == LOCAL_SYSTEM_KEY for item in items))
        self.assertEqual(sum(1 for item in items if item["can_push"]), len(GIT_PUSH_SYSTEMS))
        self.assertTrue(all(
            item.get("can_merge") is (item["key"] in GIT_PUSH_SYSTEMS and item["key"] != LOCAL_SYSTEM_KEY)
            for item in items
        ))

    @patch("kb_orchestrator.service.git_sync._save_vs_main_snapshot")
    @patch("kb_orchestrator.service.git_sync._load_vs_main_snapshot", return_value={})
    @patch("kb_orchestrator.service.git_sync._fetch_origin_refs", return_value=True)
    @patch("kb_orchestrator.service.git_sync._fetch_origin_ref", return_value=True)
    def test_list_systems_includes_code_repos_pull_only(
        self, _fetch, _fetch_refs, _load, _save
    ) -> None:
        data = git_sync_manager.list_systems()
        items = data["items"]
        keys = [item["key"] for item in items]
        self.assertEqual(keys[:2], [CODE_REPO_BACKEND, CODE_REPO_FRONTEND])
        for item in items:
            if item["key"] not in CODE_REPO_KEYS:
                continue
            self.assertEqual(item["kind"], "code")
            self.assertFalse(item["can_push"])
            self.assertFalse(item["can_merge"])
            self.assertIn("vs_main", item)

    def test_push_forbidden_code_repo(self) -> None:
        with self.assertRaises(GitSyncError) as ctx:
            git_sync_manager.push_git(CODE_REPO_BACKEND)
        self.assertEqual(ctx.exception.code, "forbidden")

    def test_merge_request_forbidden_code_repo(self) -> None:
        with self.assertRaises(GitSyncError) as ctx:
            git_sync_manager.request_merge_main(CODE_REPO_FRONTEND)
        self.assertEqual(ctx.exception.code, "forbidden")

    @patch.object(type(git_sync_manager), "_pull_code", return_value={"ok": True, "action": "pull"})
    def test_pull_latest_routes_code_repo(self, mock_pull) -> None:
        result = git_sync_manager.pull_latest(CODE_REPO_BACKEND)
        mock_pull.assert_called_once()
        self.assertEqual(mock_pull.call_args.args[0], CODE_REPO_BACKEND)
        self.assertTrue(result["ok"])

    @patch("kb_orchestrator.service.git_sync._save_vs_main_snapshot")
    @patch("kb_orchestrator.service.git_sync._load_vs_main_snapshot", return_value={})
    @patch("kb_orchestrator.service.git_sync._fetch_origin_refs", return_value=True)
    @patch("kb_orchestrator.service.git_sync._fetch_origin_ref", return_value=True)
    def test_list_systems_includes_vs_main(self, _fetch, _fetch_refs, _load, _save) -> None:
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
                self.assertIn("compared_at", vs_main)
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

    @patch.object(type(git_sync_manager), "_merge_feature_into_main")
    @patch.object(type(git_sync_manager), "_push_erp_system")
    def test_merge_request_pushes_then_merges(self, mock_push, mock_merge) -> None:
        mock_push.return_value = {
            "ok": True,
            "skipped": False,
            "message": "销售系统：已推送到 feature-chengkaiwu-xiaoshou",
            "logs": ["pushed"],
        }
        mock_merge.return_value = {
            "ok": True,
            "action": "merge-request",
            "system": "销售系统",
            "message": "销售系统：已将 feature-chengkaiwu-xiaoshou 合并到 main 并推送",
            "logs": ["merged"],
        }
        result = git_sync_manager.request_merge_main("销售系统")
        mock_push.assert_called_once()
        mock_merge.assert_called_once()
        self.assertEqual(mock_push.call_args.args[0], "销售系统")
        self.assertEqual(mock_merge.call_args.args[0], "销售系统")
        self.assertFalse(result["skipped"])
        self.assertIn("已推送到", result["message"])
        self.assertIn("合并到 main", result["message"])
        self.assertTrue(any("① 推送到" in line for line in result["logs"]))
        self.assertTrue(any("② 合并" in line for line in result["logs"]))

    @patch.object(type(git_sync_manager), "_merge_feature_into_main")
    @patch.object(type(git_sync_manager), "_push_erp_system")
    def test_merge_request_push_skipped_still_merges(self, mock_push, mock_merge) -> None:
        mock_push.return_value = {
            "ok": True,
            "skipped": True,
            "message": "销售系统：无变更，无需推送",
            "logs": [],
        }
        mock_merge.return_value = {
            "ok": True,
            "action": "merge-request",
            "skipped": True,
            "message": "销售系统：feature-chengkaiwu-xiaoshou 没有领先 main 的提交，无需合并",
            "logs": ["no-op"],
        }
        result = git_sync_manager.request_merge_main("销售系统")
        mock_merge.assert_called_once()
        self.assertTrue(result["push_skipped"])
        self.assertTrue(result["skipped"])
        self.assertIn("无新变更", result["message"])

    @patch.object(type(git_sync_manager), "_merge_feature_into_main")
    @patch.object(type(git_sync_manager), "_push_erp_system")
    def test_merge_request_push_failure_skips_merge(self, mock_push, mock_merge) -> None:
        mock_push.side_effect = GitSyncError("push failed")
        with self.assertRaises(GitSyncError):
            git_sync_manager.request_merge_main("销售系统")
        mock_merge.assert_not_called()

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


class VsMainSnapshotTests(unittest.TestCase):
    def test_due_when_missing(self) -> None:
        now = datetime(2026, 9, 21, 15, 0, tzinfo=SHANGHAI)
        self.assertTrue(_vs_main_snapshot_due(None, now))

    def test_not_due_after_today_slot(self) -> None:
        now = datetime(2026, 9, 21, 15, 0, tzinfo=SHANGHAI)
        compared = datetime(2026, 9, 21, 10, 2, tzinfo=SHANGHAI)
        self.assertFalse(_vs_main_snapshot_due(compared, now))

    def test_due_when_compared_before_today_slot(self) -> None:
        now = datetime(2026, 9, 21, 15, 0, tzinfo=SHANGHAI)
        compared = datetime(2026, 9, 21, 9, 0, tzinfo=SHANGHAI)
        self.assertTrue(_vs_main_snapshot_due(compared, now))

    def test_not_due_before_10_if_yesterday_after_slot(self) -> None:
        now = datetime(2026, 9, 21, 9, 0, tzinfo=SHANGHAI)
        compared = datetime(2026, 9, 20, 10, 5, tzinfo=SHANGHAI)
        self.assertFalse(_vs_main_snapshot_due(compared, now))
        self.assertEqual(
            _vs_main_slot_start(now),
            datetime(2026, 9, 20, 10, 0, tzinfo=SHANGHAI),
        )

    def test_due_at_exactly_10_with_yesterday_snapshot(self) -> None:
        now = datetime(2026, 9, 21, 10, 0, tzinfo=SHANGHAI)
        compared = datetime(2026, 9, 20, 10, 5, tzinfo=SHANGHAI)
        self.assertTrue(_vs_main_snapshot_due(compared, now))

    @patch("kb_orchestrator.service.git_sync._save_vs_main_snapshot")
    @patch("kb_orchestrator.service.git_sync._fetch_origin_refs")
    @patch("kb_orchestrator.service.git_sync._fetch_origin_ref")
    def test_list_systems_uses_cached_vs_main(
        self, mock_fetch_ref, mock_fetch_refs, _save
    ) -> None:
        compared = _vs_main_slot_start() + timedelta(minutes=5)
        snapshot = {
            "compared_at": compared.isoformat(),
            "product": {"ahead": 2, "behind": 9, "fetched": True},
            "local": {"ahead": 0, "behind": 0, "fetched": True},
        }
        with patch(
            "kb_orchestrator.service.git_sync._load_vs_main_snapshot",
            return_value=snapshot,
        ):
            data = git_sync_manager.list_systems()
        mock_fetch_refs.assert_not_called()
        mock_fetch_ref.assert_not_called()
        erp = next(item for item in data["items"] if item.get("kind") == "erp")
        self.assertEqual(erp["vs_main"]["ahead"], 2)
        self.assertEqual(erp["vs_main"]["behind"], 9)
        self.assertEqual(erp["vs_main"]["label"], "分叉：超前 2 · 落后 9 · 先拉取")
        self.assertEqual(erp["vs_main"]["compared_at"], compared.isoformat())
        local = next(item for item in data["items"] if item["key"] == LOCAL_SYSTEM_KEY)
        self.assertEqual(local["vs_main"]["ahead"], 0)
        self.assertEqual(local["vs_main"]["behind"], 0)
        self.assertEqual(data["vs_main_compared_at"], compared.isoformat())


if __name__ == "__main__":
    unittest.main()
