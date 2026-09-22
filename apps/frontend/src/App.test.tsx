import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";

vi.mock("./lib/authContext", () => ({
  useAuth: () => ({
    user: { id: "1", email: "demo@stockpilot.io" },
    token: "fake-token",
    storeName: "Central Logistics",
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: any) => <div data-testid="r3f-canvas">{children}</div>,
  useFrame: vi.fn(),
  useThree: () => ({
    camera: { position: { set: vi.fn(), x: 0, y: 0, z: 0 }, lookAt: vi.fn() },
    scene: {},
    gl: { domElement: document.createElement("canvas") },
  }),
}));

vi.mock("@react-three/drei", () => ({
  Float: ({ children }: any) => <div>{children}</div>,
  MeshDistortMaterial: () => null,
  MeshTransmissionMaterial: () => null,
  Stars: () => null,
  OrbitControls: () => null,
}));

vi.mock("./hooks/useDashboard", () => ({
  useDashboard: () => ({
    data: {
      totalRevenue: 500000,
      unitsSold: 120,
      inventoryValue: 250000,
      turnoverRatio: 4.2,
      fastMovers: [],
      slowMovers: [],
      categoryBreakdown: [],
      dailySales: [],
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("./hooks/useSettings", () => ({
  useStoreSettings: () => ({
    data: { name: "Central Logistics", currency: "INR" },
    isLoading: false,
  }),
}));

describe("App routing", () => {
  it("renders landing page on root", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(
      await screen.findByText(/Predictive Demand Engine/i, {}, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it("renders dashboard on /dashboard", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(
      await screen.findByRole("heading", { name: /Dashboard/i }, { timeout: 20000 }),
    ).toBeInTheDocument();
  }, 30000);

  it("shows 404 for unknown routes", () => {
    render(
      <MemoryRouter initialEntries={["/does-not-exist"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText(/404/i)).toBeInTheDocument();
  });
});