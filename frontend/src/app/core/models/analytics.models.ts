export interface PaymentVolumeMetric {
  currency: string;
  total_volume: number;
}

export interface ProviderLatencyMetric {
  provider: string;
  average_latency_ms: number;
}

export interface PaymentStatusMetric {
  status: string;
  count: number;
}
