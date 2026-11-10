.DEFAULT_GOAL := help
.PHONY: help setup dev test lint typecheck build format size security security-osv security-gitleaks api-client e2e

PNPM ?= pnpm

define pending
	@echo "ERROR: 'make $(1)' todavía no está implementado: lo implementa el issue $(2) ($(3))." >&2
	@exit 1
endef

help:
	@echo "Targets: setup dev test lint typecheck build format size security api-client e2e"

setup:
	$(PNPM) install

dev:
	$(PNPM) -r --parallel --filter "./apps/*" dev

test:
	$(PNPM) test

lint:
	$(PNPM) lint
	$(PNPM) format:check

typecheck:
	$(PNPM) typecheck

format:
	$(PNPM) format

build:
	$(PNPM) -r --filter "./apps/*" build

size: build
	$(PNPM) size

security: security-osv security-gitleaks

security-osv:
	@command -v osv-scanner >/dev/null || { echo "Falta osv-scanner: brew install osv-scanner" >&2; exit 1; }
	osv-scanner scan source --lockfile pnpm-lock.yaml

security-gitleaks:
	@command -v gitleaks >/dev/null || { echo "Falta gitleaks: brew install gitleaks" >&2; exit 1; }
	gitleaks git --no-banner --redact

api-client:
	$(call pending,api-client,#12,FR-05a)

e2e:
	$(call pending,e2e,#23,FR-10a)
