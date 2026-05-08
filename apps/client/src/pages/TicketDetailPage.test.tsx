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

const REPLY_AGENT = {
  id: 10,
  body: "We're looking into this now.",
  senderType: "agent" as const,
  createdAt: "2024-03-01T13:00:00.000Z",
  user: { id: "a1", name: "Agent Alice" },
};

const REPLY_CUSTOMER = {
  id: 11,
  body: "Still not working, please help.",
  senderType: "customer" as const,
  createdAt: "2024-03-01T14:00:00.000Z",
  user: null,
};

function mockSuccess(ticket = TICKET, agents = AGENTS, replies: Array<typeof REPLY_AGENT | typeof REPLY_CUSTOMER> = []) {
  vi.mocked(axios.get).mockImplementation((url: string) => {
    if (url === "/api/tickets/1") return Promise.resolve({ data: ticket });
    if (url === "/api/users/agents") return Promise.resolve({ data: agents });
    if (url === "/api/tickets/1/replies") return Promise.resolve({ data: replies });
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

// ---------------------------------------------------------------------------
// Reply thread
// ---------------------------------------------------------------------------

describe("TicketDetailPage — reply thread", () => {
  it("calls GET /api/tickets/1/replies with credentials", async () => {
    mockSuccess();
    renderDetail();
    await waitFor(() => expect(screen.getByText("John Doe")).toBeInTheDocument());
    expect(axios.get).toHaveBeenCalledWith("/api/tickets/1/replies", { withCredentials: true });
  });

  it("does not show a Replies heading when there are no replies", async () => {
    mockSuccess(TICKET, AGENTS, []);
    renderDetail();
    await waitFor(() => expect(screen.getByText("John Doe")).toBeInTheDocument());
    expect(screen.queryByText(/^Replies/)).not.toBeInTheDocument();
  });

  it("shows the Replies heading with count when replies exist", async () => {
    mockSuccess(TICKET, AGENTS, [REPLY_AGENT, REPLY_CUSTOMER]);
    renderDetail();
    await waitFor(() => expect(screen.getByText("Replies (2)")).toBeInTheDocument());
  });

  it("renders an agent reply body", async () => {
    mockSuccess(TICKET, AGENTS, [REPLY_AGENT]);
    renderDetail();
    await waitFor(() =>
      expect(screen.getByText("We're looking into this now.")).toBeInTheDocument()
    );
  });

  it("shows the agent's name on an agent reply", async () => {
    mockSuccess(TICKET, AGENTS, [REPLY_AGENT]);
    renderDetail();
    await waitFor(() => expect(screen.getByText("Replies (1)")).toBeInTheDocument());
    expect(screen.getAllByText("Agent Alice").length).toBeGreaterThanOrEqual(1);
  });

  it("shows an 'agent' badge on agent replies", async () => {
    mockSuccess(TICKET, AGENTS, [REPLY_AGENT]);
    renderDetail();
    await waitFor(() => expect(screen.getByText("Replies (1)")).toBeInTheDocument());
    expect(screen.getByText("agent")).toBeInTheDocument();
  });

  it("renders a customer reply body", async () => {
    mockSuccess(TICKET, AGENTS, [REPLY_CUSTOMER]);
    renderDetail();
    await waitFor(() =>
      expect(screen.getByText("Still not working, please help.")).toBeInTheDocument()
    );
  });

  it("shows the ticket sender name on customer replies", async () => {
    mockSuccess(TICKET, AGENTS, [REPLY_CUSTOMER]);
    renderDetail();
    await waitFor(() => expect(screen.getByText("Replies (1)")).toBeInTheDocument());
    const customerNames = screen.getAllByText("John Doe");
    expect(customerNames.length).toBeGreaterThanOrEqual(1);
  });

  it("shows a 'customer' badge on customer replies", async () => {
    mockSuccess(TICKET, AGENTS, [REPLY_CUSTOMER]);
    renderDetail();
    await waitFor(() => expect(screen.getByText("customer")).toBeInTheDocument());
  });

  it("renders multiple replies in order", async () => {
    mockSuccess(TICKET, AGENTS, [REPLY_AGENT, REPLY_CUSTOMER]);
    renderDetail();
    await waitFor(() => expect(screen.getByText("Replies (2)")).toBeInTheDocument());
    const bodies = screen.getAllByText(/looking into|not working/);
    expect(bodies[0]).toHaveTextContent("We're looking into this now.");
    expect(bodies[1]).toHaveTextContent("Still not working, please help.");
  });
});

// ---------------------------------------------------------------------------
// Reply form
// ---------------------------------------------------------------------------

describe("TicketDetailPage — reply form", () => {
  beforeEach(() => mockSuccess());

  it("renders the Reply textarea", async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByLabelText("Reply body")).toBeInTheDocument());
  });

  it("renders the Send reply button", async () => {
    renderDetail();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Send reply" })).toBeInTheDocument()
    );
  });

  it("'Send reply' is disabled when the textarea is empty", async () => {
    renderDetail();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Send reply" })).toBeDisabled()
    );
  });

  it("'Send reply' is enabled once the textarea has text", async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByLabelText("Reply body")).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText("Reply body"), "Hello there");
    expect(screen.getByRole("button", { name: "Send reply" })).not.toBeDisabled();
  });

  it("calls POST /api/tickets/1/replies with the trimmed body", async () => {
    mockSuccess();
    vi.mocked(axios.post).mockResolvedValue({ data: REPLY_AGENT });
    renderDetail();
    await waitFor(() => expect(screen.getByLabelText("Reply body")).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText("Reply body"), "  Hello there  ");
    await userEvent.click(screen.getByRole("button", { name: "Send reply" }));

    expect(axios.post).toHaveBeenCalledWith(
      "/api/tickets/1/replies",
      { body: "Hello there" },
      { withCredentials: true }
    );
  });

  it("clears the textarea after a successful submission", async () => {
    mockSuccess();
    vi.mocked(axios.post).mockResolvedValue({ data: REPLY_AGENT });
    renderDetail();
    await waitFor(() => expect(screen.getByLabelText("Reply body")).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText("Reply body"), "Hello there");
    await userEvent.click(screen.getByRole("button", { name: "Send reply" }));

    await waitFor(() =>
      expect(screen.getByLabelText("Reply body")).toHaveValue("")
    );
  });

  it("appends the new reply to the thread without a re-fetch", async () => {
    mockSuccess();
    vi.mocked(axios.post).mockResolvedValue({ data: REPLY_AGENT });
    renderDetail();
    await waitFor(() => expect(screen.getByLabelText("Reply body")).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText("Reply body"), "New reply");
    await userEvent.click(screen.getByRole("button", { name: "Send reply" }));

    await waitFor(() =>
      expect(screen.getByText("We're looking into this now.")).toBeInTheDocument()
    );
    expect(screen.getByText("Replies (1)")).toBeInTheDocument();
  });

  it("shows 'Sending…' and disables the button while the post is in-flight", async () => {
    mockSuccess();
    vi.mocked(axios.post).mockReturnValue(new Promise(() => {}));
    renderDetail();
    await waitFor(() => expect(screen.getByLabelText("Reply body")).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText("Reply body"), "Hello");
    await userEvent.click(screen.getByRole("button", { name: "Send reply" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled()
    );
  });

  it("disables the textarea while a reply is being submitted", async () => {
    mockSuccess();
    vi.mocked(axios.post).mockReturnValue(new Promise(() => {}));
    renderDetail();
    await waitFor(() => expect(screen.getByLabelText("Reply body")).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText("Reply body"), "Hello");
    await userEvent.click(screen.getByRole("button", { name: "Send reply" }));

    await waitFor(() =>
      expect(screen.getByLabelText("Reply body")).toBeDisabled()
    );
  });
});

