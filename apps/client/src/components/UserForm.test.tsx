import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { UserForm } from "./UserForm";
import { renderPage } from "../test/render-utils";

vi.mock("axios");

const onClose = vi.fn();
const onSuccess = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
});

function setup() {
  const user = userEvent.setup();
  renderPage(<UserForm onClose={onClose} onSuccess={onSuccess} />);
  return user;
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  { name = "Test User", email = "test@example.com", password = "password123" } = {}
) {
  if (name) await user.type(screen.getByPlaceholderText("Full name"), name);
  if (email) await user.type(screen.getByPlaceholderText("user@example.com"), email);
  if (password) await user.type(screen.getByPlaceholderText("Min. 8 characters"), password);
}

// ─── Rendering ───────────────────────────────────────────────────────────────

describe("UserForm — rendering", () => {
  it("renders name, email and password fields", () => {
    setup();
    expect(screen.getByPlaceholderText("Full name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("user@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Min. 8 characters")).toBeInTheDocument();
  });

  it("renders a Cancel button and a Create User submit button", () => {
    setup();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create User" })).toBeInTheDocument();
  });
});

// ─── Cancel ──────────────────────────────────────────────────────────────────

describe("UserForm — cancel", () => {
  it("calls onClose when Cancel is clicked", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

// ─── Validation ──────────────────────────────────────────────────────────────

describe("UserForm — validation", () => {
  it("shows a name error when name is too short", async () => {
    const user = setup();
    await fillForm(user, { name: "ab" });
    await user.click(screen.getByRole("button", { name: "Create User" }));
    await waitFor(() =>
      expect(screen.getByText("Name must be at least 3 characters.")).toBeInTheDocument()
    );
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("shows an email error when email is invalid", async () => {
    const user = setup();
    await fillForm(user, { email: "not-an-email" });
    await user.click(screen.getByRole("button", { name: "Create User" }));
    await waitFor(() =>
      expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument()
    );
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("shows a password error when password is too short", async () => {
    const user = setup();
    await fillForm(user, { password: "short" });
    await user.click(screen.getByRole("button", { name: "Create User" }));
    await waitFor(() =>
      expect(screen.getByText("Password must be at least 8 characters.")).toBeInTheDocument()
    );
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("applies a red border to invalid fields after a failed submit", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Create User" }));
    await waitFor(() =>
      expect(screen.getByPlaceholderText("Full name")).toHaveClass("border-red-500")
    );
    expect(screen.getByPlaceholderText("user@example.com")).toHaveClass("border-red-500");
    expect(screen.getByPlaceholderText("Min. 8 characters")).toHaveClass("border-red-500");
  });
});

// ─── Submission ───────────────────────────────────────────────────────────────

describe("UserForm — submission", () => {
  it("shows Creating... and disables the button while the request is in flight", async () => {
    vi.mocked(axios.post).mockReturnValue(new Promise(() => {}));
    const user = setup();
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Create User" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Creating..." })).toBeDisabled()
    );
  });

  it("posts to /api/users with the correct payload", async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: {} });
    const user = setup();
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Create User" }));
    await waitFor(() => expect(axios.post).toHaveBeenCalledOnce());
    expect(axios.post).toHaveBeenCalledWith(
      "/api/users",
      { name: "Test User", email: "test@example.com", password: "password123" },
      { withCredentials: true }
    );
  });

  it("calls onSuccess and onClose after a successful submit", async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: {} });
    const user = setup();
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Create User" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(onClose).toHaveBeenCalledOnce();
  });
});

// ─── Server errors ────────────────────────────────────────────────────────────

describe("UserForm — server errors", () => {
  it("shows an inline email error on a 409 response", async () => {
    vi.mocked(axios.post).mockRejectedValue({
      response: { status: 409, data: { error: "A user with that email already exists." } },
    });
    vi.mocked(axios.isAxiosError).mockReturnValue(true);

    const user = setup();
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Create User" }));

    await waitFor(() =>
      expect(screen.getByText("A user with that email already exists.")).toBeInTheDocument()
    );
    expect(screen.getByPlaceholderText("user@example.com")).toHaveClass("border-red-500");
  });

  it("shows a root error banner on a non-409 server error", async () => {
    vi.mocked(axios.post).mockRejectedValue({
      response: { status: 500, data: { error: "Internal server error." } },
    });
    vi.mocked(axios.isAxiosError).mockReturnValue(true);

    const user = setup();
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Create User" }));

    await waitFor(() =>
      expect(screen.getByText("Internal server error.")).toBeInTheDocument()
    );
  });

  it("shows a network error banner when there is no response", async () => {
    vi.mocked(axios.post).mockRejectedValue(new Error("Network Error"));
    vi.mocked(axios.isAxiosError).mockReturnValue(false);

    const user = setup();
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Create User" }));

    await waitFor(() =>
      expect(screen.getByText("Network error. Please try again.")).toBeInTheDocument()
    );
  });
});
