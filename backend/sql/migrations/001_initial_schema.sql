-- ==============================================================================
-- Migration: 001_initial_schema.sql
-- Target Database: MySQL 5.6
-- Engine: InnoDB
-- Charset: utf8mb4
-- Description: 金属切削加工見積支援Webアプリ 初期テーブル定義
-- Note: MySQL 5.6互換のため、JSON型や生成列は不使用。生JSONはLONGTEXTで保持。
-- ==============================================================================

-- 1. 見積案件テーブル (quotes)
CREATE TABLE IF NOT EXISTS `quotes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `quote_no` VARCHAR(100) NULL,
  `customer_name` VARCHAR(191) NOT NULL,
  `part_no` VARCHAR(191) NOT NULL,
  `part_name` VARCHAR(191) NOT NULL,
  `quantity` INT UNSIGNED NOT NULL DEFAULT 1,
  `status` VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_quotes_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. 図面テーブル (drawings)
CREATE TABLE IF NOT EXISTS `drawings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `quote_id` BIGINT UNSIGNED NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `stored_name` VARCHAR(191) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `file_size` BIGINT UNSIGNED NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `sha256` CHAR(64) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_drawings_stored_name` (`stored_name`),
  INDEX `idx_drawings_quote_id` (`quote_id`),
  CONSTRAINT `fk_drawings_quote_id`
    FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. 図面解析結果テーブル (drawing_analyses)
CREATE TABLE IF NOT EXISTS `drawing_analyses` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `drawing_id` BIGINT UNSIGNED NOT NULL,
  `model_name` VARCHAR(100) NOT NULL,
  `prompt_version` VARCHAR(50) NOT NULL,
  `analysis_status` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  `part_type` VARCHAR(50) NULL,
  `material` VARCHAR(100) NULL,
  `stock_type` VARCHAR(50) NULL,
  `stock_diameter` DECIMAL(12,4) NULL,
  `stock_width` DECIMAL(12,4) NULL,
  `stock_height` DECIMAL(12,4) NULL,
  `stock_length` DECIMAL(12,4) NULL,
  `overall_length` DECIMAL(12,4) NULL,
  `raw_response` LONGTEXT NULL,
  `warnings` LONGTEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_drawing_analyses_drawing_id` (`drawing_id`),
  CONSTRAINT `fk_drawing_analyses_drawing_id`
    FOREIGN KEY (`drawing_id`) REFERENCES `drawings` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. 加工Featureテーブル (features)