// ---------------------------------------------------------------------------
// Polish reply
// ---------------------------------------------------------------------------

describe("TicketDetailPage — polish reply", () => {
  beforeEach(() => mockSuccess());

  it("renders the Polish button", async () => {
    renderDetail();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Polish" })).toBeInTheDocument()
    );
  });

  it("'Polish' is disabled when the textarea is empty", async () => {
    renderDetail();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Polish" })).toBeDisabled()
    );
  });

  it("'Polish' is enabled once the textarea has text", async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByLabelText("Reply body")).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText("Reply body"), "rough draft");
    expect(screen.getByRole("button", { name: "Polish" })).not.toBeDisabled();
  });

  it("calls POST /api/tickets/1/polish-reply with the trimmed reply body", async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { polishedBody: "Polished text." } });
    renderDetail();
    await waitFor(() => expect(screen.getByLabelText("Reply body")).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText("Reply body"), "  rough draft  ");
    await userEvent.click(screen.getByRole("button", { name: "Polish" }));

    expect(axios.post).toHaveBeenCalledWith(
      "/api/tickets/1/polish-reply",
      { body: "rough draft" },
      { withCredentials: true }
    );
  });

  it("replaces the textarea content with the polished body on success", async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { polishedBody: "Polished text." } });
    renderDetail();
    await waitFor(() => expect(screen.getByLabelText("Reply body")).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText("Reply body"), "rough draft");
    await userEvent.click(screen.getByRole("button", { name: "Polish" }));

    await waitFor(() =>
      expect(screen.getByLabelText("Reply body")).toHaveValue("Polished text.")
    );
  });

  it("shows 'Polishing…' and disables the button while the request is in-flight", async () => {
    vi.mocked(axios.post).mockReturnValue(new Promise(() => {}));
    renderDetail();
    await waitFor(() => expect(screen.getByLabelText("Reply body")).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText("Reply body"), "rough draft");
    await userEvent.click(screen.getByRole("button", { name: "Polish" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Polishing…" })).toBeDisabled()
    );
  });

  it("disables 'Send reply' while polishing is in-flight", async () => {
    vi.mocked(axios.post).mockReturnValue(new Promise(() => {}));
    renderDetail();
    await waitFor(() => expect(screen.getByLabelText("Reply body")).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText("Reply body"), "rough draft");
    await userEvent.click(screen.getByRole("button", { name: "Polish" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Send reply" })).toBeDisabled()
    );
  });

  it("shows an error message when polishing fails", async () => {
    const axiosError = { isAxiosError: true, response: { data: { error: "AI service unavailable." } }, message: "Request failed" };
    vi.mocked(axios.post).mockRejectedValue(axiosError);
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    renderDetail();
    await waitFor(() => expect(screen.getByLabelText("Reply body")).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText("Reply body"), "rough draft");
    await userEvent.click(screen.getByRole("button", { name: "Polish" }));

    await waitFor(() =>
      expect(screen.getByText("AI service unavailable.")).toBeInTheDocument()
    );
  });

  it("clears the error when the user edits the textarea", async () => {
    const axiosError = { isAxiosError: true, response: { data: { error: "AI service unavailable." } }, message: "Request failed" };
    vi.mocked(axios.post).mockRejectedValue(axiosError);
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    renderDetail();
    await waitFor(() => expect(screen.getByLabelText("Reply body")).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText("Reply body"), "rough draft");
    await userEvent.click(screen.getByRole("button", { name: "Polish" }));
    await waitFor(() =>
      expect(screen.getByText("AI service unavailable.")).toBeInTheDocument()
    );

    await userEvent.type(screen.getByLabelText("Reply body"), " more text");
    expect(screen.queryByText("AI service unavailable.")).not.toBeInTheDocument();
  });
});
