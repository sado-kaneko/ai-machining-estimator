-- PHASE09: 加工機別サイクルタイム計算基盤 共通化 スキーマ追加
-- MySQL 5.6 互換

-- 1. machine_master テーブルへの calculation_engine_type カラム追加
-- (既存カラムが存在しない場合のみ追加)
ALTER TABLE `machine_master`
  ADD COLUMN `calculation_engine_type` VARCHAR(50) NOT NULL DEFAULT 'AUTOMATIC_LATHE' AFTER `machine_type`;

-- 2. 案件別加工機選定テーブル (quote_machine_selection)
CREATE TABLE IF NOT EXISTS `quote_machine_selection` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `quote_id` BIGINT UNSIGNED NOT NULL,
  `machine_id` BIGINT UNSIGNED NOT NULL,
  `priority` INT UNSIGNED NOT NULL DEFAULT 1,
  `selected` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_qms_quote_id` (`quote_id`),
  INDEX `idx_qms_machine_id` (`machine_id`),
  CONSTRAINT `fk_qms_quote_id`
    FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_qms_machine_id`
    FOREIGN KEY (`machine_id`) REFERENCES `machine_master` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
