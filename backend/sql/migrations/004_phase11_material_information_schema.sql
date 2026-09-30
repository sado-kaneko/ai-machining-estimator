-- PHASE11: 材料・素材情報精度向上機能 スキーマ追加
-- MySQL 5.6 互換

CREATE TABLE IF NOT EXISTS `material_information` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `quote_id` BIGINT UNSIGNED NOT NULL,
  `material_name` VARCHAR(100) NULL,
  `material_standard` VARCHAR(100) NULL,
  `shape_type` VARCHAR(50) NOT NULL DEFAULT 'ROUND_BAR',
  `diameter` DECIMAL(10,3) NULL,
  `width` DECIMAL(10,3) NULL,
  `height` DECIMAL(10,3) NULL,
  `length` DECIMAL(10,3) NULL,
  `weight` DECIMAL(10,3) NULL,
  `source` VARCHAR(50) NOT NULL DEFAULT 'AI',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_material_info_quote_id` (`quote_id`),
  CONSTRAINT `fk_material_info_quote_id`
    FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
