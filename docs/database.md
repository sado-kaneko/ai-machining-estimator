# データベース設計書 (MySQL 5.6互換)

本ドキュメントは、金属切削加工見積支援Webアプリにおけるデータベース設計およびMySQL 5.6固有の制約事項をまとめたものです。

---

## 1. 基本設計方針とMySQL 5.6互換ルール

本番環境のデータベースは **MySQL 5.6** です。互換性を担保するため以下のルールを厳守しています。

1. **ストレージエンジンおよび文字コード**:
   - `ENGINE=InnoDB`
   - `DEFAULT CHARSET=utf8mb4`
2. **JSON型の使用禁止**:
   - MySQL 5.6にはJSON型が存在しないため、AIからの生レスポンスや警告データ等の構造化テキストは `LONGTEXT` 型として保存します。
   - 検索・計算・集計に利用する主要属性は、正規化された独立カラムに格納します。
3. **インデックス長の制限とutf8mb4**:
   - MySQL 5.6のInnoDBでは、プレフィックスインデックスの最大バイト長が767バイト（COMPACT/REDUNDANT行形式時）となる制限があります。
   - `utf8mb4` では1文字あたり最大4バイトを消費するため、インデックス対象となる文字列カラムは原則 `VARCHAR(191)` 以下（$191 \times 4 = 764$ バイト）で設計しています。
   - ファイルパス（`file_path`）やURL（`source_url`）などの長大列はインデックス対象から除外しています。
4. **日時カラム設計（updated_atのアプリケーション管理）**:
   - `created_at`: `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`
   - `updated_at`: `DATETIME NULL`
   - MySQL 5.6でのテーブル定義における単一TIMESTAMP自動更新の挙動差や不具合を防止するため、`ON UPDATE CURRENT_TIMESTAMP` には依存せず、Backend層から明示的に日時を更新する設計とします。
5. **列制約・機能の制限**:
   - 生成列（Generated Columns / Virtual Columns）は使用しません。
   - CHECK制約、Common Table Expressions (WITH構文)、ウィンドウ関数、MySQL 8専用構文は使用しません。
   - 列挙型（ENUM）はスキーマ変更コストが高く互換性リスクがあるため使用せず、`VARCHAR(50)` の状態コードとして管理します。
6. **数値型（精度と再現性）**:
   - 浮動小数点数（FLOAT / DOUBLE）は誤差が発生するため採用せず、見積計算の再現性と信頼性を担保するために `DECIMAL` を優先します。
   - 寸法・座標: `DECIMAL(12,4)`
   - 送り速度・切削条件: `DECIMAL(12,6)`
   - 回転数: `DECIMAL(12,2)`
   - 時間（秒）: `DECIMAL(14,3)`（ミリ秒単位まで高精度保持）
7. **秘密情報のDB非保持**:
   - `OPENAI_API_KEY`、`DB_PASSWORD` などの機密情報は、DB（`app_settings` テーブル等含む）には一切保持せず、実行時環境変数（`.env`）からのみ取得します。

---

## 2. テーブル一覧と概要

| No | テーブル名 | 論理名 | 概要 |
|---|---|---|---|
| 1 | `quotes` | 見積案件 | 顧客からの見積依頼単位を管理（図番、品名、数量、ステータス） |
| 2 | `drawings` | 図面 | 見積に紐づくPDF等の設計図面ファイル情報 |
| 3 | `drawing_analyses` | 図面解析結果 | OpenAI APIによる図面解析の実行結果（素材、外形、粗材情報） |
| 4 | `features` | 加工Feature | 図面解析から抽出された旋盤系加工特徴（端面、外径、内径、溝、ねじ等） |
| 5 | `standard_cutting_conditions` | 一般切削条件マスタ | 材質×加工種別×モードごとの標準切削条件（Vc, 送り, ap等） |
| 6 | `operations` | 加工工程 | サイクルタイム計算の実行工程単位（Feature紐づき、回転数、実加工時間） |
| 7 | `cycle_time_results` | サイクルタイム計算結果 | 見積案件全体の集計加工時間・非切削時間・ロット総時間 |
| 8 | `actual_cycle_times` | 実績サイクルタイム | 実際の加工後にフィードバックされた実績時間記録 |
| 9 | `app_settings` | アプリ共通設定 | 秘密情報以外のシステム共通パラメータ（キー・バリュー形式） |

