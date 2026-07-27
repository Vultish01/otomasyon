import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";

describe("Dashboard", () => {
  it("cihaz kartlarini ve toplu komut butonunu gosterir", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(screen.getByText("Tum cihazlarda relogin")).toBeInTheDocument();
    expect(screen.getByText("Borsa PC 01")).toBeInTheDocument();
    expect(screen.getByText("Borsa PC 02")).toBeInTheDocument();
    expect(screen.getByText("Borsa PC 03")).toBeInTheDocument();
  });
});
