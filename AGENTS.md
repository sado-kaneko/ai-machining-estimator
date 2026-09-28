# Project Purpose

このプロジェクトは、金属切削加工部品の見積支援Webアプリです。

顧客から受領したPDF図面をOpenAI APIで解析し、
加工Featureを抽出し、
一般的な切削条件を使用して、
概算サイクルタイムを算出することを目的とします。

正確なNCシミュレーションではなく、
見積判断に使用できる概算加工時間を短時間で算出することを目的とします。


# Technology Stack

Frontend:
- Angular 22
- TypeScript
- SCSS
- Standalone Components

Backend:
- Node.js 24
- Express 5
- TypeScript

Database:
- MySQL 5.6
- mysql2

AI:
- OpenAI API
- OpenAI公式Node.js SDK
- Responses API
- Structured Outputs
- Zod


# MySQL Restrictions

本番データベースはMySQL 5.6です。

必ずMySQL 5.6互換で実装してください。

以下は禁止します。

- JSON型
- MySQL 5.7以降専用機能
- MySQL 8専用構文

AIから取得したJSON形式の生データをDBへ保存する場合は
LONGTEXTとして保存してください。

検索や計算に使用する値は通常のカラムへ正規化してください。


# Security

OPENAI_API_KEYはBackendからのみ使用してください。

AngularからOpenAI APIを直接呼び出してはいけません。

OPENAI_API_KEYをAngularへ送信してはいけません。

以下は.envから取得してください。

- OPENAI_API_KEY
- DB_HOST
- DB_PORT
- DB_NAME
- DB_USER
- DB_PASSWORD

.envはGit管理対象にしてはいけません。

OPENAI_API_KEYやDB_PASSWORDをログへ出力してはいけません。

顧客から受領したPDF図面もGitへ登録してはいけません。


# AI Responsibilities

OpenAI APIは主に図面解析を担当します。

AIが担当するもの：

- 図番
- 材質
- 素材情報
- 完成寸法
- 外径形状
- 内径形状
- 穴
- ボーリング
- タップ
- 外ねじ
- 内ねじ
- 溝
- 面取り
- 突切り
- 公差
- 表面粗さ
- 加工Featureの抽出

図面から判断できない情報を推測してはいけません。

判断できない値はnullとしてください。

必要に応じてneedsReview=trueとしてください。


# AI Prohibited Responsibilities

AIに最終サイクルタイムを推測させてはいけません。

AIに根拠のない切削条件を生成させてはいけません。

サイクルタイムはBackendのTypeScriptで計算してください。


# Cycle Time Calculation

概算サイクルタイムは決定論的な計算ロジックで算出します。

主に以下を使用します。

- 材質
- 加工種類
- 切削速度 Vc
- RPM
- 送り
- 切込み ap
- 切込み ae
- 加工径
- 加工距離
- 加工深さ
- 加工回数
- 非切削時間

切削条件はstandard_cutting_conditions等の
標準条件から取得する設計とします。

条件が存在しない場合は勝手に推測せず、
CONDITION_NOT_FOUND等の明示的な状態を返してください。


# Initial MVP Scope

初期バージョンは旋盤系の回転部品を対象とします。

初期対応加工：

- FACE
- OD
- ID
- DRILL
- BORE
- TAP
- THREAD_OD
- THREAD_ID
- GROOVE_OD
- GROOVE_ID
- CHAMFER
- CUTOFF

以下は初期バージョンでは対象外です。

- 5軸加工
- 複雑なマシニング加工
- 研削
- ワイヤー放電
- 形彫放電


# Development Rules

TypeScriptはstrict modeを使用してください。

Backendでは責務を分離してください。

- routes
- controllers
- services
- repositories
- schemas
- types
- middleware
- utils

Controllerへ複雑な業務ロジックを書かないでください。

SQL処理はrepository層へ分離してください。

Angular Componentへサイクルタイム計算ロジックを書かないでください。

計算ロジックには単体テストを作成してください。

各開発ステップ終了時には必要に応じて

- Backend build
- Backend test
- Angular build

を実行してください。

ビルドエラーを無視して次の工程へ進んではいけません。


# Development Process

一度にシステム全体を実装しないでください。

ユーザーから指示されたステップだけ実装してください。

指示されていない次工程を先回りして実装しないでください。
