import { useCallback, useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";
import "../styles/CollectionCenterDashboard.css";
import {
  Leaf,
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  History,
  UserRound,
  LogOut,
  Recycle,
  Menu,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  Truck,
  RefreshCw,
  Weight,
} from "lucide-react";


const API_BASE = "http://localhost:5000";

export default function CollectionCenterDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("greenLoopUser")) || {};
    } catch {
      return {};
    }
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");

  const [pendingRecords, setPendingRecords] = useState([]);
  const [collectedRecords, setCollectedRecords] = useState([]);

  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // --------------------------------------------------
  // AUTHENTICATION
  // --------------------------------------------------

  useEffect(() => {
    const token = localStorage.getItem("greenLoopToken");
    const storedUser = localStorage.getItem("greenLoopUser");

    if (!token || !storedUser) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      const currentUser = JSON.parse(storedUser);

      if (currentUser.role !== "collection_center") {
        const roleRoutes = {
          user: "/dashboard",
          collection_center: "/collection-center",
          recycler: "/recycler",
          manufacturer: "/manufacturer",
        };

        navigate(roleRoutes[currentUser.role] || "/login", {
          replace: true,
        });

        return;
      }

      setUser(currentUser);
    } catch {
      localStorage.removeItem("greenLoopToken");
      localStorage.removeItem("greenLoopUser");

      navigate("/login", { replace: true });
    }
  }, [navigate]);

  // --------------------------------------------------
  // API HELPER
  // --------------------------------------------------

  const apiRequest = useCallback(
    async (endpoint, options = {}) => {
      const token = localStorage.getItem("greenLoopToken");

      if (!token) {
        throw new Error("Please log in again.");
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          ...(options.body
            ? { "Content-Type": "application/json" }
            : {}),
          ...options.headers,
        },
      });

      let data = {};

      try {
        data = await response.json();
      } catch {
        // Handle empty responses.
      }

      if (response.status === 401) {
        localStorage.removeItem("greenLoopToken");
        localStorage.removeItem("greenLoopUser");

        navigate("/login", { replace: true });

        throw new Error("Your session has expired.");
      }

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || `Request failed (${response.status})`
        );
      }

      return data;
    },
    [navigate]
  );

  // --------------------------------------------------
  // LOAD COLLECTION DATA
  // --------------------------------------------------

  const loadRecords = useCallback(async () => {
    if (user?.role !== "collection_center") {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [pendingData, collectedData] = await Promise.all([
        apiRequest("/collection/waste"),
        apiRequest("/collection/records"),
      ]);

      setPendingRecords(pendingData.records || []);
      setCollectedRecords(collectedData.records || []);
    } catch (err) {
      setError(err.message || "Unable to load collection records.");
    } finally {
      setLoading(false);
    }
  }, [apiRequest, user]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // --------------------------------------------------
  // MARK WASTE COLLECTED
  // --------------------------------------------------

  async function markCollected(record) {
    if (!record?._id) {
      return;
    }

    const confirmed = window.confirm(
      "Confirm that this waste has been collected?"
    );

    if (!confirmed) {
      return;
    }

    setProcessingId(record._id);
    setError("");
    setSuccess("");

    try {
      const result = await apiRequest(
        `/collection/waste/${record._id}/collect`,
        {
          method: "PATCH",
        }
      );

      setSuccess(
        result.message || "Waste collection recorded successfully."
      );

      // Refresh records and statistics.
      await loadRecords();
    } catch (err) {
      setError(err.message || "Unable to record collection.");
    } finally {
      setProcessingId(null);
    }
  }

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

  function logout() {
    localStorage.removeItem("greenLoopToken");
    localStorage.removeItem("greenLoopUser");

    navigate("/login", { replace: true });
  }

  // --------------------------------------------------
  // NAVIGATION
  // --------------------------------------------------

  function goToSection(section) {
    setActiveSection(section);
    setMobileMenuOpen(false);

    document.getElementById(section)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  function formatWeight(value) {
    return `${Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })} kg`;
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function totalWeight(records) {
    return records.reduce(
      (total, record) => total + Number(record.total_weight || 0),
      0
    );
  }

  // --------------------------------------------------
  // WASTE TABLE
  // --------------------------------------------------

  function renderWasteTable(records, showAction = false) {
    return (
      <div className="cc-table-wrapper">
        <table className="cc-data-table">
          <thead>
            <tr>
              <th>Brand / Product</th>
              <th>Customer</th>
              <th>Quantity</th>
              <th>Weight</th>
              <th>AI Category</th>
              <th>Status</th>
              <th>Submitted</th>
              {showAction && <th>Action</th>}
            </tr>
          </thead>

          <tbody>
            {records.length === 0 ? (
              <tr>
                <td
                  colSpan={showAction ? 8 : 7}
                  className="cc-table-empty"
                >
                  No records available.
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record._id}>
                  <td>
                    <strong>
                      {record.product_id?.brand || "Unknown brand"}
                    </strong>

                    <small>
                      {record.product_id?.barcode || "No barcode"}
                    </small>
                  </td>

                  <td>
                    {record.user_id?.name || "Customer"}
                  </td>

                  <td>{record.quantity}</td>

                  <td>{formatWeight(record.total_weight)}</td>

                  <td>
                    {record.ai_verification?.predicted_category || "—"}
                  </td>

                  <td>
                    <span
                      className={`cc-status-badge ${String(
                        record.status || "Pending"
                      ).toLowerCase()}`}
                    >
                      {record.status || "Pending"}
                    </span>
                  </td>

                  <td>{formatDate(record.createdAt)}</td>

                  {showAction && (
                    <td>
                      <button
                        className="cc-collect-button"
                        disabled={processingId === record._id}
                        onClick={() => markCollected(record)}
                      >
                        {processingId === record._id ? (
                          "Saving..."
                        ) : (
                          <>
                            <CheckCircle size={15} />
                            Mark Collected
                          </>
                        )}
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  // --------------------------------------------------
  // DASHBOARD CONTENT
  // --------------------------------------------------

  if (user.role !== "collection_center") {
    return null;
  }

  return (
    <div className="cc-dashboard">
      {mobileMenuOpen && (
        <button
          className="cc-overlay"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close menu"
        />
      )}

      <aside className={`cc-sidebar ${mobileMenuOpen ? "open" : ""}`}>
        <div className="cc-brand">
          <span className="cc-brand-icon">
            <Leaf size={26} />
          </span>

          <div>
            <h2>Green Loop</h2>
            <p>Collection Centre Portal</p>
          </div>

          <button
            className="cc-mobile-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="cc-menu-label">COLLECTION WORKSPACE</div>

        {[
          { id: "overview", label: "Overview", icon: LayoutDashboard },
          { id: "collections", label: "Collection Records", icon: Package },
          { id: "transfers", label: "Waste Transfers", icon: ArrowLeftRight },
          { id: "transfer-history", label: "Transfer History", icon: History },
          { id: "profile", label: "My Profile", icon: UserRound },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              className={`cc-nav-link ${
                activeSection === item.id ? "active" : ""
              }`}
              onClick={() => goToSection(item.id)}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}

        <button className="cc-nav-link" onClick={logout}>
          <LogOut size={19} />
          <span>Logout</span>
        </button>

        <div className="cc-sidebar-card">
          <Recycle size={25} />
          <h4>Building a circular future</h4>
          <p>Manage collections and coordinate waste transfers.</p>
        </div>
      </aside>

      <main className="cc-main">
        <header className="cc-topbar">
          <button
            className="cc-menu-button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          <div className="cc-topbar-title">
            <h1>Collection Centre</h1>
            <p>Manage your collection operations.</p>
          </div>

          <button
            className="cc-user"
            onClick={() => goToSection("profile")}
          >
            <span className="cc-avatar">
              {(user.name || "C").charAt(0).toUpperCase()}
            </span>

            <span>
              <strong>{user.name || "Collection Centre"}</strong>
              <small>Collection Centre Account</small>
            </span>
          </button>
        </header>

        <div className="cc-content">
          {error && (
            <div className="cc-message error">
              <AlertCircle size={19} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="cc-message success">
              <CheckCircle size={19} />
              <span>{success}</span>
            </div>
          )}

          <div className="cc-toolbar">
            <span>
              {loading ? "Loading collection data..." : "Collection records"}
            </span>

            <button
              className="cc-refresh-button"
              onClick={loadRecords}
              disabled={loading}
            >
              <RefreshCw size={16} />
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          <section className="cc-welcome" id="overview">
            <div>
              <span className="cc-welcome-badge">
                <Leaf size={14} /> COLLECTION OPERATIONS
              </span>

              <h2>
                Welcome, {user.name || "Collection Centre"}!
              </h2>

              <p>
                Manage collection activities and coordinate the transfer
                of recyclable materials.
              </p>
            </div>

            <div className="cc-welcome-icon">
              <Package size={62} />
            </div>
          </section>

          <section className="cc-stats-grid">
            <div className="cc-stat-card">
              <span className="cc-stat-icon green">
                <Package size={22} />
              </span>

              <p>Pending Items</p>

              <h3>{pendingRecords.length}</h3>

              <small>Awaiting collection</small>
            </div>

            <div className="cc-stat-card">
              <span className="cc-stat-icon blue">
                <Weight size={22} />
              </span>

              <p>Pending Waste Weight</p>

              <h3>{formatWeight(totalWeight(pendingRecords))}</h3>

              <small>Weight awaiting collection</small>
            </div>

            <div className="cc-stat-card">
              <span className="cc-stat-icon orange">
                <Clock size={22} />
              </span>

              <p>Collected Items</p>

              <h3>{collectedRecords.length}</h3>

              <small>Recorded collection operations</small>
            </div>

            <div className="cc-stat-card">
              <span className="cc-stat-icon purple">
                <CheckCircle size={22} />
              </span>

              <p>Collected Weight</p>

              <h3>{formatWeight(totalWeight(collectedRecords))}</h3>

              <small>Recorded collected waste</small>
            </div>
          </section>

          <section className="cc-panel" id="collections">
            <div className="cc-panel-heading">
              <h2>Pending Collection Records</h2>

              <p>
                Review customer submissions and record completed collections.
              </p>
            </div>

            {renderWasteTable(pendingRecords, true)}
          </section>

          <section className="cc-panel" id="transfers">
            <div className="cc-panel-heading">
              <h2>Waste Transfers</h2>

              <p>
                Collected waste is made available to the recycler workflow.
              </p>
            </div>

            <div className="cc-feature-card">
              <span className="cc-feature-icon">
                <Truck size={27} />
              </span>

              <div>
                <h3>Transfer to Recycler</h3>

                <p>
                  The current backend records collection status. A separate
                  transfer assignment and acceptance workflow is not yet
                  implemented. Recyclers can access records marked Collected.
                </p>
              </div>
            </div>
          </section>

          <section className="cc-panel" id="transfer-history">
            <div className="cc-panel-heading">
              <h2>Collection History</h2>

              <p>Records already marked as collected.</p>
            </div>

            {renderWasteTable(collectedRecords)}
          </section>

          <section className="cc-panel" id="profile">
            <div className="cc-panel-heading">
              <h2>Collection Centre Profile</h2>
              <p>Details for the account currently signed in.</p>
            </div>

            <div className="cc-profile-card">
              <div className="cc-profile-avatar">
                {(user.name || "C").charAt(0).toUpperCase()}
              </div>

              <div className="cc-profile-details">
                <h3>{user.name || "Collection Centre"}</h3>
                <p>{user.email || "Email not available"}</p>
                <span>Role: Collection Centre</span>
                <p>
                  Account ID: {user.id || user._id || "Unavailable"}
                </p>
              </div>

              <button className="cc-logout-button" onClick={logout}>
                <LogOut size={17} />
                Logout
              </button>
            </div>
          </section>

          <footer className="cc-footer">
            <Leaf size={16} />
            Green Loop — Responsible collection for a cleaner future.
          </footer>
        </div>
      </main>
    </div>
  );
}