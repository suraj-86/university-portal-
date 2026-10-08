-- Phase 0: reusable audit trail. Run once on the production DB (Aiven).
CREATE TABLE IF NOT EXISTS audit_log (
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    actor_user_id INT NULL,
    actor_role    VARCHAR(20) NULL,
    action        VARCHAR(60) NOT NULL,
    entity        VARCHAR(60) NOT NULL,
    entity_id     VARCHAR(60) NULL,
    old_value     JSON NULL,
    new_value     JSON NULL,
    reason        VARCHAR(255) NULL,
    ip_address    VARCHAR(64) NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_entity (entity, entity_id),
    INDEX idx_audit_actor (actor_user_id),
    INDEX idx_audit_created (created_at)
);