---

## 3. テーブル定義詳細

### 3.1 quotes（見積案件）
見積業務の親エンティティ。
- `id`: BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `quote_no`: VARCHAR(100) NULL - 見積番号
- `customer_name`: VARCHAR(191) NOT NULL - 顧客名（日本語想定）
- `part_no`: VARCHAR(191) NOT NULL - 図番
- `part_name`: VARCHAR(191) NOT NULL - 品名
- `quantity`: INT UNSIGNED NOT NULL DEFAULT 1 - 製作ロット数
- `status`: VARCHAR(50) NOT NULL DEFAULT 'DRAFT' - 状態（DRAFT, ANALYZED, CALCULATED, COMPLETED等）
- `notes`: TEXT NULL - 備考
- `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at`: DATETIME NULL
- インデックス: `idx_quotes_status` (`status`)

### 3.2 drawings（図面）
受領したPDF図面ファイルのメタデータ。
- `id`: BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `quote_id`: BIGINT UNSIGNED NOT NULL - 紐づく見積案件ID
- `original_name`: VARCHAR(255) NOT NULL - アップロード元ファイル名
- `stored_name`: VARCHAR(191) NOT NULL UNIQUE - サーバー内一意保存ファイル名
- `mime_type`: VARCHAR(100) NOT NULL
- `file_size`: BIGINT UNSIGNED NOT NULL
- `file_path`: VARCHAR(500) NOT NULL - ストレージ内パス（インデックス非対象）
- `sha256`: CHAR(64) NOT NULL - ファイル改ざん・重複検出ハッシュ
- `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at`: DATETIME NULL
- 外部キー: `quote_id` -> `quotes.id` (ON DELETE CASCADE)
- インデックス: `uk_drawings_stored_name` (`stored_name`), `idx_drawings_quote_id` (`quote_id`)

### 3.3 drawing_analyses（図面解析結果）
OpenAI APIの図面解析結果と素材情報。
- `id`: BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `drawing_id`: BIGINT UNSIGNED NOT NULL - 紐づく図面ID
- `model_name`: VARCHAR(100) NOT NULL - 使用したAIモデル名
- `prompt_version`: VARCHAR(50) NOT NULL - プロンプトバージョン
- `analysis_status`: VARCHAR(50) NOT NULL DEFAULT 'PENDING' - 解析状態
- `part_type`: VARCHAR(50) NULL - 部品種別
- `material`: VARCHAR(100) NULL - 材質（S45C, SUS304, A6061等）
- `stock_type`: VARCHAR(50) NULL - 素材形態（BAR, PIPE, BLOCK等）
- `stock_diameter`: DECIMAL(12,4) NULL - 素材径
- `stock_width`: DECIMAL(12,4) NULL - 素材幅
- `stock_height`: DECIMAL(12,4) NULL - 素材高さ
- `stock_length`: DECIMAL(12,4) NULL - 素材長さ
- `overall_length`: DECIMAL(12,4) NULL - 仕上がり全長
- `raw_response`: LONGTEXT NULL - AIからの生JSONレスポンス
- `warnings`: LONGTEXT NULL - 解析警告メッセージ（JSON等）
- `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at`: DATETIME NULL
- 外部キー: `drawing_id` -> `drawings.id` (ON DELETE CASCADE)
- インデックス: `idx_drawing_analyses_drawing_id` (`drawing_id`)

### 3.4 features（加工Feature）
AIが図面から抽出した旋盤加工要素。
- `id`: BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `analysis_id`: BIGINT UNSIGNED NOT NULL - 解析結果ID
- `sequence_no`: INT UNSIGNED NOT NULL - 加工順序
- `feature_type`: VARCHAR(50) NOT NULL - FACE, OD, ID, DRILL, BORE, TAP, THREAD_OD, THREAD_ID, GROOVE_OD, GROOVE_ID, CHAMFER, CUTOFF等
- `description`: VARCHAR(255) NULL
- `start_diameter` / `end_diameter` / `diameter` / `length` / `depth` / `width`: DECIMAL(12,4) NULL - 加工形状寸法
- `thread_spec`: VARCHAR(50) NULL - ねじ規格（M10x1.5等）
- `count`: INT UNSIGNED NOT NULL DEFAULT 1 - 箇所数
- `tolerance_text`: VARCHAR(100) NULL - 公差表記
- `surface_roughness_text`: VARCHAR(100) NULL - 表面粗さ表記
- `needs_review`: TINYINT(1) NOT NULL DEFAULT 0 - 人手確認要否フラグ
- `source_text`: VARCHAR(255) NULL - 抽出元の図面テキスト
- `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at`: DATETIME NULL
- 外部キー: `analysis_id` -> `drawing_analyses.id` (ON DELETE CASCADE)
- インデックス: `idx_features_analysis_id` (`analysis_id`), `idx_features_feature_type` (`feature_type`)

