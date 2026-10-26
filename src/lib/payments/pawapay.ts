import "server-only";
import {
  PaymentGatewayError,
  type DepositRequest,
  type InitiationResult,
  type PaymentGateway,
  type RefundRequest,
  type RemoteStatus,
  type RemoteTransaction,
} from "@/lib/payments/types";

// Intégration de l'API pawaPay v2 (https://docs.pawapay.io/v2).
// - POST /v2/deposits        : demande de paiement envoyée au téléphone du supporter
// - GET  /v2/deposits/{id}   : état d'un dépôt
// - POST /v2/refunds         : remboursement d'un dépôt
// - GET  /v2/refunds/{id}    : état d'un remboursement
// - GET  /v2/active-conf     : opérateurs ouverts sur le compte

const BASE_URLS = {
  sandbox: "https://api.sandbox.pawapay.io",
  production: "https://api.pawapay.io",
} as const;

type PawapayFailure = { failureCode?: string; failureMessage?: string };
type PawapayInitiation = { status: InitiationResult["status"]; failureReason?: PawapayFailure };
type PawapaySearch = {
  status: "FOUND" | "NOT_FOUND";
  data?: { status: RemoteStatus; providerTransactionId?: string; failureReason?: PawapayFailure };
};

export type PawapayConfig = {
  apiToken: string;
  environment: "sandbox" | "production";
  /** Adresse de l'API à utiliser à la place de l'adresse officielle (tests). */
  baseUrl?: string;
};

export class PawapayGateway implements PaymentGateway {
  readonly name = "pawapay" as const;
  private readonly baseUrl: string;

  constructor(private readonly config: PawapayConfig) {
    this.baseUrl = config.baseUrl || BASE_URLS[config.environment];
  }

  private async request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.config.apiToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      });
    } catch (error) {
      throw new PaymentGatewayError(`pawaPay injoignable : ${(error as Error).message}`);
    }
    const text = await response.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    if (!response.ok) {
      throw new PaymentGatewayError(`pawaPay a répondu ${response.status}`, response.status, json);
    }
    return json as T;
  }

  async initiateDeposit(req: DepositRequest): Promise<InitiationResult> {
    const res = await this.request<PawapayInitiation>("POST", "/v2/deposits", {
      depositId: req.depositId,
      payer: { type: "MMO", accountDetails: { phoneNumber: req.phoneNumber, provider: req.provider } },
      amount: formatAmount(req.amount),
      currency: req.currency,
      clientReferenceId: req.clientReferenceId,
      customerMessage: req.customerMessage,
      metadata: Object.entries(req.metadata).map(([key, value]) => ({ [key]: value })),
    });
    return toInitiation(res);
  }

  async getDeposit(depositId: string): Promise<RemoteTransaction> {
    return toRemote(await this.request<PawapaySearch>("GET", `/v2/deposits/${encodeURIComponent(depositId)}`));
  }

  async initiateRefund(req: RefundRequest): Promise<InitiationResult> {
    const res = await this.request<PawapayInitiation>("POST", "/v2/refunds", {
      refundId: req.refundId,
      depositId: req.depositId,
      amount: formatAmount(req.amount),
      currency: req.currency,
      clientReferenceId: req.clientReferenceId,
    });
    return toInitiation(res);
  }

  async getRefund(refundId: string): Promise<RemoteTransaction> {
    return toRemote(await this.request<PawapaySearch>("GET", `/v2/refunds/${encodeURIComponent(refundId)}`));
  }

  /** Configuration active du compte pour la RDC (opérateurs et devises ouverts). */
  async activeConfiguration(): Promise<unknown> {
    return this.request("GET", "/v2/active-conf?country=COD&operationType=DEPOSIT");
  }
}

function formatAmount(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

function toInitiation(res: PawapayInitiation): InitiationResult {
  return {
    status: res.status,
    failureCode: res.failureReason?.failureCode,
    failureMessage: res.failureReason?.failureMessage,
  };
}

function toRemote(res: PawapaySearch): RemoteTransaction {
  if (res.status !== "FOUND" || !res.data) return { found: false };
  return {
    found: true,
    status: res.data.status,
    providerTransactionId: res.data.providerTransactionId,
    failureCode: res.data.failureReason?.failureCode,
    failureMessage: res.data.failureReason?.failureMessage,
  };
}
