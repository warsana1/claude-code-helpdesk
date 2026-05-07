import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { TicketDetailPage } from "./TicketDetailPage";

vi.mock("axios");
vi.mock("../components/NavBar", () => ({ NavBar: () => <nav data-testid="navbar" /> }));

function renderDetail() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/tickets/1"]}>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const TICKET = {
  id: 1,
  subject: "Can't log in",
  body: "I've been trying to log in for hours and nothing works.",
  fromEmail: "john@example.com",
  fromName: "John Doe",
  category: "general_question",
  status: "open",
  source: "email",
  emailMessageId: null as string | null,
  assigneeId: null as string | null,
  assignee: null as { id: string; name: string } | null,
  createdAt: "2024-03-01T10:00:00.000Z",
  updatedAt: "2024-03-01T12:00:00.000Z",
};

const AGENTS = [
  { id: "a1", name: "Agent Alice" },
  { id: "a2", name: "Agent Bob" },
];

function mockSuccess(ticket = TICKET, agents = AGENTS) {
  vi.mocked(axios.get).mockImplementation((url: string) => {
    if (url === "/api/tickets/1") return Promise.resolve({ data: ticket });
    if (url === "/api/users/agents") return Promise.resolve({ data: agents });
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

describe("TicketDetailPage — skeleton", () => {
  it("shows skeleton elements while the ticket is loading", () => {
    vi.mocked(axios.get).mockReturnValue(new Promise(() => {}));
    renderDetail();
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("does not show ticket content while loading", () => {
    vi.mocked(axios.get).mockReturnValue(new Promise(() => {}));
    renderDetail();
    expect(screen.queryByText("Can't log in")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

describe("TicketDetailPage — error", () => {
  it("shows an error message when the ticket request fails", async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error("Network Error"));
    renderDetail();
    await waitFor(() =>
      expect(screen.getByText("Failed to load ticket.")).toBeInTheDocument()
    );
  });

  it("does not render ticket content on error", async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error("Network Error"));
    renderDetail();
    await waitFor(() =>
      expect(screen.getByText("Failed to load ticket.")).toBeInTheDocument()
    );
    expect(screen.queryByText("Can't log in")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Loaded — ticket data
// ---------------------------------------------------------------------------

describe("TicketDetailPage — loaded", () => {
  beforeEach(() => mockSuccess());

  it("renders the ticket subject as the heading", async () => {
    renderDetail();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Can't log in" })).toBeInTheDocument()
    );
  });

  it("displays the ticket ID", async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByText("#1")).toBeInTheDocument());
  });

  it("displays the sender name", async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByText("John Doe")).toBeInTheDocument());
  });

  it("displays the sender email", async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByText("john@example.com")).toBeInTheDocument());
  });

  it("displays the message body", async () => {
    renderDetail();
    await waitFor(() =>
      expect(
        screen.getByText("I've been trying to log in for hours and nothing works.")
      ).toBeInTheDocument()
    );
  });

  it("shows 'No message body.' when body is empty", async () => {
    mockSuccess({ ...TICKET, body: "" });
    renderDetail();
    await waitFor(() =>
      expect(screen.getByText("No message body.")).toBeInTheDocument()
    );
  });

  it("formats and displays the created date", async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByText("John Doe")).toBeInTheDocument());
    const expected = new Date("2024-03-01T10:00:00.000Z").toLocaleString();
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("calls GET /api/tickets/1 with credentials", async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByText("John Doe")).toBeInTheDocument());
    expect(axios.get).toHaveBeenCalledWith("/api/tickets/1", { withCredentials: true });
  });

  it("calls GET /api/users/agents with credentials", async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByText("John Doe")).toBeInTheDocument());
    expect(axios.get).toHaveBeenCalledWith("/api/users/agents", { withCredentials: true });
  });

  it("does not show the error message on success", async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByText("John Doe")).toBeInTheDocument());
    expect(screen.queryByText("Failed to load ticket.")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Assignment dropdown
// ---------------------------------------------------------------------------

describe("TicketDetailPage — assignment", () => {
  it("renders the 'Assign to agent' combobox", async () => {
    mockSuccess();
    renderDetail();
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Assign to agent" })).toBeInTheDocument()
    );
  });

  it("lists all agents as options in the assignee select", async () => {
    mockSuccess();
    renderDetail();
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Assign to agent" })).toBeInTheDocument()
    );
    const select = screen.getByRole("combobox", { name: "Assign to agent" });
    expect(select).toContainElement(screen.getByRole("option", { name: "Agent Alice" }));
    expect(select).toContainElement(screen.getByRole("option", { name: "Agent Bob" }));
  });

  it("defaults the assignee select to 'Unassigned'", async () => {
    mockSuccess();
    renderDetail();
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Assign to agent" })).toBeInTheDocument()
    );
    expect(screen.getByRole("combobox", { name: "Assign to agent" })).toHaveValue("");
  });

  it("pre-selects the current assignee when a ticket has an assignee", async () => {
    mockSuccess({ ...TICKET, assigneeId: "a1", assignee: { id: "a1", name: "Agent Alice" } });
    renderDetail();
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Assign to agent" })).toHaveValue("a1")
    );
  });

  it("calls PATCH /api/tickets/1 with the selected agent's id", async () => {
    mockSuccess();
    vi.mocked(axios.patch).mockResolvedValue({
      data: { ...TICKET, assigneeId: "a1", assignee: { id: "a1", name: "Agent Alice" } },
    });
    renderDetail();
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Assign to agent" })).toBeInTheDocument()
    );

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Assign to agent" }),
      "a1"
    );

    expect(axios.patch).toHaveBeenCalledWith(
      "/api/tickets/1",
      { assigneeId: "a1" },
      { withCredentials: true }
    );
  });

  it("reflects the assigned agent in the select after a successful patch", async () => {
    mockSuccess();
    vi.mocked(axios.patch).mockResolvedValue({
      data: { ...TICKET, assigneeId: "a2", assignee: { id: "a2", name: "Agent Bob" } },
    });
    renderDetail();
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Assign to agent" })).toBeInTheDocument()
    );

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Assign to agent" }),
      "a2"
    );

    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Assign to agent" })).toHaveValue("a2")
    );
  });

  it("disables the assignee select while a patch is in-flight", async () => {
    mockSuccess();
    vi.mocked(axios.patch).mockReturnValue(new Promise(() => {}));
    renderDetail();
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Assign to agent" })).toBeInTheDocument()
    );

    fireEvent.change(
      screen.getByRole("combobox", { name: "Assign to agent" }),
      { target: { value: "a1" } }
    );

    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Assign to agent" })).toBeDisabled()
    );
  });
});

