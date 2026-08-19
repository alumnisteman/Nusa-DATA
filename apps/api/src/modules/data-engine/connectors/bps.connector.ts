export interface BPSConfig {
  apiBaseUrl: string;
  apiKey: string;
}

export class BPSConnector {
  constructor(private readonly config: BPSConfig) {}

  async fetchJson(path: string): Promise<unknown> {
    const url = new URL(path.replace(/^\//, ""), this.config.apiBaseUrl);
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`BPS API error: ${response.status}`);
    }

    return response.json();
  }
}
