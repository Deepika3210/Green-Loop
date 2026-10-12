import { useState } from "react";

import {
  Leaf,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";

import "../styles/Auth.css";

const API_URL = "http://localhost:5000";

const dashboardRoutes = {
  user: "/dashboard",
  collection_center: "/collection-center",
  recycler: "/recycler",
  manufacturer: "/manufacturer",
};

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!formData.email.trim() || !formData.password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Login failed. Please try again."
        );
      }

      if (!data.user || !data.token) {
        throw new Error("The server returned an invalid response.");
      }

      const user = data.user;

      if (user.accountStatus === "pending") {
        throw new Error(
          "Your business account is awaiting approval."
        );
      }

      if (user.accountStatus === "rejected") {
        throw new Error(
          "Your account has been rejected. Contact the administrator."
        );
      }

      const destination = dashboardRoutes[user.role];

      if (!destination) {
        throw new Error(
          "Your account has an unsupported role."
        );
      }

      localStorage.setItem("greenLoopToken", data.token);

      localStorage.setItem(
        "greenLoopUser",
        JSON.stringify(user)
      );

      navigate(destination, { replace: true });
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the Green Loop server."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      {/* LEFT BRAND PANEL */}

      <section className="auth-brand-panel">
        <div className="brand-logo">
          <span className="brand-icon">
            <Leaf size={28} />
          </span>

          <span>
            Green<span className="brand-highlight">Loop</span>
          </span>
        </div>

        <div className="brand-content">
          <span className="brand-badge">
            <Leaf size={15} />
            WELCOME BACK
          </span>

          <h1>
            Every action
            <br />
            creates a
            <br />
            <span>greener future.</span>
          </h1>

          <p>
            Sign in to continue your Green Loop journey.
            Together, we can make recycling smarter and
            build a sustainable circular economy.
          </p>

          <div className="impact-card">
            <div className="impact-icon">
              <Leaf size={25} />
            </div>

            <div>
              <h3>Your impact matters.</h3>

              <p>
                Track recycling activities, manage operations,
                or monitor sustainability progress through
                your dedicated dashboard.
              </p>
            </div>
          </div>
        </div>

        <p className="brand-footer">
          Building a circular economy, one step at a time.
        </p>
      </section>

      {/* LOGIN FORM */}

      <section className="auth-form-panel">
        <div className="mobile-brand-logo">
          <Leaf size={25} />

          <span>
            Green<span className="brand-highlight">Loop</span>
          </span>
        </div>

        <div className="auth-form-container">
          <div className="auth-heading">
            <span className="welcome-label">
              WELCOME BACK
            </span>

            <h2>Sign in to Green Loop</h2>

            <p>
              Enter your account details to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="login-email">
                Email address
              </label>

              <input
                id="login-email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="login-password">
                Password
              </label>

              <div className="password-wrapper">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="auth-submit-button"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}

              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account?{" "}
            <Link to="/signup">Create an account</Link>
          </p>

          <div className="auth-security-note">
            <Leaf size={15} />

            Your sustainable journey continues here.
          </div>
        </div>
      </section>
    </main>
  );
}

export default Login;