// ---------------------------------------------------------------------------
// Status select
// ---------------------------------------------------------------------------

describe("TicketDetailPage — status", () => {
  it("renders the Status combobox", async () => {
    mockSuccess();
    renderDetail();
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Status" })).toBeInTheDocument()
    );
  });

  it("pre-selects the current ticket status", async () => {
    mockSuccess();
    renderDetail();
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue("open")
    );
  });

  it("shows all three status options", async () => {
    mockSuccess();
    renderDetail();
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Status" })).toBeInTheDocument()
    );
    const select = screen.getByRole("combobox", { name: "Status" });
    expect(select).toContainElement(screen.getByRole("option", { name: "Open" }));
    expect(select).toContainElement(screen.getByRole("option", { name: "Resolved" }));
    expect(select).toContainElement(screen.getByRole("option", { name: "Closed" }));
  });

  it("calls PATCH /api/tickets/1 with the new status", async () => {
    mockSuccess();
    vi.mocked(axios.patch).mockResolvedValue({
      data: { ...TICKET, status: "resolved" },
    });
    renderDetail();
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Status" })).toBeInTheDocument()
    );

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Status" }), "resolved");

    expect(axios.patch).toHaveBeenCalledWith(
      "/api/tickets/1",
      { status: "resolved" },
      { withCredentials: true }
    );
  });

  it("reflects the updated status after a successful patch", async () => {
    mockSuccess();
    vi.mocked(axios.patch).mockResolvedValue({
      data: { ...TICKET, status: "closed" },
    });
    renderDetail();
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Status" })).toBeInTheDocument()
    );

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Status" }), "closed");

    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue("closed")
    );
  });

  it("disables the status select while a patch is in-flight", async () => {
    mockSuccess();
    vi.mocked(axios.patch).mockReturnValue(new Promise(() => {}));
    renderDetail();
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Status" })).toBeInTheDocument()
    );

    fireEvent.change(
      screen.getByRole("combobox", { name: "Status" }),
      { target: { value: "resolved" } }
    );

    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Status" })).toBeDisabled()
    );
  });
});

// ---------------------------------------------------------------------------
// Category select
// ---------------------------------------------------------------------------

describe("TicketDetailPage — category", () => {
  it("renders the Category combobox", async () => {
    mockSuccess();
    renderDetail();
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Category" })).toBeInTheDocument()
    );
  });

  it("pre-selects the current ticket category", async () => {
    mockSuccess();
    renderDetail();
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Category" })).toHaveValue("general_question")
    );
  });

  it("shows all three category options", async () => {
    mockSuccess();
    renderDetail();
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Category" })).toBeInTheDocument()
    );
    const select = screen.getByRole("combobox", { name: "Category" });
    expect(select).toContainElement(screen.getByRole("option", { name: "General" }));
    expect(select).toContainElement(screen.getByRole("option", { name: "Technical" }));
    expect(select).toContainElement(screen.getByRole("option", { name: "Refund" }));
  });

  it("calls PATCH /api/tickets/1 with the new category", async () => {
    mockSuccess();
    vi.mocked(axios.patch).mockResolvedValue({
      data: { ...TICKET, category: "technical_question" },
    });
    renderDetail();
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Category" })).toBeInTheDocument()
    );

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Category" }),
      "technical_question"
    );

    expect(axios.patch).toHaveBeenCalledWith(
      "/api/tickets/1",
      { category: "technical_question" },
      { withCredentials: true }
    );
  });

  it("reflects the updated category after a successful patch", async () => {
    mockSuccess();
    vi.mocked(axios.patch).mockResolvedValue({
      data: { ...TICKET, category: "refund_request" },
    });
    renderDetail();
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Category" })).toBeInTheDocument()
    );

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Category" }),
      "refund_request"
    );

    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Category" })).toHaveValue("refund_request")
    );
  });

  it("disables the category select while a patch is in-flight", async () => {
    mockSuccess();
    vi.mocked(axios.patch).mockReturnValue(new Promise(() => {}));
    renderDetail();
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Category" })).toBeInTheDocument()
    );

    fireEvent.change(
      screen.getByRole("combobox", { name: "Category" }),
      { target: { value: "refund_request" } }
    );

    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Category" })).toBeDisabled()
    );
  });
});
