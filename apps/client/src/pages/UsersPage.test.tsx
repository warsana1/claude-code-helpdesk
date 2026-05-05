import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { UsersPage } from "./UsersPage";
import { renderPage } from "../test/render-utils";

vi.mock("axios");
vi.mock("../components/NavBar", () => ({ NavBar: () => <nav data-testid="navbar" /> }));
vi.mock("../components/UserForm", () => ({ UserForm: () => <div data-testid="user-form" /> }));

const USERS = [
  { id: "1", name: "Alice Admin", email: "alice@example.com", role: "admin", createdAt: "2024-01-15T00:00:00.000Z" },
  { id: "2", name: "Bob Agent", email: "bob@example.com", role: "agent", createdAt: "2024-03-20T00:00:00.000Z" },
];

beforeEach(() => {
  vi.resetAllMocks();
});

describe("UsersPage — skeleton", () => {
  it("shows 6 skeleton rows while the query is pending", () => {
    vi.mocked(axios.get).mockReturnValue(new Promise(() => {}));
    renderPage(<UsersPage />);

    // Each skeleton row has 4 cells; look for the pulsing divs
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(24); // 6 rows × 4 cells
  });

  it("renders the table header columns regardless of load state", () => {
    vi.mocked(axios.get).mockReturnValue(new Promise(() => {}));
    renderPage(<UsersPage />);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Joined")).toBeInTheDocument();
  });
});

describe("UsersPage — loaded", () => {
  beforeEach(() => {
    vi.mocked(axios.get).mockResolvedValue({ data: USERS });
  });

  it("renders a row for each user", async () => {
    renderPage(<UsersPage />);
    await waitFor(() => expect(screen.getByText("Alice Admin")).toBeInTheDocument());
    expect(screen.getByText("Bob Agent")).toBeInTheDocument();
  });

  it("displays each user's email", async () => {
    renderPage(<UsersPage />);
    await waitFor(() => expect(screen.getByText("alice@example.com")).toBeInTheDocument());
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
  });

  it("shows the role badge for each user", async () => {
    renderPage(<UsersPage />);
    await waitFor(() => expect(screen.getByText("admin")).toBeInTheDocument());
    expect(screen.getByText("agent")).toBeInTheDocument();
  });

  it("applies purple styling to the admin badge", async () => {
    renderPage(<UsersPage />);
    await waitFor(() => expect(screen.getByText("admin")).toBeInTheDocument());
    expect(screen.getByText("admin")).toHaveClass("bg-purple-100", "text-purple-700");
  });

  it("applies blue styling to the agent badge", async () => {
    renderPage(<UsersPage />);
    await waitFor(() => expect(screen.getByText("agent")).toBeInTheDocument());
    expect(screen.getByText("agent")).toHaveClass("bg-blue-100", "text-blue-700");
  });

  it("formats the joined date as a locale date string", async () => {
    renderPage(<UsersPage />);
    await waitFor(() => expect(screen.getByText("Alice Admin")).toBeInTheDocument());
    const expected = new Date("2024-01-15T00:00:00.000Z").toLocaleDateString();
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("does not show the error message on success", async () => {
    renderPage(<UsersPage />);
    await waitFor(() => expect(screen.getByText("Alice Admin")).toBeInTheDocument());
    expect(screen.queryByText("Failed to load users.")).not.toBeInTheDocument();
  });

  it("calls GET /api/users with credentials", async () => {
    renderPage(<UsersPage />);
    await waitFor(() => expect(screen.getByText("Alice Admin")).toBeInTheDocument());
    expect(axios.get).toHaveBeenCalledWith("/api/users", { withCredentials: true });
  });
});

describe("UsersPage — error", () => {
  it("shows an error message when the request fails", async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error("Network Error"));
    renderPage(<UsersPage />);
    await waitFor(() =>
      expect(screen.getByText("Failed to load users.")).toBeInTheDocument()
    );
  });

  it("does not render any user rows on error", async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error("Network Error"));
    renderPage(<UsersPage />);
    await waitFor(() =>
      expect(screen.getByText("Failed to load users.")).toBeInTheDocument()
    );
    expect(screen.queryByText("Alice Admin")).not.toBeInTheDocument();
  });
});

