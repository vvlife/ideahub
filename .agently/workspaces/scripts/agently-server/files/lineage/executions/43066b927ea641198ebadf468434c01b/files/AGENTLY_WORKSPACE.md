# Agently Workspace Files

This directory is the editable file working tree for the current Agently scope.

- Workspace root: /Users/vivy/ideahub/.agently/workspaces/scripts/agently-server
- Files root: /Users/vivy/ideahub/.agently/workspaces/scripts/agently-server/files/lineage/executions/43066b927ea641198ebadf468434c01b/files
- Scope lineage: executions/43066b927ea641198ebadf468434c01b

Scope fields:
- execution_id: 43066b927ea641198ebadf468434c01b
- flow_name: daily-news-collector-v4
- script_scope: agently-server

Standard file areas:
- artifacts/: Generated supporting artifacts, structured outputs, evidence bundles, and non-primary deliverables.
- downloads/: Remote files materialized by Browse, Actions, or external providers before read_file/export_file handling.
- reports/: User-facing readable deliverables, including long, sectioned, or file-backed deliverables.

Use this directory for task deliverables, downloaded source files, and files shared with Actions or external coding agents.
Use Workspace.open_scratch(...) or Workspace.scratch_root() for temporary scratch work; do not invent a scratch/ folder under this files root.
Do not assume sibling lineage directories are in scope. Do not edit workspace.db or content/ directly.
