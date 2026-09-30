-- ==============================================================================
-- Migration: 007_phase14_production_actual_schema.sql
-- Target Database: MySQL 5.6
-- Engine: InnoDB
-- Charset: utf8mb4
-- Description: PHASE14 生産実績DB連携・補正学習データ蓄積基盤
-- ==============================================================================

-- 1. 生産実績レコードテーブル (production_actual_records)
-- sadoa DB (d_nkoutei, hdata, tokui, d_nkakou) から同期・蓄積する加工実績
CREATE TABLE IF NOT EXISTS `production_actual_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `source_recno` BIGINT NOT NULL COMMENT 'sadoa d_nkoutei.recno 主キー',
  `buban` VARCHAR(100) NULL COMMENT '図番',
  `hinmei` VARCHAR(255) NULL COMMENT '品名 (hdata.hd_hinmei)',
  `customer` VARCHAR(255) NULL COMMENT '客先名 (tokui.to_ryaku)',
  `machine_name` VARCHAR(100) NULL COMMENT '加工機名 (d_nkoutei.kimei)',
  `process_name` VARCHAR(100) NULL COMMENT '工程名 (d_nkoutei.komei)',
  `operator_name` VARCHAR(100) NULL COMMENT '加工担当者 (d_nkoutei.ins_tamei)',
  `material_name` VARCHAR(100) NULL COMMENT '材料名 (d_nkoutei.zai_mei)',
  `material_diameter` DECIMAL(10,3) NULL COMMENT '材料径 (d_nkoutei.zai_kei)',
  `material_tolerance` VARCHAR(50) NULL COMMENT '材料公差 (d_nkoutei.zai_kosa)',
  `start_datetime` DATETIME NULL COMMENT '加工開始日時 (first_hiduke)',
  `end_datetime` DATETIME NULL COMMENT '加工終了日時 (last_hiduke)',
  `cycle_time_sec` DECIMAL(10,3) NULL COMMENT '1個加工時間 秒 (cycle_time)',
  `quantity` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '加工数量 (d_nkakou.kakosu)',
  `total_time_sec` DECIMAL(12,3) NOT NULL DEFAULT 0.000 COMMENT '総加工時間 秒 (cycle_time_sec * quantity)',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_par_source_recno` (`source_recno`),
  INDEX `idx_par_buban` (`buban`),
  INDEX `idx_par_machine` (`machine_name`),
  INDEX `idx_par_material` (`material_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. 図番・案件紐付けマッピングテーブル (drawing_number_mapping)
CREATE TABLE IF NOT EXISTS `drawing_number_mapping` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `buban` VARCHAR(100) NOT NULL COMMENT '図番',
  `quote_id` BIGINT UNSIGNED NOT NULL COMMENT '案件ID',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_dnm_buban` (`buban`),
  INDEX `idx_dnm_quote_id` (`quote_id`),
  UNIQUE KEY `uk_dnm_buban_quote` (`buban`, `quote_id`),
  CONSTRAINT `fk_dnm_quote_id`
    FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
