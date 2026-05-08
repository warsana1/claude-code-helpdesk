import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { authClient } from "../lib/auth-client";
import { LoginPage } from "./LoginPage";
import { renderPage } from "../test/render-utils";

const mockNavigate = vi.fn();

vi.mock("react-router", async (importActual) => {
  const actual = await importActual<typeof import("react-router")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../lib/auth-client", () => ({
  authClient: {
    signIn: { email: vi.fn() },
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe("LoginPage — render", () => {
  it("renders the email and password fields", () => {
    renderPage(<LoginPage />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("renders the sign-in button", () => {
    renderPage(<LoginPage />);
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });
});

describe("LoginPage — validation", () => {
  it("shows an error when submitting with an invalid email", async () => {
    renderPage(<LoginPage />);
    await userEvent.type(screen.getByLabelText("Email"), "not-an-email");
    await userEvent.type(screen.getByLabelText("Password"), "password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() =>
      expect(screen.getByText("Enter a valid email")).toBeInTheDocument()
    );
  });

  it("shows an error when submitting with an empty password", async () => {
    renderPage(<LoginPage />);
    await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() =>
      expect(screen.getByText("Password is required")).toBeInTheDocument()
    );
  });

  it("does not call signIn when validation fails", async () => {
    renderPage(<LoginPage />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() =>
      expect(screen.getByText("Password is required")).toBeInTheDocument()
    );
    expect(authClient.signIn.email).not.toHaveBeenCalled();
  });
});

describe("LoginPage — successful sign in", () => {
  beforeEach(() => {
    vi.mocked(authClient.signIn.email).mockResolvedValue({ error: null } as any);
  });

  it("calls signIn.email with the entered credentials", async () => {
    renderPage(<LoginPage />);
    await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "secret123");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() =>
      expect(authClient.signIn.email).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "secret123",
      })
    );
  });

  it("navigates to / after a successful sign in", async () => {
    renderPage(<LoginPage />);
    await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "secret123");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
  });
});

describe("LoginPage — failed sign in", () => {
  beforeEach(() => {
    vi.mocked(authClient.signIn.email).mockResolvedValue({
      error: { message: "Invalid credentials" },
    } as any);
  });

  it("shows 'Invalid email or password.' when sign in fails", async () => {
    renderPage(<LoginPage />);
    await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrongpass");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() =>
      expect(screen.getByText("Invalid email or password.")).toBeInTheDocument()
    );
  });

  it("does not navigate when sign in fails", async () => {
    renderPage(<LoginPage />);
    await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrongpass");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() =>
      expect(screen.getByText("Invalid email or password.")).toBeInTheDocument()
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
