import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import axios from "axios";
import { TicketsPage } from "./TicketsPage";
import { renderPage } from "../test/render-utils";

vi.mock("axios");
vi.mock("../components/NavBar", () => ({ NavBar: () => <nav data-testid="navbar" /> }));

const TICKETS = [
  {
    id: 1,
    subject: "Login page is broken",
    fromEmail: "customer@example.com",
    fromName: "John Doe",
    category: "technical_question",
    status: "open",
    source: "email",
    createdAt: "2024-03-01T00:00:00.000Z",
    assignee: null,
  },
  {
    id: 2,
    subject: "Request a refund",
    fromEmail: "jane@example.com",
    fromName: "Jane Smith",
    category: "refund_request",
    status: "resolved",
    source: "manual",
    createdAt: "2024-04-10T00:00:00.000Z",
    assignee: { id: "a1", name: "Agent One" },
  },
];

beforeEach(() => {
  vi.resetAllMocks();
});

describe("TicketsPage — skeleton", () => {
  it("shows skeleton rows while the query is pending", () => {
    vi.mocked(axios.get).mockReturnValue(new Promise(() => {}));
    renderPage(<TicketsPage />);
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(60); // 10 rows × 6 cells
  });

  it("renders the table header columns while loading", () => {
    vi.mocked(axios.get).mockReturnValue(new Promise(() => {}));
    renderPage(<TicketsPage />);
    expect(screen.getByText("Subject")).toBeInTheDocument();
    expect(screen.getByText("From")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
  });
});

describe("TicketsPage — loaded", () => {
  beforeEach(() => {
    vi.mocked(axios.get).mockResolvedValue({ data: { data: TICKETS, total: 2 } });
  });

  it("renders a row for each ticket subject", async () => {
    renderPage(<TicketsPage />);
    await waitFor(() =>
      expect(screen.getByText("Login page is broken")).toBeInTheDocument()
    );
    expect(screen.getByText("Request a refund")).toBeInTheDocument();
  });

  it("displays each ticket sender's name", async () => {
    renderPage(<TicketsPage />);
    await waitFor(() => expect(screen.getByText("John Doe")).toBeInTheDocument());
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("displays status badges", async () => {
    renderPage(<TicketsPage />);
    await waitFor(() => expect(screen.getByText("open")).toBeInTheDocument());
    expect(screen.getByText("resolved")).toBeInTheDocument();
  });

  it("shows the correct pagination range", async () => {
    renderPage(<TicketsPage />);
    await waitFor(() =>
      expect(screen.getByText("Showing 1–2 of 2")).toBeInTheDocument()
    );
  });

  it("calls GET /api/tickets with credentials", async () => {
    renderPage(<TicketsPage />);
    await waitFor(() =>
      expect(screen.getByText("Login page is broken")).toBeInTheDocument()
    );
    expect(axios.get).toHaveBeenCalledWith(
      "/api/tickets",
      expect.objectContaining({ withCredentials: true })
    );
  });

  it("does not show the error message on success", async () => {
    renderPage(<TicketsPage />);
    await waitFor(() =>
      expect(screen.getByText("Login page is broken")).toBeInTheDocument()
    );
    expect(screen.queryByText("Failed to load tickets.")).not.toBeInTheDocument();
  });
});

describe("TicketsPage — empty", () => {
  it("shows 'No tickets yet.' when there are no tickets", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { data: [], total: 0 } });
    renderPage(<TicketsPage />);
    await waitFor(() =>
      expect(screen.getByText("No tickets yet.")).toBeInTheDocument()
    );
  });

  it("shows 'No results' in the pagination bar when total is 0", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { data: [], total: 0 } });
    renderPage(<TicketsPage />);
    await waitFor(() =>
      expect(screen.getByText("No results")).toBeInTheDocument()
    );
  });
});

describe("TicketsPage — error", () => {
  it("shows an error message when the request fails", async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error("Network Error"));
    renderPage(<TicketsPage />);
    await waitFor(() =>
      expect(screen.getByText("Failed to load tickets.")).toBeInTheDocument()
    );
  });

  it("does not render any ticket rows on error", async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error("Network Error"));
    renderPage(<TicketsPage />);
    await waitFor(() =>
      expect(screen.getByText("Failed to load tickets.")).toBeInTheDocument()
    );
    expect(screen.queryByText("Login page is broken")).not.toBeInTheDocument();
  });
});
