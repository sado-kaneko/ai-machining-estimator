-- PHASE19: 正面加工・背面加工、同時加工モード、材質別切削条件拡張スキーマ
-- MySQL 5.6 互換

-- 1. lathe_process_master への machining_side カラム追加
ALTER TABLE `lathe_process_master`
  ADD COLUMN `machining_side` VARCHAR(20) NOT NULL DEFAULT 'FRONT' AFTER `process_category`;

-- 2. automatic_lathe_operations への machining_side カラム追加
ALTER TABLE `automatic_lathe_operations`
  ADD COLUMN `machining_side` VARCHAR(20) NOT NULL DEFAULT 'FRONT' AFTER `process_id`;

-- 3. operations への machining_side カラム追加
ALTER TABLE `operations`
  ADD COLUMN `machining_side` VARCHAR(20) NOT NULL DEFAULT 'FRONT' AFTER `operation_type`;

-- 4. quote_machine_selection への machining_mode カラム追加
ALTER TABLE `quote_machine_selection`
  ADD COLUMN `machining_mode` VARCHAR(30) NOT NULL DEFAULT 'SIMULTANEOUS' AFTER `selected`;
