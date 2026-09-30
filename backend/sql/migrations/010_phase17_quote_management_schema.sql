-- ==============================================================================
-- Migration: 010_phase17_quote_management_schema.sql
-- Target Database: MySQL 5.6
-- Engine: InnoDB
-- Charset: utf8mb4
-- Description: PHASE17 見積業務システム化（案件管理・履歴管理・見積確定保存・根拠管理）
-- ==============================================================================

-- 1. quotes テーブル拡張 (created_by, material カラム追加)
ALTER TABLE `quotes`
  ADD COLUMN `material` VARCHAR(100) NULL AFTER `quantity`,
  ADD COLUMN `created_by` VARCHAR(100) NULL DEFAULT '見積担当者' AFTER `notes`;

-- 2. 見積確定結果テーブル (quote_results)
CREATE TABLE IF NOT EXISTS `quote_results` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `quote_id` BIGINT UNSIGNED NOT NULL,
  `cycle_time` DECIMAL(10,3) NOT NULL COMMENT '理論CT (秒)',
  `machine` VARCHAR(100) NOT NULL COMMENT '使用設備名',
  `correction_factor` DECIMAL(6,4) NOT NULL DEFAULT 1.0000 COMMENT '適用補正倍率',
  `final_time` DECIMAL(10,3) NOT NULL COMMENT '最終予測CT (秒)',
  `quantity` INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '数量',
  `total_lot_time` DECIMAL(12,3) NOT NULL COMMENT 'ロット総加工時間 (秒)',
  `cutting_time` DECIMAL(10,3) NULL COMMENT '純切削時間 (秒)',
  `non_cutting_time` DECIMAL(10,3) NULL COMMENT '非切削時間 (秒)',
  `correction_source` VARCHAR(191) NULL COMMENT '補正条件・根拠',
  `confidence_level` VARCHAR(50) NULL COMMENT '信頼度',
  `notes` TEXT NULL COMMENT '見積特記事項・備考',
  `completed_by` VARCHAR(100) NOT NULL DEFAULT '見積担当者' COMMENT '確定処理者',
  `completed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '確定日時',
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_qr_quote_id` (`quote_id`),
  CONSTRAINT `fk_qr_quote_id`
    FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. 見積変更・操作履歴テーブル (quote_history)
CREATE TABLE IF NOT EXISTS `quote_history` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `quote_id` BIGINT UNSIGNED NOT NULL,
  `action` VARCHAR(100) NOT NULL COMMENT '操作内容 (STATUS_CHANGE, CALCULATION, COMPLETED, EDIT 等)',
  `before_data` LONGTEXT NULL COMMENT '変更前JSON (MySQL 5.6互換 LONGTEXT)',
  `after_data` LONGTEXT NULL COMMENT '変更後JSON (MySQL 5.6互換 LONGTEXT)',
  `created_by` VARCHAR(100) NULL DEFAULT 'システム' COMMENT '実行者',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_qh_quote_id` (`quote_id`),
  CONSTRAINT `fk_qh_quote_id`
    FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
