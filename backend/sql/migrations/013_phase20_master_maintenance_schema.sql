-- PHASE20: 加工機特注オプション拡張 ＆ 工具マスタ スキーマ追加
-- MySQL 5.6 互換 (JSON型不使用、LONGTEXT/TEXT使用)

-- 1. machine_master テーブル拡張 (特注オプション・最大把握径・サブ主軸仕様)
ALTER TABLE `machine_master`
  ADD COLUMN `max_bar_diameter` DECIMAL(10,2) NOT NULL DEFAULT 20.00 AFTER `max_rpm`,
  ADD COLUMN `has_sub_spindle` TINYINT(1) NOT NULL DEFAULT 1 AFTER `max_machining_length`,
  ADD COLUMN `max_tools` INT UNSIGNED NOT NULL DEFAULT 12 AFTER `has_sub_spindle`,
  ADD COLUMN `special_options` TEXT NULL AFTER `max_tools`,
  ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `special_options`;

-- 2. 工具マスタ (tool_master) 新規作成
CREATE TABLE IF NOT EXISTS `tool_master` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tool_code` VARCHAR(50) NOT NULL,
  `tool_name` VARCHAR(100) NOT NULL,
  `tool_category` VARCHAR(50) NOT NULL DEFAULT 'OD_ROUGH',
  `material_compatibility` VARCHAR(100) NULL,
  `blade_width` DECIMAL(8,3) NULL,
  `nose_radius` DECIMAL(8,3) NULL,
  `max_depth` DECIMAL(8,2) NULL,
  `default_feed` DECIMAL(8,4) NULL,
  `default_vc` DECIMAL(8,2) NULL,
  `notes` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tool_code` (`tool_code`),
  INDEX `idx_tool_category` (`tool_category`),
  INDEX `idx_tool_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. 標準工具サンプルデータの投入 (未登録時)
INSERT INTO `tool_master` (`tool_code`, `tool_name`, `tool_category`, `material_compatibility`, `blade_width`, `nose_radius`, `max_depth`, `default_feed`, `default_vc`, `notes`)
VALUES
('T-OD-01', '外径荒加工バイト (CNMG)', 'OD_ROUGH', '鋼・ステンレス・快削鋼', NULL, 0.400, NULL, 0.0800, 120.00, '標準外径荒削り用'),
('T-OD-02', '外径仕上げバイト (VNMG)', 'OD_FINISH', '一般鋼・快削鋼', NULL, 0.200, NULL, 0.0400, 150.00, '高面粗度外径仕上げ用'),
('T-DRILL-01', 'ハイス・超硬ドリル (φ3〜φ10)', 'DRILL', '一般金属', NULL, NULL, 30.00, 0.0500, 45.00, '中心下穴あけ用'),
('T-BORE-01', '小径ボーリングバー (内径)', 'BORE', '一般金属', NULL, 0.200, 25.00, 0.0300, 80.00, '内径寸法高精度仕上げ用'),
('T-GROOVE-01', '外径溝入れバイト (W=2.0)', 'GROOVE', '一般金属', 2.000, 0.100, 5.00, 0.0300, 60.00, 'Oリング溝・止め輪溝用'),
('T-THREAD-01', '外径ねじ切りバイト (60°)', 'THREAD', '一般金属', NULL, NULL, NULL, 0.0000, 80.00, 'メートル並目・細目ねじ用'),
('T-CUTOFF-01', '突切りバイト (W=1.5)', 'CUTOFF', '一般金属', 1.500, 0.050, 15.00, 0.0300, 70.00, '完成品切り落とし・第2主軸受渡用'),
('T-BACK-01', '背面端面・面取りバイト', 'BACK_FINISH', '一般金属', NULL, 0.200, NULL, 0.0400, 100.00, '第2主軸側裏面仕上げ用')
ON DUPLICATE KEY UPDATE `tool_name` = VALUES(`tool_name`);
