
export interface ServiceDetails {
  eventName: string;
  date: string;
  location: string;
  startTime: string;
  endTime: string;
  securityOperators: number;
  fireOperators: number;
  hasSupervisor: boolean;
  isOutsideTrento: boolean;
  notes: string;
  uniformType: 'Security' | 'Elegante';
}

export interface ClientDetails {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  companyName: string;
  vatNumber: string;
  billingCode: string;
}

export enum PaymentOption {
  BANK_TRANSFER = 'Bonifico Bancario',
  CREDIT_CARD = 'Carta di Credito',
  END_OF_SERVICE = 'Pagamento Fine Servizio',
  MONTHLY_BILLING = 'Fatturazione Mensile'
}

export interface QuoteData {
  id: string;
  service: ServiceDetails;
  client: ClientDetails;
  payment: PaymentOption;
  calculations: {
    hours: number;
    securityRate: number;
    securitySingleTotal: number;
    securitySubtotal: number;
    fireRate: number;
    fireSingleTotal: number;
    fireSubtotal: number;
    supervisorFee: number;
    transportFee: number;
    totalExclVat: number;
    vatAmount: number;
    totalInclVat: number;
  };
}

export enum Step {
  SERVICE_DETAILS,
  CLIENT_DETAILS,
  PAYMENT_SUMMARY,
  FINAL_PREVIEW
}
