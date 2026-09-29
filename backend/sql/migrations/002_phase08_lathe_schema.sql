-- PHASE08: NC自動旋盤 見積計算エンジン スキーマ追加
-- MySQL 5.6 互換

-- 1. 設備マスタ (machine_master)
CREATE TABLE IF NOT EXISTS `machine_master` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `machine_type` VARCHAR(50) NOT NULL,
  `machine_name` VARCHAR(100) NOT NULL,
  `maker` VARCHAR(100) NULL,
  `model` VARCHAR(100) NULL,
  `max_rpm` DECIMAL(12,2) NOT NULL DEFAULT 5000.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_machine_type` (`machine_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. 自動旋盤工程マスタ (lathe_process_master)
CREATE TABLE IF NOT EXISTS `lathe_process_master` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `process_category` VARCHAR(50) NOT NULL,
  `process_name` VARCHAR(100) NOT NULL,
  `calculation_type` VARCHAR(50) NOT NULL,
  `default_time_sec` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_lathe_process_lookup` (`process_name`, `enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. 自動旋盤切削条件マスタ (lathe_condition_master)
CREATE TABLE IF NOT EXISTS `lathe_condition_master` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `material_name` VARCHAR(100) NOT NULL,
  `process_id` BIGINT UNSIGNED NOT NULL,
  `tool_type` VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
  `diameter_min` DECIMAL(12,4) NULL,
  `diameter_max` DECIMAL(12,4) NULL,
  `vc` DECIMAL(12,4) NOT NULL,
  `feed` DECIMAL(12,6) NOT NULL,
  `ap` DECIMAL(12,4) NULL,
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_lcm_lookup` (`material_name`, `process_id`, `enabled`),
  CONSTRAINT `fk_lcm_process_id`
    FOREIGN KEY (`process_id`) REFERENCES `lathe_process_master` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. 設備固定・非切削時間マスタ (machine_time_master)
CREATE TABLE IF NOT EXISTS `machine_time_master` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `machine_type` VARCHAR(50) NOT NULL,
  `parameter_name` VARCHAR(100) NOT NULL,
  `time_sec` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_mtm_lookup` (`machine_type`, `parameter_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. NC自動旋盤工程テーブル (automatic_lathe_operations)
CREATE TABLE IF NOT EXISTS `automatic_lathe_operations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `quote_id` BIGINT UNSIGNED NOT NULL,
  `feature_id` BIGINT UNSIGNED NULL,
  `sequence_no` INT UNSIGNED NOT NULL,
  `process_id` BIGINT UNSIGNED NOT NULL,
  `machining_length` DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
  `diameter` DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
  `depth` DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
  `repeat_count` INT UNSIGNED NOT NULL DEFAULT 1,
  `feed` DECIMAL(12,6) NOT NULL DEFAULT 0.000000,
  `vc` DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
  `cutting_time_sec` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `non_cutting_time_sec` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `total_time_sec` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `status` VARCHAR(50) NOT NULL DEFAULT 'GENERATED',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_alo_quote_id` (`quote_id`),
  INDEX `idx_alo_feature_id` (`feature_id`),
  INDEX `idx_alo_process_id` (`process_id`),
  CONSTRAINT `fk_alo_quote_id`
    FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_alo_feature_id`
    FOREIGN KEY (`feature_id`) REFERENCES `features` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_alo_process_id`
    FOREIGN KEY (`process_id`) REFERENCES `lathe_process_master` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