CREATE TABLE IF NOT EXISTS `features` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `analysis_id` BIGINT UNSIGNED NOT NULL,
  `sequence_no` INT UNSIGNED NOT NULL,
  `feature_type` VARCHAR(50) NOT NULL,
  `description` VARCHAR(255) NULL,
  `start_diameter` DECIMAL(12,4) NULL,
  `end_diameter` DECIMAL(12,4) NULL,
  `diameter` DECIMAL(12,4) NULL,
  `length` DECIMAL(12,4) NULL,
  `depth` DECIMAL(12,4) NULL,
  `width` DECIMAL(12,4) NULL,
  `thread_spec` VARCHAR(50) NULL,
  `count` INT UNSIGNED NOT NULL DEFAULT 1,
  `tolerance_text` VARCHAR(100) NULL,
  `surface_roughness_text` VARCHAR(100) NULL,
  `needs_review` TINYINT(1) NOT NULL DEFAULT 0,
  `source_text` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_features_analysis_id` (`analysis_id`),
  INDEX `idx_features_feature_type` (`feature_type`),
  CONSTRAINT `fk_features_analysis_id`
    FOREIGN KEY (`analysis_id`) REFERENCES `drawing_analyses` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. 一般切削条件マスタテーブル (standard_cutting_conditions)
CREATE TABLE IF NOT EXISTS `standard_cutting_conditions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `material_group` VARCHAR(50) NOT NULL,
  `material_name` VARCHAR(100) NOT NULL,
  `operation_type` VARCHAR(50) NOT NULL,
  `mode` VARCHAR(50) NOT NULL,
  `tool_category` VARCHAR(50) NOT NULL,
  `diameter_min` DECIMAL(12,4) NULL,
  `diameter_max` DECIMAL(12,4) NULL,
  `vc` DECIMAL(12,4) NOT NULL,
  `feed_per_rev` DECIMAL(12,6) NULL,
  `feed_per_tooth` DECIMAL(12,6) NULL,
  `ap` DECIMAL(12,4) NULL,
  `ae` DECIMAL(12,4) NULL,
  `source_name` VARCHAR(100) NULL,
  `source_url` TEXT NULL,
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_scc_lookup` (`material_name`, `operation_type`, `mode`, `enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. 加工工程テーブル (operations)
CREATE TABLE IF NOT EXISTS `operations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `quote_id` BIGINT UNSIGNED NOT NULL,
  `feature_id` BIGINT UNSIGNED NULL,
  `standard_condition_id` BIGINT UNSIGNED NULL,
  `sequence_no` INT UNSIGNED NOT NULL,
  `operation_type` VARCHAR(50) NOT NULL,
  `mode` VARCHAR(50) NOT NULL,
  `tool_category` VARCHAR(50) NOT NULL,
  `work_diameter` DECIMAL(12,4) NOT NULL,
  `cutting_length` DECIMAL(12,4) NOT NULL,
  `passes` INT UNSIGNED NOT NULL DEFAULT 1,
  `vc` DECIMAL(12,4) NOT NULL,
  `feed_per_rev` DECIMAL(12,6) NULL,
  `feed_per_tooth` DECIMAL(12,6) NULL,
  `ap` DECIMAL(12,4) NULL,
  `ae` DECIMAL(12,4) NULL,
  `rpm` DECIMAL(12,2) NOT NULL,
  `feed_rate` DECIMAL(12,4) NOT NULL,
  `cutting_time_sec` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `non_cutting_time_sec` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `total_time_sec` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `condition_source` VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
  `is_manual_override` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_operations_quote_id` (`quote_id`),
  INDEX `idx_operations_feature_id` (`feature_id`),
  INDEX `idx_operations_operation_type` (`operation_type`),
  CONSTRAINT `fk_operations_quote_id`
    FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_operations_feature_id`
    FOREIGN KEY (`feature_id`) REFERENCES `features` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_operations_standard_condition_id`
    FOREIGN KEY (`standard_condition_id`) REFERENCES `standard_cutting_conditions` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. サイクルタイム計算結果テーブル (cycle_time_results)
CREATE TABLE IF NOT EXISTS `cycle_time_results` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `quote_id` BIGINT UNSIGNED NOT NULL,
  `cutting_time_sec` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `non_cutting_time_sec` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `total_cycle_time_sec` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `quantity` INT UNSIGNED NOT NULL DEFAULT 1,
  `total_lot_time_sec` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `calculation_version` VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_ctr_quote_id` (`quote_id`),
  CONSTRAINT `fk_ctr_quote_id`
    FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. 実績サイクルタイムテーブル (actual_cycle_times)
CREATE TABLE IF NOT EXISTS `actual_cycle_times` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `quote_id` BIGINT UNSIGNED NOT NULL,
  `cycle_time_result_id` BIGINT UNSIGNED NULL,
  `actual_cycle_time_sec` DECIMAL(14,3) NOT NULL,
  `source` VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_act_quote_id` (`quote_id`),
  CONSTRAINT `fk_act_quote_id`
    FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_act_cycle_time_result_id`
    FOREIGN KEY (`cycle_time_result_id`) REFERENCES `cycle_time_results` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. アプリ共通設定テーブル (app_settings)
-- 警告: OPENAI_API_KEYやDB_PASSWORD等の秘密情報は本テーブルに保存してはいけません。
CREATE TABLE IF NOT EXISTS `app_settings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(191) NOT NULL,
  `setting_value` TEXT NOT NULL,
  `description` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_app_settings_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
