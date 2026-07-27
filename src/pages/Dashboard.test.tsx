import { afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Dashboard", () => {
  it("bos durumda kurulum yonlendirmesini gosterir", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("skip network")));

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Tum cihazlarda relogin")).toBeInTheDocument();
    expect(screen.getByText(/Henuz bagli cihaz yok/i)).toBeInTheDocument();
  });
});