describe("UsersPage — edit user", () => {
  beforeEach(() => {
    vi.mocked(axios.get).mockResolvedValue({ data: USERS });
  });

  it("renders an edit button for each user row", async () => {
    renderPage(<UsersPage />);
    await waitFor(() => expect(screen.getByText("Alice Admin")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Edit Alice Admin" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Bob Agent" })).toBeInTheDocument();
  });

  it("opens the Edit User modal when an edit button is clicked", async () => {
    renderPage(<UsersPage />);
    await waitFor(() => expect(screen.getByText("Alice Admin")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Edit Alice Admin" }));
    expect(screen.getByRole("heading", { name: "Edit User" })).toBeInTheDocument();
  });

  it("closes the edit modal when the backdrop is clicked", async () => {
    renderPage(<UsersPage />);
    await waitFor(() => expect(screen.getByText("Alice Admin")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Edit Alice Admin" }));

    const backdrop = screen.getByRole("heading", { name: "Edit User" }).closest(".fixed")!;
    fireEvent.click(backdrop);

    expect(screen.queryByRole("heading", { name: "Edit User" })).not.toBeInTheDocument();
  });

  it("closes the edit modal when Escape is pressed", async () => {
    renderPage(<UsersPage />);
    await waitFor(() => expect(screen.getByText("Alice Admin")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Edit Alice Admin" }));

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("heading", { name: "Edit User" })).not.toBeInTheDocument();
  });

  it("does not show the Create User heading when an edit button is clicked", async () => {
    renderPage(<UsersPage />);
    await waitFor(() => expect(screen.getByText("Alice Admin")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Edit Alice Admin" }));
    expect(screen.queryByRole("heading", { name: "Create User" })).not.toBeInTheDocument();
  });
});

describe("UsersPage — delete user", () => {
  beforeEach(() => {
    vi.mocked(axios.get).mockResolvedValue({ data: USERS });
  });

  it("renders a delete button for non-admin users", async () => {
    renderPage(<UsersPage />);
    await waitFor(() => expect(screen.getByText("Bob Agent")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Delete Bob Agent" })).toBeInTheDocument();
  });

  it("does not render a delete button for admin users", async () => {
    renderPage(<UsersPage />);
    await waitFor(() => expect(screen.getByText("Alice Admin")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Delete Alice Admin" })).not.toBeInTheDocument();
  });

  it("opens the Delete User modal when a delete button is clicked", async () => {
    renderPage(<UsersPage />);
    await waitFor(() => expect(screen.getByText("Bob Agent")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Delete Bob Agent" }));
    expect(screen.getByRole("heading", { name: "Delete User" })).toBeInTheDocument();
  });

  it("closes the delete modal when the backdrop is clicked", async () => {
    renderPage(<UsersPage />);
    await waitFor(() => expect(screen.getByText("Bob Agent")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Delete Bob Agent" }));

    const backdrop = screen.getByRole("heading", { name: "Delete User" }).closest(".fixed")!;
    fireEvent.click(backdrop);

    expect(screen.queryByRole("heading", { name: "Delete User" })).not.toBeInTheDocument();
  });

  it("closes the delete modal when Escape is pressed", async () => {
    renderPage(<UsersPage />);
    await waitFor(() => expect(screen.getByText("Bob Agent")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Delete Bob Agent" }));

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("heading", { name: "Delete User" })).not.toBeInTheDocument();
  });
});

describe("UsersPage — create user modal", () => {
  beforeEach(() => {
    vi.mocked(axios.get).mockResolvedValue({ data: USERS });
  });

  it("shows the Create User button", () => {
    renderPage(<UsersPage />);
    expect(screen.getByRole("button", { name: "Create User" })).toBeInTheDocument();
  });

  it("opens the modal when Create User is clicked", async () => {
    renderPage(<UsersPage />);
    await userEvent.click(screen.getByRole("button", { name: "Create User" }));
    expect(screen.getByRole("heading", { name: "Create User" })).toBeInTheDocument();
  });

  it("closes the modal when the backdrop is clicked", async () => {
    renderPage(<UsersPage />);
    await userEvent.click(screen.getByRole("button", { name: "Create User" }));

    const backdrop = screen.getByRole("heading", { name: "Create User" }).closest(".fixed")!;
    fireEvent.click(backdrop);

    expect(screen.queryByRole("heading", { name: "Create User" })).not.toBeInTheDocument();
  });

  it("closes the modal when Escape is pressed", async () => {
    renderPage(<UsersPage />);
    await userEvent.click(screen.getByRole("button", { name: "Create User" }));

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("heading", { name: "Create User" })).not.toBeInTheDocument();
  });
});
