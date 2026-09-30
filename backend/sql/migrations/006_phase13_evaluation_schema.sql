-- PHASE13: NC自動旋盤計算精度検証・補正機能 スキーマ追加
-- MySQL 5.6 互換

-- 1. cycle_time_evaluations テーブル (計算値・Excel値・実績値の比較履歴管理)
CREATE TABLE IF NOT EXISTS `cycle_time_evaluations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `quote_id` BIGINT UNSIGNED NOT NULL,
  `machine_id` BIGINT UNSIGNED NULL,
  `calculated_cycle_time_sec` DECIMAL(10,3) NOT NULL,
  `excel_cycle_time_sec` DECIMAL(10,3) NULL,
  `actual_cycle_time_sec` DECIMAL(10,3) NULL,
  `excel_difference_sec` DECIMAL(10,3) NULL,
  `excel_difference_rate` DECIMAL(8,2) NULL,
  `actual_difference_sec` DECIMAL(10,3) NULL,
  `actual_difference_rate` DECIMAL(8,2) NULL,
  `evaluation_status` VARCHAR(50) NOT NULL DEFAULT 'EVALUATED',
  `difference_category` VARCHAR(50) NOT NULL DEFAULT 'OTHER',
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_cte_quote_id` (`quote_id`),
  INDEX `idx_cte_machine_id` (`machine_id`),
  CONSTRAINT `fk_cte_quote_id`
    FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cte_machine_id`
    FOREIGN KEY (`machine_id`) REFERENCES `machine_master` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. lathe_correction_factors テーブル (補正係数管理)
CREATE TABLE IF NOT EXISTS `lathe_correction_factors` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `machine_id` BIGINT UNSIGNED NOT NULL,
  `material_name` VARCHAR(100) NOT NULL,
  `process_type` VARCHAR(100) NOT NULL DEFAULT 'ALL',
  `factor` DECIMAL(6,4) NOT NULL DEFAULT 1.0000,
  `sample_count` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_lcf_machine_mat_proc` (`machine_id`, `material_name`, `process_type`),
  CONSTRAINT `fk_lcf_machine_id`
    FOREIGN KEY (`machine_id`) REFERENCES `machine_master` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
