import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { DeleteUserModal } from "./DeleteUserModal";
import { renderPage } from "../test/render-utils";

vi.mock("axios");

const USER = { id: "u1", name: "Bob Agent" };
const onClose = vi.fn();
const onSuccess = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
});

function setup() {
  const user = userEvent.setup();
  renderPage(<DeleteUserModal user={USER} onClose={onClose} onSuccess={onSuccess} />);
  return user;
}

// ─── Rendering ───────────────────────────────────────────────────────────────

describe("DeleteUserModal — rendering", () => {
  it("shows the user's name in the confirmation message", () => {
    setup();
    expect(screen.getByText(/Bob Agent/)).toBeInTheDocument();
  });

  it("renders Cancel and Delete buttons", () => {
    setup();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });
});

// ─── Cancel ──────────────────────────────────────────────────────────────────

describe("DeleteUserModal — cancel", () => {
  it("calls onClose when Cancel is clicked", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Escape is pressed", () => {
    setup();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when the backdrop is clicked", async () => {
    const user = setup();
    const backdrop = screen.getByRole("heading", { name: "Delete User" }).closest(".fixed")!;
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });
});

// ─── Submission ───────────────────────────────────────────────────────────────

describe("DeleteUserModal — submission", () => {
  it("sends DELETE /api/users/:id with credentials", async () => {
    vi.mocked(axios.delete).mockResolvedValue({});
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(axios.delete).toHaveBeenCalledOnce());
    expect(axios.delete).toHaveBeenCalledWith("/api/users/u1", { withCredentials: true });
  });

  it("shows Deleting... and disables both buttons while the request is in flight", async () => {
    vi.mocked(axios.delete).mockReturnValue(new Promise(() => {}));
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Deleting..." })).toBeDisabled()
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("calls onSuccess and onClose after successful deletion", async () => {
    vi.mocked(axios.delete).mockResolvedValue({});
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows an error banner and re-enables the Delete button on failure", async () => {
    vi.mocked(axios.delete).mockRejectedValue({
      response: { status: 500, data: { error: "Internal server error." } },
    });
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(screen.getByText("Internal server error.")).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: "Delete" })).not.toBeDisabled();
  });

  it("shows a network error banner when there is no response", async () => {
    vi.mocked(axios.delete).mockRejectedValue(new Error("Network Error"));
    vi.mocked(axios.isAxiosError).mockReturnValue(false);
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(screen.getByText("Network error. Please try again.")).toBeInTheDocument()
    );
  });
});
