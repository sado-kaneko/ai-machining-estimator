# みつポン（サイクルタイム見積AIシステム / AI Machining Estimator）

金属切削加工部品（特にNC自動旋盤：Citizen Cincomシリーズ）のPDF図面をAIで解析し、一般的な切削条件および蓄積された自社加工実績に基づいて高精度な概算サイクルタイムを算出する見積支援Webアプリケーションです。

---

## 1. システム概要と開発背景

### 1.1 目的
- 顧客から受領したPDF図面から、加工Feature（外径、内径、穴、ねじ、溝、面取り、突切り等）や素材情報を抽出し、NC自動旋盤の加工工程を自動生成。
- 蓄積された加工ノウハウ（Excel見積支援ツールノウハウ）と生産管理システム（sadoa DB）の実績データを融合し、根拠のある概算加工時間（理論CTおよび実績補正CT）を短時間で算出。
- 過去の類似加工案件の参照、見積案件の確定・履歴管理、社内説明用の見積根拠資料（PDF/HTML）出力を実現。
- 実加工後の実績時間との自動比較・予測精度評価（ダッシュボード）を行い、継続的に補正係数を改善するフィードバックループを確立。

### 1.2 コアフロー
```text
図面PDF受領
  ↓
AI図面解析（GPT-4o / Structured Outputs）
  ↓
加工Feature抽出・素材開始条件設定
  ↓
加工工程（Operations）自動生成
  ↓
NC自動旋盤選択（Cincom L20 / M16 / M32）
  ↓
決定論的Calculation Engine（理論CT算出）
  ↓
承認済み自社加工実績による補正（実績補正CT算出）
  ↓
過去類似加工検索（100点満点スコアリング）による妥当性確認
  ↓
見積確定（案件ステータス管理・見積根拠資料出力）
  ↓
実加工・実績時間取得（生産管理DB連携）
  ↓
予測精度自動評価（誤差分析・KPI集計）
  ↓
補正係数改善候補の生成・技術者承認（次回見積へ反映）
```

---

## 2. 対象加工範囲と対応設備

### 2.1 対象加工
- **NC自動旋盤加工（回転部品・丸棒加工）**
  - FACE（端面）
  - OD（外径旋削）
  - ID（内径旋削 / ボーリング）
  - DRILL（穴あけ・センタ穴）
  - BORE（中繰り）
  - TAP（タップ内ねじ）
  - THREAD_OD / THREAD_ID（外径・内径ねじ切り）
  - GROOVE_OD / GROOVE_ID（外径・内径溝入れ）
  - CHAMFER（面取り・角落し）
  - CUTOFF（突切り・切断）

### 2.2 対象設備
- **Citizen Cincom L20**（主軸最大 10,000 rpm）
- **Citizen Cincom M16**（主軸最大 12,000 rpm）
- **Citizen Cincom M32**（主軸最大 8,000 rpm）
- （※将来拡張用マスタ枠: DMG MORI NLX2500 等）

---

## 3. 技術スタック (Technology Stack)

| レイヤー | 技術 / ライブラリ | バージョン / 詳細 |
| :--- | :--- | :--- |
| **Frontend** | Angular | 22 (Standalone Components, Signals, Reactive Forms) |
| | 言語 / スタイル | TypeScript 5.9, SCSS (レスポンシブ設計) |
| | テスト | Vitest / Angular CLI (`ng test`) |
| **Backend** | Node.js | 24 (Express 5) |
| | 言語 | TypeScript (strict mode 有効) |
| | DBクライアント | `mysql2/promise` (接続プール管理) |
| | 実行・開発 | `tsx` (TypeScript実行・ホットリロード) |
| **Database** | MySQL | **5.6 互換** (InnoDB, utf8mb4) |
| **AI** | OpenAI API | OpenAI公式Node.js SDK, GPT-4o, Structured Outputs, Zod |
| **外部連携** | 生産管理DB (sadoa) | 参照専用 (※INSERT/UPDATE/DELETE禁止) |

---

## 4. これまで実装した機能一覧（PHASE 01 〜 PHASE 18）

