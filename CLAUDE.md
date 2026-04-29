## investigation-mcp

バグ調査時は以下のMCPツールを活用すること。

- 調査を始める前に `search_findings` で過去のキャッシュを確認する
- `stale: true` のfindingは参考程度に扱い、コードを実際に確認して鮮度を判断する
- 新しいfindingを得たら積極的に `add_finding` で記録する
- タグは具体的に付ける（サービス名、機能名、プロトコル名など）