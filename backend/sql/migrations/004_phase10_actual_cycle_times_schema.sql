-- PHASE10: 実績フィードバック機能 スキーマ拡張
-- MySQL 5.6 互換

ALTER TABLE `actual_cycle_times`
  ADD COLUMN `machine_id` BIGINT UNSIGNED NULL AFTER `quote_id`,
  ADD COLUMN `production_date` DATE NULL AFTER `machine_id`,
  ADD COLUMN `quantity` INT NOT NULL DEFAULT 1 AFTER `production_date`,
  ADD COLUMN `setup_time_sec` DECIMAL(14,3) NOT NULL DEFAULT 0.000 AFTER `actual_cycle_time_sec`,
  ADD COLUMN `operator_name` VARCHAR(100) NULL AFTER `setup_time_sec`,
  ADD COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'COMPLETED' AFTER `operator_name`,
  ADD INDEX `idx_act_machine_id` (`machine_id`),
  ADD CONSTRAINT `fk_act_machine_id`
    FOREIGN KEY (`machine_id`) REFERENCES `machine_master` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