### 4.1 図面登録 & AI図面解析 (PHASE 01〜04)
- **PDFアップロード & プレビュー**: `pdf-to-img` による高解像度画像変換とブラウザ上での図面確認。
- **OpenAI Structured Outputs (Zod)**: 図番、材質、素材径、完成寸法、一般公差、表面粗さ、加工Feature構成を推測なしで高精度抽出。判断できない項目は `needsReview=true` として技術者へ確認促進。
- **セキュリティ**: `OPENAI_API_KEY` はBackend内でのみ利用し、フロントエンドやログには一切非公開。

### 4.2 加工内容確認 & Feature/工程管理 (PHASE 05〜07)
- **Feature編集UI**: 抽出されたFeatureの寸法・形状の確認、修正、新規追加。
- **加工工程自動生成**: Featureから旋盤加工工程（粗加工、仕上げ、突切りなど）のシーケンスを生成。
- **切削条件マスタ**: 材質（SUS304, S45C, A2017等）および加工種別ごとの標準切削速度（Vc）、送り（Feed）、切込み量（ap）を管理。

### 4.3 NC自動旋盤 Calculation Engine (PHASE 08, 09, 12)
- **決定論的計算ロジック**: 切削時間 $T_c = \frac{\pi \cdot D \cdot L}{1000 \cdot V_c \cdot f}$ やRPM上限クリッピング、非切削時間（アプローチ・逃げ・主軸加減速・突切り時間）を厳密計算。
- **Excel見積ノウハウ統合**: 既存の社内見積Excelツール（`NC_見積支援【R21】.xlsm`）に含まれる非切削時間マスタ、設備条件マスタをDB化してEngineへ完全統合。
- **ロット総加工時間算出**: 数量に応じた段取り時間（準備時間）やロット合計加工時間を自動集計。

### 4.4 素材情報・加工開始条件管理 (PHASE 11)
- 素材種別（丸棒・六角・パイプ等）、供給外径、素材長、掴み代、残材処理条件を管理し、実際の加工代に応じた工程パス計算へ反映。

### 4.5 直感的な5ステップUIワークフロー (PHASE 10.5)
見積詳細画面を技術者の思考フローに合わせた5ステップで再構築：
- **STEP 1: 図面・AI解析**: 図面登録・解析結果確認
- **STEP 2: 加工内容確認**: Feature一覧・加工工程シーケンス確認
- **STEP 3: 設備・CT計算**: 機械選択・理論CTおよび実績補正CTのリアルタイム算出
- **STEP 4: 実績比較**: 過去実績との予実比較・差異分析
- **STEP 5: 見積確定・根拠**: 類似加工実績確認・見積確定保存・根拠資料出力

### 4.6 生産実績連携 & 統計分析基盤 (PHASE 14, 15)
- **生産管理システム（sadoa DB）連携**: 過去2,000件以上の実加工実績データ（d_nkoutei, hdata, d_nkakou等）を安全に同期・蓄積。
- **統計分析 & 信頼度評価**: 設備別・材料別の実績倍率（平均・中央値・標準偏差）を算出。サンプル件数（20件以上）に応じて `HIGH / MEDIUM / LOW` の信頼度を付与。

### 4.7 実績フィードバック型 補正Engine (PHASE 16)
- **実績補正の自動適用**: 承認済み（`approved = 1`）かつ信頼度基準を満たす補正係数がある場合のみ、理論CTに倍率を適用して「最終予測CT」を算出。
- **適用履歴管理**: 補正前CT、適用倍率、適用根拠（設備×材料）を `correction_history` に監査記録。

### 4.8 見積業務管理 & 見積根拠資料出力 (PHASE 17)
- **案件管理・ステータス運用**: `DRAFT` → `ANALYZING` → `CALCULATED` → `REVIEW` → `APPROVED` → `COMPLETED`。
- **見積確定結果保存 (`quote_results`)**: 確定者、確定日時、最終CT、ロット総時間、適用補正根拠、特記事項を保存。
- **見積変更履歴 (`quote_history`)**: 確定やステータス変更の前後差分を記録。
- **社内説明用 見積根拠資料出力 (`/api/quotes/:id/export-pdf`)**: 顧客名、図番、使用設備、理論CT、実績補正根拠、全工程明細テーブルをフォーマット化した印刷用HTML/PDFビューア機能。

