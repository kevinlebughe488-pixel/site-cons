export type InitiationStatus = "ACCEPTED" | "REJECTED" | "DUPLICATE_IGNORED";

export type InitiationResult = {
  status: InitiationStatus;
  failureCode?: string;
  failureMessage?: string;
};

/** Statuts renvoyés par pawaPay pour un dépôt ou un remboursement. */
export type RemoteStatus = "ACCEPTED" | "ENQUEUED" | "PROCESSING" | "IN_RECONCILIATION" | "COMPLETED" | "FAILED";

export type RemoteTransaction =
  | { found: false }
  | {
      found: true;
      status: RemoteStatus;
      providerTransactionId?: string;
      failureCode?: string;
      failureMessage?: string;
    };

export type DepositRequest = {
  depositId: string;
  amount: number;
  currency: string;
  phoneNumber: string;
  provider: string;
  /** Texte affiché au payeur sur son téléphone (4 à 22 caractères). */
  customerMessage: string;
  clientReferenceId: string;
  metadata: Record<string, string>;
};

export type RefundRequest = {
  refundId: string;
  depositId: string;
  amount: number;
  currency: string;
  clientReferenceId: string;
};

/** Ce que l'on sait déjà de la transaction en base (utile au mode simulation). */
export type KnownTransaction = {
  createdAt: string;
  phoneNumber: string;
};

export interface PaymentGateway {
  readonly name: "pawapay" | "simulation";
  initiateDeposit(request: DepositRequest): Promise<InitiationResult>;
  getDeposit(depositId: string, known: KnownTransaction): Promise<RemoteTransaction>;
  initiateRefund(request: RefundRequest): Promise<InitiationResult>;
  getRefund(refundId: string, known: KnownTransaction): Promise<RemoteTransaction>;
}

export class PaymentGatewayError extends Error {
  constructor(
    message: string,
    readonly httpStatus?: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "PaymentGatewayError";
  }
}
