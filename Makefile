.DEFAULT_GOAL := help
.PHONY: help setup dev test lint typecheck build format size security api-client e2e

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
	@echo "No hay apps todavía: 'make dev' levantará web, guard y pass cuando FR-01b (#5) las cree." >&2
	@exit 1

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
	@echo "No hay apps que construir todavía: 'make build' las construirá cuando FR-01b (#5) las cree." >&2
	@exit 1

size:
	$(call pending,size,#7,FR-02b)

security:
	$(call pending,security,#6,FR-02a)

api-client:
	$(call pending,api-client,#12,FR-05a)

e2e:
	$(call pending,e2e,#23,FR-10a)
