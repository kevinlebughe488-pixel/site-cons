import "server-only";
import type {
  InitiationResult,
  KnownTransaction,
  PaymentGateway,
  RemoteTransaction,
} from "@/lib/payments/types";

// Mode simulation : aucun argent ne circule. Sert à tester l'application sans
// compte pawaPay. Le paiement est « confirmé » quelques secondes après la demande,
// sauf pour un numéro qui se termine par 0000 (solde insuffisant simulé).

const CONFIRMATION_DELAY_MS = 5_000;

export class SimulationGateway implements PaymentGateway {
  readonly name = "simulation" as const;

  async initiateDeposit(): Promise<InitiationResult> {
    return { status: "ACCEPTED" };
  }

  async getDeposit(_id: string, known: KnownTransaction): Promise<RemoteTransaction> {
    return outcome(known);
  }

  async initiateRefund(): Promise<InitiationResult> {
    return { status: "ACCEPTED" };
  }

  async getRefund(_id: string, known: KnownTransaction): Promise<RemoteTransaction> {
    if (Date.now() - new Date(known.createdAt).getTime() < CONFIRMATION_DELAY_MS) {
      return { found: true, status: "PROCESSING" };
    }
    return { found: true, status: "COMPLETED", providerTransactionId: `SIM-R-${known.createdAt.slice(11, 19).replace(/:/g, "")}` };
  }
}

function outcome(known: KnownTransaction): RemoteTransaction {
  if (Date.now() - new Date(known.createdAt).getTime() < CONFIRMATION_DELAY_MS) {
    return { found: true, status: "PROCESSING" };
  }
  if (known.phoneNumber.endsWith("0000")) {
    return {
      found: true,
      status: "FAILED",
      failureCode: "PAYER_LIMIT_REACHED",
      failureMessage: "Solde insuffisant (simulation)",
    };
  }
  return { found: true, status: "COMPLETED", providerTransactionId: `SIM-${known.createdAt.slice(11, 19).replace(/:/g, "")}` };
}
