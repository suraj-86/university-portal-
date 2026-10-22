CREATE TABLE IF NOT EXISTS app_settings (
    setting_key   VARCHAR(60) NOT NULL PRIMARY KEY,
    setting_value VARCHAR(255) NOT NULL,
    updated_by    INT NULL,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Students and parents can record a fee payment themselves only while this is 'on'. Admins switch it in Settings.
INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES ('online_payments', 'off');
