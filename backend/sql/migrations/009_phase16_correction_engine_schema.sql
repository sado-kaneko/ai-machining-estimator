-- ==============================================================================
-- Migration: 009_phase16_correction_engine_schema.sql
-- Target Database: MySQL 5.6
-- Engine: InnoDB
-- Charset: utf8mb4
-- Description: PHASE16 補正Engine組込み・実績フィードバック型サイクルタイム予測
-- ==============================================================================

-- 1. cycle_time_results テーブル拡張 (補正前・補正後・倍率・条件・適用フラグ)
ALTER TABLE `cycle_time_results`
  ADD COLUMN `theoretical_cycle_time` DECIMAL(14,3) NULL COMMENT '補正前理論CT(秒)' AFTER `total_cycle_time_sec`,
  ADD COLUMN `correction_factor` DECIMAL(6,4) NOT NULL DEFAULT 1.0000 COMMENT '適用補正倍率' AFTER `theoretical_cycle_time`,
  ADD COLUMN `corrected_cycle_time` DECIMAL(14,3) NULL COMMENT '補正後CT(秒)' AFTER `correction_factor`,
  ADD COLUMN `correction_source` VARCHAR(100) NULL COMMENT '補正適用条件(例: L20×SUS304)' AFTER `corrected_cycle_time`,
  ADD COLUMN `correction_applied` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '補正適用有無(1:適用, 0:未適用)' AFTER `correction_source`;

-- 2. 補正適用履歴テーブル (correction_history)
CREATE TABLE IF NOT EXISTS `correction_history` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `quote_id` BIGINT UNSIGNED NOT NULL COMMENT '案件ID',
  `before_time` DECIMAL(14,3) NOT NULL COMMENT '補正前CT(秒)',
  `factor` DECIMAL(6,4) NOT NULL COMMENT '適用倍率',
  `after_time` DECIMAL(14,3) NOT NULL COMMENT '補正後CT(秒)',
  `source` VARCHAR(100) NOT NULL COMMENT '補正条件・元情報',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_ch_quote_id` (`quote_id`),
  CONSTRAINT `fk_ch_quote_id`
    FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
