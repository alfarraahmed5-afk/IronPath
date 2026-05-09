-- Phase B v1 review fix: enforce append-only on super_admin_audit_log at the DB
-- layer (plan §8 / §12.4 #1). Migration 040 created the table + indexes but
-- left the app role with full UPDATE/DELETE.
--
-- We revoke UPDATE and DELETE from the roles the backend uses (service_role
-- for the privileged client; authenticated/anon for any future client-direct
-- access). INSERT and SELECT remain so logAudit can write and the console can
-- read history. The table is also a pure append store — no app code mutates
-- existing rows, so this should never trigger a regression.
--
-- Sequencing: 042 does not touch public.users or the auth hook, so it sits
-- safely after 034 per plan §12.1 #15. It only mutates super_admin_audit_log.

REVOKE UPDATE, DELETE ON super_admin_audit_log FROM PUBLIC;
REVOKE UPDATE, DELETE ON super_admin_audit_log FROM authenticated;
REVOKE UPDATE, DELETE ON super_admin_audit_log FROM anon;
REVOKE UPDATE, DELETE ON super_admin_audit_log FROM service_role;
