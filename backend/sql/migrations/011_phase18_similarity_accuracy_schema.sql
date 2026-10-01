-- ==============================================================================
-- Migration: 011_phase18_similarity_accuracy_schema.sql
-- Target Database: MySQL 5.6
-- Engine: InnoDB
-- Charset: utf8mb4
-- Description: PHASE18 類似加工検索・実績フィードバック・精度分析・補正改善基盤
-- ==============================================================================

-- 1. 類似検索結果テーブル (similarity_results) - 監査・再現用
CREATE TABLE IF NOT EXISTS `similarity_results` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `quote_id` BIGINT UNSIGNED NOT NULL COMMENT '検索元案件ID',
  `target_quote_id` BIGINT UNSIGNED NOT NULL COMMENT '類似先案件ID',
  `similarity_score` DECIMAL(5,2) NOT NULL COMMENT '類似度スコア (0-100点)',
  `similarity_level` VARCHAR(20) NOT NULL COMMENT 'HIGH, MEDIUM, REFERENCE, LOW',
  `score_breakdown` LONGTEXT NULL COMMENT 'スコア内訳JSON (MySQL 5.6互換 LONGTEXT)',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '検索日時',
  PRIMARY KEY (`id`),
  INDEX `idx_sr_quote_id` (`quote_id`),
  INDEX `idx_sr_target_quote_id` (`target_quote_id`),
  CONSTRAINT `fk_sr_quote_id`
    FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sr_target_quote_id`
    FOREIGN KEY (`target_quote_id`) REFERENCES `quotes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. 予測精度評価テーブル (prediction_accuracy) - 案件ごとの予測CTと実績CTの誤差分析
CREATE TABLE IF NOT EXISTS `prediction_accuracy` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `quote_id` BIGINT UNSIGNED NOT NULL COMMENT '案件ID',
  `cycle_time_result_id` BIGINT UNSIGNED NULL COMMENT 'CT計算結果ID',
  `prediction_ct` DECIMAL(10,3) NOT NULL COMMENT '最終予測CT (秒)',
  `theoretical_ct` DECIMAL(10,3) NULL COMMENT '理論CT (秒)',
  `actual_ct` DECIMAL(10,3) NOT NULL COMMENT '実績CT (秒)',
  `error_seconds` DECIMAL(10,3) NOT NULL COMMENT '誤差秒 (actual_ct - prediction_ct)',
  `error_rate` DECIMAL(8,4) NOT NULL COMMENT '符号付き誤差率 ((actual_ct - prediction_ct) / prediction_ct)',
  `absolute_error_rate` DECIMAL(8,4) NOT NULL COMMENT '絶対誤差率 (ABS(actual_ct - prediction_ct) / actual_ct)',
  `machine_name` VARCHAR(100) NULL COMMENT '加工設備名',
  `material_name` VARCHAR(100) NULL COMMENT '材料名',
  `evaluated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '評価日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pa_quote_id` (`quote_id`),
  INDEX `idx_pa_machine` (`machine_name`),
  INDEX `idx_pa_material` (`material_name`),
  INDEX `idx_pa_evaluated_at` (`evaluated_at`),
  CONSTRAINT `fk_pa_quote_id`
    FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
