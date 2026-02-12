import type { DiagnosticEvent, IDiagnostics } from '../ports/diagnostics.js';

/** Zero-cost no-op implementation — no allocations, no side effects. */
export class NoopDiagnostics implements IDiagnostics {
	emit(): void {}
	isEnabled(): boolean {
		return false;
	}
	query(): readonly DiagnosticEvent[] {
		return [];
	}
}
