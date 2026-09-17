#!/bin/bash
set -euo pipefail
exec node --import tsx scripts/database.ts backup "$@"
