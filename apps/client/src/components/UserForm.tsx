import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema, type CreateUserInput } from "@helpdesk/core";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";

type FormValues = CreateUserInput;

type Props = { onClose: () => void; onSuccess: () => void };

const inputClass = (hasError: boolean) =>
  `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
    hasError ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-gray-900"
  }`;

export function UserForm({ onClose, onSuccess }: Props) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(createUserSchema) });

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      axios.post("/api/users", data, { withCredentials: true }).then((r) => r.data),
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      await mutation.mutateAsync(data);
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
    <form onSubmit={onSubmit} className="space-y-4">
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input
          {...register("password")}
          type="password"
          className={inputClass(!!errors.password)}
          placeholder="Min. 8 characters"
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
          {isSubmitting ? "Creating..." : "Create User"}
        </button>
      </div>
    </form>
  );
}
