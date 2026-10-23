import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/mongo", () => ({ getDb: async () => null }));

describe("getRateTable", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
    vi.resetModules();
  });

  it("calls ExchangeRate-API v6, caches for an hour, then serves a stale table if the API fails", async () => {
    vi.stubEnv("CURRENCY_API_KEY", "test-key");
    vi.stubEnv("CURRENCY_API_BASE_URL", "https://v6.exchangerate-api.com/v6");
    let now = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: "success", conversion_rates: { USD: 1, EUR: 0.9, JPY: 150 } }),
      })
      .mockRejectedValueOnce(new Error("network"));
    vi.stubGlobal("fetch", fetchMock);

    const { getRateTable } = await import("@/lib/rates");
    const fresh = await getRateTable("USD");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://v6.exchangerate-api.com/v6/test-key/latest/USD");
    expect(fresh?.stale).toBe(false);
    expect(fresh?.rates.EUR).toBe(0.9);

    const cached = await getRateTable("USD");
    expect(cached?.stale).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    now += 2 * 60 * 60 * 1000;
    const stale = await getRateTable("USD");
    expect(stale?.stale).toBe(true);
    expect(stale?.rates.JPY).toBe(150);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