### 4.9 類似加工検索高度化 (PHASE 18)
- **ルールベース100点満点スコアリング**:
  - 材料完全一致: 20点
  - 設備厳密一致 (L20 / M16 / M32): 15点
  - 素材径近似 (誤差5%以内〜30%超): 最大15点 (0除算対策済)
  - Feature構成一致 (Jaccard係数): 最大35点
  - 寸法近似 (最大径・最小径・全長): 最大15点
- 類似度レベル（`HIGH` 80点以上、`MEDIUM` 60〜79点、`REFERENCE` 40〜59点）およびスコア内訳をSTEP 5に表示。
- 監査・再現用テーブル `similarity_results` への動的保存。

### 4.10 予測精度の継続評価 & 精度分析ダッシュボード (PHASE 18)
- **精度評価自動化 (`prediction_accuracy`)**:
  - 符号付き誤差率: $\frac{\text{実績CT} - \text{予測CT}}{\text{予測CT}}$ （過小・過大判定）
  - 絶対誤差率: $\frac{|\text{実績CT} - \text{予測CT}|}{\text{実績CT}}$
- **ダッシュボード画面 (`/accuracy`)**:
  - 全体KPIサマリ（評価件数、平均絶対誤差率、中央値、10%以内適合率、20%以内適合率、過小/過大傾向）
  - 補正有効性比較カード（理論CT誤差 vs 補正後CT誤差、改善率 %）
  - 設備別精度テーブル（L20, M16, M32別の誤差率・過小予測率）
  - 材料別精度テーブル（材料ごとの誤差率と信頼度）
  - 月別精度推移テーブル（月次誤差率推移とプログレスバー）
  - 補正係数改善候補一覧（サンプル数>=20の実績差異に基づく改善推奨）
  - **技術者承認フロー**: 補正改善候補の自動適用は禁止し、技術者のモーダル確認・承認によってのみマスタ更新。
  - 精度評価明細レコード一覧

### 4.11 UI最終調整 & レスポンシブ対応 (PHASE 18)
- Windows画面半分表示（900〜1100px）および狭幅デスクトップ（768〜900px）での操作性を重点最適化。
- テーブル外側の `.table-container` による横スクロール制御、長文折り返し（`overflow-wrap: anywhere`）。
- ページ全体（body/html）の不要な横スクロールを防止。
- ヘッダーへのブランドロゴ（`みつポンlogo`）配置とクリーンな白基調・ネイビーアクセントのカラー最適化。

---

## 5. データベース設計の重要規約 (MySQL 5.6 制約)

本番データベースは **MySQL 5.6** です。以下の制約を厳格に遵守しています：

- ❌ **JSON型の使用禁止**（MySQL 5.7以降の機能であるため）
- ❌ **Generated Column（仮想列）の使用禁止**
- ❌ **MySQL 8.0 専用関数の使用禁止**
- ⭕ AIから取得した生データや柔軟なJSON構造は **LONGTEXT** として保存
- ⭕ 検索、集計、結合に使用するキー項目は通常の正規化カラムとして設計
- ⭕ テーブルエンジンは `InnoDB`、文字コードは `utf8mb4`、インデックス長制限（191文字以下等）を考慮

### 主要マイグレーションファイル (`backend/sql/migrations/`)
- `001_initial_schema.sql`: 基本案件・図面・AI解析・Feature・工程
- `002_phase08_lathe_schema.sql`: 旋盤加工マスタ・条件
- `003_phase09_machine_engine_schema.sql`: 設備マスタ・設備選択
- `004_phase11_material_information_schema.sql`: 素材情報
- `005_phase12_lathe_master_schema.sql`: Excel解析ノウハウ・自動旋盤マスタ
- `006_phase13_evaluation_schema.sql`: 計算値比較・補正係数管理
- `007_phase14_production_actual_schema.sql`: 生産実績レコード・図番マッピング
- `008_phase15_production_analysis_schema.sql`: 実績統計分析結果・信頼度
- `009_phase16_correction_engine_schema.sql`: 補正Engine拡張・補正履歴
- `010_phase17_quote_management_schema.sql`: 見積確定結果・案件変更履歴
- `011_phase18_similarity_accuracy_schema.sql`: 類似検索監査・予測精度評価

---

## 6. ディレクトリ構成

