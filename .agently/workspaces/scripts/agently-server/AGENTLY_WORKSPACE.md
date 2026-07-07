# Agently Workspace

This directory is managed by Agently.

Directory roles:

- workspace.db: local metadata, search index, links, checkpoints, and runtime events.
- workspace.meta.json: machine-readable Workspace metadata.
- content/: managed record payloads owned by Workspace.
- files/: editable file working trees scoped by lineage.

Standard file areas inside each scoped files root:
- artifacts/: Generated supporting artifacts, structured outputs, evidence bundles, and non-primary deliverables.
- downloads/: Remote files materialized by Browse, Actions, or external providers before read_file/export_file handling.
- reports/: User-facing readable deliverables, including long, sectioned, or file-backed deliverables.

Use files/lineage/.../files for task artifacts, downloads, and files shared with Actions or external coding agents.
Use scratch/lineage/.../scratch only through Workspace scratch APIs; do not mix scratch files into files/.
Do not edit workspace.db or content/ directly unless you are debugging Workspace internals.
