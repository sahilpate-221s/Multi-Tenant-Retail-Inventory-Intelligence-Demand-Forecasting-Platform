import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/authContext";
import { ApiError } from "../lib/apiClient";

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register(storeName, email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-lg p-6">
        <h1 className="text-lg font-semibold text-slate-800">Create your store</h1>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <input
            required
            placeholder="Store name"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm"
          />
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-status-danger">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-slate-900 text-white text-sm font-medium rounded-md py-2 disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create store"}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-500 text-center">
          Already have an account? <Link to="/login" className="text-slate-800 underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;