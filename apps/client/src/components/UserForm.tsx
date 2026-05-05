import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema, updateUserSchema } from "@helpdesk/core";
import axios from "axios";

type EditUser = { id: string; name: string; email: string };
type Props = { onClose: () => void; onSuccess: () => void; user?: EditUser };
type FormValues = { name: string; email: string; password: string };

const inputClass = (hasError: boolean) =>
  `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
    hasError
      ? "border-red-500 focus:ring-red-500"
      : "border-gray-300 focus:ring-gray-900 focus:border-transparent"
  }`;

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
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          {...register("name")}
          type="text"
          className={inputClass(!!errors.name)}
          placeholder="Full name"
          autoFocus
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          {...register("email")}
          type="email"
          className={inputClass(!!errors.email)}
          placeholder="user@example.com"
        />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Password
          {isEdit && <span className="text-gray-400 font-normal ml-1">(leave blank to keep unchanged)</span>}
        </label>
        <input
          {...register("password")}
          type="password"
          className={inputClass(!!errors.password)}
          placeholder={isEdit ? "New password (optional)" : "Min. 8 characters"}
        />
        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
      </div>
      {errors.root && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {errors.root.message}
        </p>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-700 disabled:opacity-60 rounded-lg transition-colors"
        >
          {isEdit
            ? isSubmitting ? "Saving..." : "Save Changes"
            : isSubmitting ? "Creating..." : "Create User"}
        </button>
      </div>
    </form>
  );
}
