export class ExternalApiError extends Error {
  status: 429 | 502;

  constructor(message: string, status: 429 | 502) {
    super(message);
    this.name = 'ExternalApiError';
    this.status = status;
  }
}

export function statusFromUpstreamResponse(response: Response): 429 | 502 {
  return response.status === 429 ? 429 : 502;
}
