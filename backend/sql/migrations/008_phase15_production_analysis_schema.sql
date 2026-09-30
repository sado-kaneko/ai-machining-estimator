-- ==============================================================================
-- Migration: 008_phase15_production_analysis_schema.sql
-- Target Database: MySQL 5.6
-- Engine: InnoDB
-- Charset: utf8mb4
-- Description: PHASE15 生産実績分析・補正係数候補・信頼度評価基盤
-- ==============================================================================

-- 1. 生産実績分析結果テーブル (production_analysis_results)
CREATE TABLE IF NOT EXISTS `production_analysis_results` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `analysis_type` VARCHAR(50) NOT NULL COMMENT 'OVERALL, MACHINE, MATERIAL, DIAMETER, PROCESS',
  `target_key` VARCHAR(100) NOT NULL COMMENT '対象条件 (例: ALL, Cincom L20, SUS304, φ3-φ10 等)',
  `sample_count` INT NOT NULL DEFAULT 0 COMMENT '対象件数',
  `average_factor` DECIMAL(8,4) NOT NULL DEFAULT 1.0000 COMMENT '平均補正倍率',
  `median_factor` DECIMAL(8,4) NOT NULL DEFAULT 1.0000 COMMENT '中央値',
  `stddev_factor` DECIMAL(8,4) NULL COMMENT '標準偏差',
  `max_factor` DECIMAL(8,4) NULL COMMENT '最大倍率',
  `min_factor` DECIMAL(8,4) NULL COMMENT '最小倍率',
  `confidence_level` VARCHAR(20) NOT NULL DEFAULT 'LOW' COMMENT '信頼度 (HIGH, MEDIUM, LOW)',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_par_type_key` (`analysis_type`, `target_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. lathe_correction_factors テーブル拡張 (信頼度・承認管理)
ALTER TABLE `lathe_correction_factors`
  ADD COLUMN `confidence_level` VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' AFTER `sample_count`,
  ADD COLUMN `approved` TINYINT(1) NOT NULL DEFAULT 0 AFTER `confidence_level`,
  ADD COLUMN `approved_by` VARCHAR(100) NULL AFTER `approved`,
  ADD COLUMN `approved_at` DATETIME NULL AFTER `approved_by`;
