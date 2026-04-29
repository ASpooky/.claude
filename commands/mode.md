ライフサイクルモードを管理する。`~/.claude/.active-modes.json` でアクティブなプロファイルリストを管理し、変更のたびに全プロファイルを再マージして `~/.claude/settings.local.json` に書き出す。

## 使い方

| コマンド | 動作 |
|---|---|
| `/mode` または `/mode list` | 現在アクティブなモードと利用可能なプロファイルを表示 |
| `/mode --preset <name>` | アクティブリストを `[name]` だけにリセット |
| `/mode --add <name>` | 現在のリストに `<name>` を追加 |
| `/mode --delete <name>` | 現在のリストから `<name>` を削除 |

## 手順

### list（引数なし or `list`）

1. `~/.claude/.active-modes.json` を Read する（なければ `[]` とみなす）
2. `~/.claude/profiles/` の `*.json` ファイルを Glob で列挙する
3. 各プロファイルの `description` フィールドを読み、アクティブなものに `[active]` を付けて表示する

### --preset / --add / --delete 共通フロー

1. `~/.claude/.active-modes.json` を Read する（なければ `[]`）
2. 指定プロファイルが `~/.claude/profiles/<name>.json` として存在するか確認する。なければエラーを出して終了する
3. リストを更新する:
   - `--preset <name>`: リストを `[<name>]` に置き換える
   - `--add <name>`: リストに `<name>` を追加する（重複は無視）
   - `--delete <name>`: リストから `<name>` を除去する
4. 更新したリストを `~/.claude/.active-modes.json` に Write する
5. **再マージ**: アクティブリストの各プロファイル JSON を順番に Read し、以下のルールでマージした結果を `~/.claude/settings.local.json` に Write する:
   - `hooks` の各イベント配列（PreToolUse, PostToolUse, Stop など）は**連結**する
   - `permissions.allow` / `permissions.deny` は**連結**する
   - `mcpServers` はオブジェクトマージ（後勝ち）
   - `description` フィールドはスキップする（settings.local.json に含めない）
   - リストが空なら `{}` を書き出す
6. `--add` の場合: `~/.claude/contexts/<name>.md` があれば Read してセッションに適用する
7. 結果を報告する: `active: [strict, review]` のように現在のリストと主な変更点を 2〜3 行で示す
