import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema, updateUserSchema } from "@helpdesk/core";
import axios from "axios";

type EditUser = { id: string; name: string; email: string };
type Props = { onClose: () => void; onSuccess: () => void; user?: EditUser };
type FormValues = { name: string; email: string; password: string };

const inputClass = (hasError: boolean) =>
  `w-full bg-input border rounded-lg px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 transition-all ${
    hasError
      ? "border-red-500/40 focus:ring-red-500/20"
      : "border-border focus:ring-primary/25 focus:border-primary/40"
  }`;

const labelClass = "block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider";

export function UserForm({ onClose, onSuccess, user }: Props) {
  const isEdit = user !== undefined;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema),
    defaultValues: isEdit ? { name: user.name, email: user.email, password: "" } : undefined,
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (isEdit)
        await axios.patch(`/api/users/${user.id}`, data, { withCredentials: true });
      else
        await axios.post("/api/users", data, { withCredentials: true });
      onSuccess();
      onClose();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409)
        setError("email", { message: err.response.data?.error });
      else
        setError("root", {
          message: axios.isAxiosError(err)
            ? (err.response?.data?.error ?? "Something went wrong.")
            : "Network error. Please try again.",
        });
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="name" className={labelClass}>Name</label>
        <input
          id="name"
          {...register("name")}
          type="text"
          className={inputClass(!!errors.name)}
          placeholder="Full name"
          autoFocus
        />
        {errors.name && <p className="text-xs text-red-500 dark:text-red-400 mt-1.5">{errors.name.message}</p>}
      </div>
      <div>
        <label htmlFor="email" className={labelClass}>Email</label>
        <input
          id="email"
          {...register("email")}
          type="email"
          className={inputClass(!!errors.email)}
          placeholder="user@example.com"
        />
        {errors.email && <p className="text-xs text-red-500 dark:text-red-400 mt-1.5">{errors.email.message}</p>}
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>
          Password
          {isEdit && (
            <span className="text-muted-foreground/50 font-normal ml-1 normal-case tracking-normal">
              (leave blank to keep unchanged)
            </span>
          )}
        </label>
        <input
          id="password"
          {...register("password")}
          type="password"
          className={inputClass(!!errors.password)}
          placeholder={isEdit ? "New password (optional)" : "Min. 8 characters"}
        />
        {errors.password && <p className="text-xs text-red-500 dark:text-red-400 mt-1.5">{errors.password.message}</p>}
      </div>
      {errors.root && (
        <p className="text-xs text-red-500 dark:text-red-400 bg-red-500/8 border border-red-500/20 rounded-lg px-3.5 py-2.5">
          {errors.root.message}
        </p>
      )}
      <div className="flex justify-end gap-2.5 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-secondary-foreground bg-muted hover:bg-accent border border-border rounded-lg transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          {isEdit
            ? isSubmitting ? "Saving…" : "Save Changes"
            : isSubmitting ? "Creating…" : "Create User"}
        </button>
      </div>
    </form>
  );
}
