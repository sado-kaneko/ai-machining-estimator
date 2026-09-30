-- PHASE12: NC自動旋盤見積Excel解析・Calculation Engine高度化 スキーマ追加
-- MySQL 5.6 互換

-- 1. machine_master テーブル拡張 (機械条件マスタ: ガイドブッシュ・バーフィーダ条件)
ALTER TABLE `machine_master`
  ADD COLUMN `guide_bush_type` VARCHAR(50) NOT NULL DEFAULT 'GUIDE_BUSH' AFTER `max_rpm`,
  ADD COLUMN `bar_feeder_enabled` TINYINT(1) NOT NULL DEFAULT 1 AFTER `guide_bush_type`,
  ADD COLUMN `max_machining_length` DECIMAL(10,2) NOT NULL DEFAULT 200.00 AFTER `bar_feeder_enabled`;

-- 2. automatic_lathe_process_master (Featureから工程判断マスタ)
CREATE TABLE IF NOT EXISTS `automatic_lathe_process_master` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `feature_type` VARCHAR(50) NOT NULL,
  `process_name` VARCHAR(100) NOT NULL,
  `calculation_type` VARCHAR(50) NOT NULL,
  `sequence_rule` INT NOT NULL DEFAULT 10,
  `machine_type` VARCHAR(50) NOT NULL DEFAULT 'NC_AUTOMATIC_LATHE',
  `description` VARCHAR(255) NULL,
  `default_time_sec` DECIMAL(8,3) NOT NULL DEFAULT 0.000,
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_alpm_feature` (`feature_type`),
  INDEX `idx_alpm_seq` (`sequence_rule`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. automatic_lathe_time_master (非切削時間マスタ)
CREATE TABLE IF NOT EXISTS `automatic_lathe_time_master` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `machine_type` VARCHAR(50) NOT NULL DEFAULT 'NC_AUTOMATIC_LATHE',
  `material_feed_time_sec` DECIMAL(8,3) NOT NULL DEFAULT 2.500,
  `tool_change_time_sec` DECIMAL(8,3) NOT NULL DEFAULT 1.500,
  `pickup_time_sec` DECIMAL(8,3) NOT NULL DEFAULT 2.000,
  `idle_time_sec` DECIMAL(8,3) NOT NULL DEFAULT 2.000,
  `spindle_acc_dec_time_sec` DECIMAL(8,3) NOT NULL DEFAULT 1.000,
  `description` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