### 3.5 standard_cutting_conditions（一般切削条件マスタ）
決定論的サイクルタイム計算の基準となる切削パラメータ。
- `id`: BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `material_group`: VARCHAR(50) NOT NULL - 材質グループ（STEEL, STAINLESS, ALUMINUM等）
- `material_name`: VARCHAR(100) NOT NULL - 材質名
- `operation_type`: VARCHAR(50) NOT NULL - 加工種別
- `mode`: VARCHAR(50) NOT NULL - ROUGH（荒）, FINISH（仕上）
- `tool_category`: VARCHAR(50) NOT NULL - 工具分類
- `diameter_min` / `diameter_max`: DECIMAL(12,4) NULL - 適用径範囲
- `vc`: DECIMAL(12,4) NOT NULL - 切削速度 (m/min)
- `feed_per_rev`: DECIMAL(12,6) NULL - 1回転あたり送り (mm/rev)
- `feed_per_tooth`: DECIMAL(12,6) NULL - 1刃あたり送り (mm/t)
- `ap`: DECIMAL(12,4) NULL - 切込み深さ (mm)
- `ae`: DECIMAL(12,4) NULL - 切込み幅 (mm)
- `source_name`: VARCHAR(100) NULL - 出典・工具メーカー名
- `source_url`: TEXT NULL - 出典URL（インデックス非対象）
- `enabled`: TINYINT(1) NOT NULL DEFAULT 1 - 有効フラグ
- `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at`: DATETIME NULL
- インデックス: `idx_scc_lookup` (`material_name`, `operation_type`, `mode`, `enabled`)

### 3.6 operations（加工工程）
実際のサイクルタイム計算が行われる工程。
- `id`: BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `quote_id`: BIGINT UNSIGNED NOT NULL
- `feature_id`: BIGINT UNSIGNED NULL - 元となったFeature（手動追加工程はNULL許可）
- `standard_condition_id`: BIGINT UNSIGNED NULL - 参照した切削条件
- `sequence_no`: INT UNSIGNED NOT NULL - 工程順序
- `operation_type` / `mode` / `tool_category`: VARCHAR(50) NOT NULL
- `work_diameter` / `cutting_length`: DECIMAL(12,4) NOT NULL
- `passes`: INT UNSIGNED NOT NULL DEFAULT 1 - パス回数
- `vc`: DECIMAL(12,4) NOT NULL
- `feed_per_rev` / `feed_per_tooth`: DECIMAL(12,6) NULL
- `ap` / `ae`: DECIMAL(12,4) NULL
- `rpm`: DECIMAL(12,2) NOT NULL - 計算回転数
- `feed_rate`: DECIMAL(12,4) NOT NULL - 計算送り速度 (mm/min)
- `cutting_time_sec`: DECIMAL(14,3) NOT NULL DEFAULT 0.000 - 実切削時間 (秒)
- `non_cutting_time_sec`: DECIMAL(14,3) NOT NULL DEFAULT 0.000 - アプローチ・逃げ・割出し等の非切削時間 (秒)
- `total_time_sec`: DECIMAL(14,3) NOT NULL DEFAULT 0.000 - 当該工程総時間 (秒)
- `condition_source`: VARCHAR(50) NOT NULL DEFAULT 'STANDARD' - STANDARD, CUSTOM, MANUAL
- `is_manual_override`: TINYINT(1) NOT NULL DEFAULT 0 - ユーザー手動上書きフラグ
- `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at`: DATETIME NULL
- 外部キー:
  - `quote_id` -> `quotes.id` (ON DELETE CASCADE)
  - `feature_id` -> `features.id` (ON DELETE SET NULL)
  - `standard_condition_id` -> `standard_cutting_conditions.id` (ON DELETE SET NULL)
