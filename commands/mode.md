ライフサイクルモードを切り替える。`~/.claude/profiles/<mode>.json` を `~/.claude/settings.local.json` に書き出し、対応する `~/.claude/contexts/<mode>.md` があればセッションに適用する。

## 引数

`$ARGUMENTS` — モード名。省略または `list` で利用可能なモードを一覧表示。

## 手順

1. **引数が空または `list`** の場合:
   - `~/.claude/profiles/` 配下の `*.json` ファイル名を列挙し、各ファイルの `description` フィールドを添えて表示して終了する。

2. **モード名が指定された場合**:
   a. `~/.claude/profiles/<mode>.json` を Read する。存在しなければエラーを出して一覧を表示して終了する。
   b. 読み込んだ JSON を `~/.claude/settings.local.json` に Write する。
   c. `~/.claude/contexts/<mode>.md` が存在すれば Read してその内容を現在のセッションの追加指示として適用する。
   d. 適用したモードと主な変更点を 2〜3 行で報告する。

## 設計メモ

- `settings.local.json` は `settings.json` より優先され、hooks は**マージ（連結）**される。
- プロファイルは「追加」設計: `minimal` を適用すると `{}` になりベース設定のみ有効になる。
- hooks の無効化はベース `settings.json` から削除する方法のみ（上書き不可）。