```text
ai-machining-estimator/
├── backend/
│   ├── sql/migrations/            # MySQL 5.6用マイグレーションSQL (001〜011)
│   ├── src/
│   │   ├── calculation-engine/    # 決定論的サイクルタイム計算ロジック
│   │   ├── config/                # DB接続、OpenAI設定、環境変数、自動マイグレーション
│   │   ├── controllers/           # REST API コントローラー層
│   │   ├── middleware/            # セキュリティ、エラーハンドリング、アップロード
│   │   ├── repositories/          # MySQL 5.6互換 SQLクエリ実行層
│   │   ├── routes/                # Express API ルーティング定義
│   │   ├── schemas/               # Zod スキーマ (AI Structured Outputs)
│   │   ├── scripts/               # 単体・結合検証テストスクリプト
│   │   ├── services/              # 業務ロジック (類似検索、精度分析、補正Engine等)
│   │   ├── types/                 # TypeScript 型定義
│   │   ├── app.ts                 # Express アプリケーション設定
│   │   └── server.ts              # バックエンド起動エントリーポイント
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/              # 共通APIサービス・データモデル (accuracy, similarity等)
│   │   │   ├── features/
│   │   │   │   ├── quotes/        # 見積一覧・新規登録・詳細(STEP1〜STEP5)
│   │   │   │   ├── analysis/      # 実績統計分析コンポーネント (/analysis)
│   │   │   │   └── accuracy/      # 予測精度分析ダッシュボード (/accuracy)
│   │   │   ├── app.html / .scss   # ヘッダー・共通レイアウト
│   │   │   └── app.routes.ts      # Angular ルーティング設定
│   │   ├── assets/                # ロゴ画像 (mitsupon-logo.png 等)
│   │   ├── environments/          # API接続先設定 (environment.ts)
│   │   ├── index.html
│   │   └── styles.scss            # 共通レスポンシブユーティリティ
│   ├── angular.json
│   └── package.json
```

---

## 7. 開発環境のセットアップと実行手順

### 7.1 前提環境
- Node.js 24 以上
- MySQL 5.6 以上（または 5.6互換モード）

### 7.2 環境変数設定 (`backend/.env`)
`backend/.env` を作成し、以下を設定します（※Git管理対象外）：
```env
PORT=3100
DB_HOST=localhost
DB_PORT=3306
DB_NAME=kanekoapp
DB_USER=your_db_user
DB_PASSWORD=your_db_password
OPENAI_API_KEY=your_openai_api_key
```

### 7.3 バックエンドのセットアップと起動
```bash
cd backend
npm install

# 型チェック
npm run typecheck

# 開発サーバー起動 (ポート 3100 で待機)
npm run dev

# PHASE18機能検証テストの実行
npx tsx src/scripts/test-phase18.ts
```

### 7.4 フロントエンドのセットアップと起動
```bash
cd frontend
npm install

# 開発サーバー起動 (デフォルト: http://localhost:4200)
npm start

# ビルド検証
npm run build

# 単体テスト実行
npm test -- --watch=false
```

---

## 8. 新規参加開発者向け 設計・開発ルール

1. **AIの責務と禁止事項**
   - AIは「図面PDFからのFeature抽出・寸法抽出・材質抽出」のみを担当します。
   - **AIに最終サイクルタイムを推測させてはいけません。**
   - **AIに根拠のない切削条件を生成させてはいけません。**
   - サイクルタイムはすべてBackendのTypeScript（Calculation Engine）で決定論的に算出します。

2. **生産管理DB（sadoa）の扱い**
   - sadoa DBは参照専用です。いかなる場合も `INSERT`, `UPDATE`, `DELETE` を実行してはなりません。

3. **補正係数の自動適用禁止**
   - 蓄積された実績差異から算出される補正改善候補は、**必ず技術者の画面上での承認（`approved = 1`）を経てからマスタへ反映**されます。完全自動でのマスタ書き換えは禁止されています。

4. **レイアウト・レスポンシブの維持**
   - Windows環境でブラウザを画面半分に配置した状態（幅 900〜1100px）を常に想定してください。
   - テーブルは必ず `.table-container` 等で囲み、横スクロールをコンテナ内に閉じ込めてください。ページ全体（body）に横スクロールバーが出ないように注意してください。

5. **厳格なビルド・型チェック**
   - コミット・機能追加の前には、必ず Backend の `npm run typecheck` / `npm run build`、および Frontend の `npm run build` / `npm test` がエラー0件であることを確認してください。