- インデックス: `idx_operations_quote_id` (`quote_id`), `idx_operations_feature_id` (`feature_id`), `idx_operations_operation_type` (`operation_type`)

### 3.7 cycle_time_results（サイクルタイム計算結果）
案件全体の集計結果。
- `id`: BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `quote_id`: BIGINT UNSIGNED NOT NULL
- `cutting_time_sec` / `non_cutting_time_sec` / `total_cycle_time_sec`: DECIMAL(14,3) NOT NULL DEFAULT 0.000 - 1個あたりサイクルタイム
- `quantity`: INT UNSIGNED NOT NULL DEFAULT 1 - 計算ロット数
- `total_lot_time_sec`: DECIMAL(14,3) NOT NULL DEFAULT 0.000 - ロット合計時間 (秒)
- `calculation_version`: VARCHAR(50) NOT NULL DEFAULT '1.0.0' - ロジック版数
- `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at`: DATETIME NULL
- 外部キー: `quote_id` -> `quotes.id` (ON DELETE CASCADE)
- インデックス: `idx_ctr_quote_id` (`quote_id`)

### 3.8 actual_cycle_times（実績サイクルタイム）
製造実績フィードバック。
- `id`: BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `quote_id`: BIGINT UNSIGNED NOT NULL
- `cycle_time_result_id`: BIGINT UNSIGNED NULL
- `actual_cycle_time_sec`: DECIMAL(14,3) NOT NULL - 実際の1個あたり加工秒数
- `source`: VARCHAR(50) NOT NULL DEFAULT 'MANUAL' - 実績ソース
- `notes`: TEXT NULL
- `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at`: DATETIME NULL
- 外部キー:
  - `quote_id` -> `quotes.id` (ON DELETE CASCADE)
  - `cycle_time_result_id` -> `cycle_time_results.id` (ON DELETE SET NULL)
- インデックス: `idx_act_quote_id` (`quote_id`)

### 3.9 app_settings（アプリ共通設定）
システム共通の定数・パラメータ管理テーブル。
- `id`: BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `setting_key`: VARCHAR(191) NOT NULL UNIQUE - 設定キー
- `setting_value`: TEXT NOT NULL - 設定値
- `description`: VARCHAR(255) NULL - 設定説明
- `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at`: DATETIME NULL
- インデックス: `uk_app_settings_key` (`setting_key`)

---

## 4. 外部キーおよび削除ルール（ON DELETE）の設計方針

| 従属テーブル | 外部キー列 | 参照先テーブル(列) | ON DELETE | 設定理由 |
|---|---|---|---|---|
| `drawings` | `quote_id` | `quotes(id)` | **CASCADE** | 見積案件が削除された場合、紐づく図面メタデータも不要となるため連動削除。 |
| `drawing_analyses` | `drawing_id` | `drawings(id)` | **CASCADE** | 図面が削除された場合、その解析結果も存在意義を失うため連動削除。 |
| `features` | `analysis_id` | `drawing_analyses(id)` | **CASCADE** | 図面解析結果が削除された場合、抽出されたFeature一覧も連動削除。 |
| `operations` | `quote_id` | `quotes(id)` | **CASCADE** | 見積案件が削除された場合、算出工程一覧も連動削除。 |
| `operations` | `feature_id` | `features(id)` | **SET NULL** | 図面の再解析等で元のFeatureが削除・再作成された場合でも、手動修正された工程定義を破棄せず保持するため。 |
| `operations` | `standard_condition_id` | `standard_cutting_conditions(id)` | **SET NULL** | 標準切削条件マスタが削除・無効化された場合でも、過去の工程計算レコードに悪影響を与えないため。 |
| `cycle_time_results` | `quote_id` | `quotes(id)` | **CASCADE** | 見積案件が削除された場合、案件計算結果も連動削除。 |
| `actual_cycle_times` | `quote_id` | `quotes(id)` | **CASCADE** | 見積案件が削除された場合、実績レコードも連動削除。 |
| `actual_cycle_times` | `cycle_time_result_id` | `cycle_time_results(id)` | **SET NULL** | 再計算等で特定計算結果IDが参照不可になっても、実測された実績時間データ自体は維持するため。 |
