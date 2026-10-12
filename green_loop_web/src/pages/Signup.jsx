import { useState } from "react";

import {
  Leaf,
  Eye,
  EyeOff,
  ArrowRight,
  User,
  Building2,
  Recycle,
  Factory,
  Check,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";

import "../styles/Auth.css";

const API_URL = "http://localhost:5000";

const roles = [
  {
    value: "user",
    label: "Individual User",
    description: "Recycle waste and earn rewards",
    icon: User,
  },
  {
    value: "collection_center",
    label: "Collection Centre",
    description: "Manage waste collection",
    icon: Building2,
  },
  {
    value: "recycler",
    label: "Recycler",
    description: "Process and recycle materials",
    icon: Recycle,
  },
  {
    value: "manufacturer",
    label: "Manufacturer",
    description: "Monitor recycling and EPR",
    icon: Factory,
  },
];

function Signup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isBusinessRole = formData.role !== "user";

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleRoleSelect(role) {
    setFormData((previous) => ({
      ...previous,
      role,
    }));

    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError("Please complete all the required fields.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Your password must contain at least 6 characters.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          role: formData.role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        /*
         * The current backend rejects public registration
         * for business roles. It does not save a business
         * registration request yet.
         */
        if (isBusinessRole && response.status === 403) {
          setSuccess(
            "Business accounts require administrator approval. " +
              "Your registration request has not been submitted yet."
          );

          return;
        }

        throw new Error(
          data.message || "Unable to create your account."
        );
      }

      if (!data.user || !data.token) {
        throw new Error(
          "The server response is incomplete. Please try again."
        );
      }

      localStorage.setItem("greenLoopToken", data.token);

      localStorage.setItem(
        "greenLoopUser",
        JSON.stringify(data.user)
      );

      setSuccess("Your account has been created successfully!");

      setTimeout(() => {
        navigate("/dashboard");
      }, 800);
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to Green Loop. Please try again."
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
            <Recycle size={15} />
            JOIN THE GREEN MOVEMENT
          </span>

          <h1>
            Be part of a
            <br />
            <span>greener tomorrow.</span>
          </h1>

          <p>
            Join Green Loop to help build a smarter recycling
            ecosystem connecting people, collection centres,
            recyclers and manufacturers.
          </p>

          <div className="impact-card">
            <div className="impact-icon">
              <Leaf size={25} />
            </div>

            <div>
              <h3>Every action matters.</h3>

              <p>
                Together, we can improve waste recovery,
                transparency and sustainability.
              </p>
            </div>
          </div>
        </div>

        <p className="brand-footer">
          Building a circular economy, one step at a time.
        </p>
      </section>

      {/* RIGHT SIGNUP PANEL */}

      <section className="auth-form-panel">
        <div className="mobile-brand-logo">
          <Leaf size={25} />

          <span>
            Green<span className="brand-highlight">Loop</span>
          </span>
        </div>

        <div className="auth-form-container signup-container">
          <div className="auth-heading">
            <span className="welcome-label">GET STARTED</span>

            <h2>Create your account</h2>

            <p>
              Choose your role and enter your details.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* ROLE SELECTION */}

            <div className="form-field">
              <label>Register as</label>

              <div className="role-grid">
                {roles.map((role) => {
                  const RoleIcon = role.icon;

                  const selected =
                    formData.role === role.value;

                  return (
                    <button
                      key={role.value}
                      type="button"
                      className={`role-option ${
                        selected ? "selected" : ""
                      }`}
                      onClick={() =>
                        handleRoleSelect(role.value)
                      }
                      aria-pressed={selected}
                    >
                      <span className="role-icon">
                        <RoleIcon size={22} />
                      </span>

                      <span className="role-label">
                        {role.label}
                      </span>

                      <span className="role-description">
                        {role.description}
                      </span>

                      {selected && (
                        <span className="role-check">
                          <Check size={13} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* BUSINESS APPROVAL NOTICE */}

            {isBusinessRole && (
              <div className="role-notice">
                <strong>
                  Business account approval required
                </strong>

                <p>
                  {formData.role === "collection_center" &&
                    "Collection Centre accounts must be reviewed and approved before accessing collection management features."}

                  {formData.role === "recycler" &&
                    "Recycler accounts must be reviewed and approved before accessing recycling operations."}

                  {formData.role === "manufacturer" &&
                    "Manufacturer accounts must be reviewed and approved before accessing EPR and manufacturing dashboards."}
                </p>
              </div>
            )}

            {/* NAME */}

            <div className="form-field">
              <label htmlFor="signup-name">
                {isBusinessRole
                  ? "Contact person name"
                  : "Full name"}
              </label>

              <input
                id="signup-name"
                type="text"
                name="name"
                placeholder="Enter your name"
                value={formData.name}
                onChange={handleChange}
                autoComplete="name"
                required
              />
            </div>

            {/* EMAIL */}

            <div className="form-field">
              <label htmlFor="signup-email">
                Email address
              </label>

              <input
                id="signup-email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>

            {/* PASSWORD */}

            <div className="form-field">
              <label htmlFor="signup-password">
                Password
              </label>

              <div className="password-wrapper">
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  minLength={6}
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

            {/* CONFIRM PASSWORD */}

            <div className="form-field">
              <label htmlFor="signup-confirm-password">
                Confirm password
              </label>

              <div className="password-wrapper">
                <input
                  id="signup-confirm-password"
                  type={
                    showConfirmPassword ? "text" : "password"
                  }
                  name="confirmPassword"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowConfirmPassword(
                      (previous) => !previous
                    )
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            {/* FEEDBACK */}

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            {success && (
              <div className="auth-success" role="status">
                {success}
              </div>
            )}

            {/* SUBMIT */}

            <button
              type="submit"
              className="auth-submit-button"
              disabled={loading}
            >
              {loading
                ? "Processing..."
                : isBusinessRole
                  ? "Continue to Registration"
                  : "Create Account"}

              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{" "}
            <Link to="/login">Sign in</Link>
          </p>

          <div className="auth-security-note">
            <Leaf size={15} />

            Your journey towards sustainable living starts here.
          </div>
        </div>
      </section>
    </main>
  );
}

export default Signup;