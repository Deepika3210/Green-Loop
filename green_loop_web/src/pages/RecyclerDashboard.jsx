import { useCallback, useEffect, useState } from "react";

import {
  Recycle,
  LayoutDashboard,
  Package,
  History,
  UserRound,
  LogOut,
  Menu,
  X,
  Leaf,
  Clock,
  CheckCircle,
  Truck,
  RefreshCw,
  AlertCircle,
  Weight,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import "../styles/RecyclerDashboard.css";

const API_BASE = "http://localhost:5000";

export default function RecyclerDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState("Overview");
  const [menuOpen, setMenuOpen] = useState(false);

  const [collectedRecords, setCollectedRecords] = useState([]);
  const [recycledRecords, setRecycledRecords] = useState([]);

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
      const parsedUser = JSON.parse(storedUser);

      if (parsedUser.role !== "recycler") {
        const roleRoutes = {
          user: "/dashboard",
          collection_center: "/collection-center",
          manufacturer: "/manufacturer",
        };

        navigate(roleRoutes[parsedUser.role] || "/login", {
          replace: true,
        });

        return;
      }

      setUser(parsedUser);
    } catch {
      localStorage.removeItem("greenLoopUser");
      localStorage.removeItem("greenLoopToken");

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
  // LOAD RECYCLER DATA
  // --------------------------------------------------

  const loadRecords = useCallback(async () => {
    if (user?.role !== "recycler") return;

    setLoading(true);
    setError("");

    try {
      const [collectedData, recycledData] = await Promise.all([
        apiRequest("/recycler/waste"),
        apiRequest("/recycler/history"),
      ]);

      setCollectedRecords(collectedData.records || []);
      setRecycledRecords(recycledData.records || []);
    } catch (err) {
      setError(err.message || "Unable to load recycler records.");
    } finally {
      setLoading(false);
    }
  }, [apiRequest, user]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // --------------------------------------------------
  // MARK WASTE AS RECYCLED
  // --------------------------------------------------

  async function markRecycled(record) {
    if (!record?._id) return;

    const confirmed = window.confirm(
      "Confirm that this waste has completed recycling?"
    );

    if (!confirmed) return;

    setProcessingId(record._id);
    setError("");
    setSuccess("");

    try {
      const result = await apiRequest(
        `/recycler/waste/${record._id}/recycle`,
        {
          method: "PATCH",
        }
      );

      setSuccess(
        result.message || "Recycling operation recorded successfully."
      );

      await loadRecords();
    } catch (err) {
      setError(err.message || "Unable to record recycling.");
    } finally {
      setProcessingId(null);
    }
  }

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

  function handleLogout() {
    localStorage.removeItem("greenLoopToken");
    localStorage.removeItem("greenLoopUser");

    navigate("/login", { replace: true });
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
      <div className="recycler-table-wrapper">
        <table className="recycler-data-table">
          <thead>
            <tr>
              <th>Brand / Product</th>
              <th>Quantity</th>
              <th>Weight</th>
              <th>AI Category</th>
              <th>Collection Centre</th>
              <th>Status</th>
              <th>Collected At</th>
              {showAction && <th>Action</th>}
            </tr>
          </thead>

          <tbody>
            {records.length === 0 ? (
              <tr>
                <td
                  colSpan={showAction ? 8 : 7}
                  className="recycler-table-empty"
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

                  <td>{record.quantity}</td>

                  <td>{formatWeight(record.total_weight)}</td>

                  <td>
                    {record.ai_verification?.predicted_category || "—"}
                  </td>

                  <td>
                    {record.collection_center_id?.name || "—"}
                  </td>

                  <td>
                    <span
                      className={`recycler-status-badge ${String(
                        record.status || "Collected"
                      ).toLowerCase()}`}
                    >
                      {record.status || "Collected"}
                    </span>
                  </td>

                  <td>{formatDate(record.collected_at)}</td>

                  {showAction && (
                    <td>
                      <button
                        className="recycler-process-button"
                        disabled={processingId === record._id}
                        onClick={() => markRecycled(record)}
                      >
                        {processingId === record._id ? (
                          "Saving..."
                        ) : (
                          <>
                            <CheckCircle size={15} />
                            Mark Recycled
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
  // NAVIGATION
  // --------------------------------------------------

  const menuItems = [
    { name: "Overview", icon: LayoutDashboard },
    { name: "Recycling Inventory", icon: Package },
    { name: "Processing History", icon: History },
    { name: "Profile", icon: UserRound },
  ];

  function navigateSection(section) {
    setActiveSection(section);
    setMenuOpen(false);
  }

  // --------------------------------------------------
  // INVENTORY
  // --------------------------------------------------

  function renderInventory() {
    return (
      <section className="recycler-panel">
        <div className="recycler-panel-heading">
          <div>
            <h2>Recycling Inventory</h2>

            <p>
              Collected waste available for recycling operations.
            </p>
          </div>

          <Package size={28} />
        </div>

        {renderWasteTable(collectedRecords, true)}
      </section>
    );
  }

  // --------------------------------------------------
  // PROCESSING HISTORY
  // --------------------------------------------------

  function renderHistory() {
    return (
      <section className="recycler-panel">
        <div className="recycler-panel-heading">
          <div>
            <h2>Processing History</h2>

            <p>
              Waste records marked as recycled by the backend.
            </p>
          </div>

          <History size={28} />
        </div>

        {renderWasteTable(recycledRecords)}
      </section>
    );
  }

  // --------------------------------------------------
  // PROFILE
  // --------------------------------------------------

  function renderProfile() {
    return (
      <section className="recycler-panel">
        <h2>Recycler Profile</h2>

        <div className="recycler-profile">
          <div className="recycler-avatar">
            <Recycle size={32} />
          </div>

          <div>
            <h3>{user?.name || "Recycler"}</h3>

            <p>{user?.email}</p>

            <span className="recycler-role">Recycler Account</span>
          </div>
        </div>

        <div className="recycler-details">
          <div>
            <span>Account Name</span>
            <strong>{user?.name || "—"}</strong>
          </div>

          <div>
            <span>Email Address</span>
            <strong>{user?.email || "—"}</strong>
          </div>

          <div>
            <span>Account Role</span>
            <strong>Recycler</strong>
          </div>

          <div>
            <span>Account Status</span>
            <strong>{user?.accountStatus || "active"}</strong>
          </div>
        </div>
      </section>
    );
  }

  // --------------------------------------------------
  // OVERVIEW
  // --------------------------------------------------

  function renderOverview() {
    return (
      <>
        <section className="recycler-welcome">
          <div>
            <span className="recycler-eyebrow">
              GREEN LOOP · RECYCLER PORTAL
            </span>

            <h2>Welcome, {user?.name || "Recycler"}!</h2>

            <p>
              Manage received waste, record completed recycling,
              and track processing activity.
            </p>
          </div>

          <div className="recycler-welcome-icon">
            <Recycle size={54} />
          </div>
        </section>

        <section className="recycler-stats">
          <article className="recycler-stat-card">
            <div className="recycler-stat-icon">
              <Package size={23} />
            </div>

            <span>Materials Received</span>

            <h3>{collectedRecords.length}</h3>

            <p>Awaiting recycling</p>
          </article>

          <article className="recycler-stat-card">
            <div className="recycler-stat-icon">
              <Recycle size={23} />
            </div>

            <span>Materials Recycled</span>

            <h3>{recycledRecords.length}</h3>

            <p>Recorded completed operations</p>
          </article>

          <article className="recycler-stat-card">
            <div className="recycler-stat-icon">
              <Clock size={23} />
            </div>

            <span>Pending Weight</span>

            <h3>{formatWeight(totalWeight(collectedRecords))}</h3>

            <p>Awaiting recycling</p>
          </article>

          <article className="recycler-stat-card">
            <div className="recycler-stat-icon">
              <CheckCircle size={23} />
            </div>

            <span>Recycled Weight</span>

            <h3>{formatWeight(totalWeight(recycledRecords))}</h3>

            <p>Recorded as recycled</p>
          </article>
        </section>

        <section className="recycler-panel">
          <div className="recycler-panel-heading">
            <div>
              <h2>Recycler Operations</h2>

              <p>Manage recycling activities.</p>
            </div>

            <Truck size={28} />
          </div>

          <div className="recycler-operation-grid">
            <button
              className="recycler-operation"
              onClick={() => navigateSection("Recycling Inventory")}
            >
              <Package size={27} />

              <h3>Recycling Inventory</h3>

              <p>
                View collected materials and record recycling.
              </p>
            </button>

            <button
              className="recycler-operation"
              onClick={() => navigateSection("Processing History")}
            >
              <History size={27} />

              <h3>Processing History</h3>

              <p>Review completed recycling operations.</p>
            </button>
          </div>
        </section>

        <section className="recycler-notice">
          <Leaf size={22} />

          <div>
            <strong>Responsible Recycling</strong>

            <p>
              The EPR dashboard uses records marked Recycled.
              Only record this status when the recycling operation
              has actually been completed.
            </p>
          </div>
        </section>
      </>
    );
  }

  // --------------------------------------------------
  // CONTENT
  // --------------------------------------------------

  function renderContent() {
    switch (activeSection) {
      case "Recycling Inventory":
        return renderInventory();

      case "Processing History":
        return renderHistory();

      case "Profile":
        return renderProfile();

      default:
        return renderOverview();
    }
  }

  if (!user || user.role !== "recycler") {
    return null;
  }

  // --------------------------------------------------
  // PAGE LAYOUT
  // --------------------------------------------------

  return (
    <div className="recycler-layout">
      {menuOpen && (
        <button
          className="recycler-overlay"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside className={`recycler-sidebar ${menuOpen ? "open" : ""}`}>
        <div className="recycler-brand">
          <div className="recycler-brand-icon">
            <Recycle size={27} />
          </div>

          <div>
            <h1>Green Loop</h1>
            <span>Recycler Portal</span>
          </div>

          <button
            className="recycler-close-menu"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        <div className="recycler-sidebar-label">WORKSPACE</div>

        <nav className="recycler-navigation">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={
                  activeSection === item.name
                    ? "recycler-nav-item active"
                    : "recycler-nav-item"
                }
                onClick={() => navigateSection(item.name)}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="recycler-sidebar-bottom">
          <div className="recycler-account">
            <div className="recycler-account-avatar">
              <Recycle size={21} />
            </div>

            <div>
              <strong>{user.name}</strong>
              <span>Recycler</span>
            </div>
          </div>

          <button className="recycler-logout" onClick={handleLogout}>
            <LogOut size={19} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="recycler-main">
        <header className="recycler-topbar">
          <button
            className="recycler-menu-button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>

          <div>
            <span>Green Loop /</span>
            <strong>{activeSection}</strong>
          </div>

          <div className="recycler-topbar-user">
            <div className="recycler-topbar-avatar">
              <UserRound size={20} />
            </div>

            <div>
              <strong>{user.name}</strong>
              <span>Recycler</span>
            </div>
          </div>
        </header>

        <div className="recycler-content">
          {error && (
            <div className="recycler-message error">
              <AlertCircle size={19} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="recycler-message success">
              <CheckCircle size={19} />
              <span>{success}</span>
            </div>
          )}

          <div className="recycler-toolbar">
            <span>
              {loading ? "Loading recycling data..." : "Recycling records"}
            </span>

            <button
              className="recycler-refresh-button"
              onClick={loadRecords}
              disabled={loading}
            >
              <RefreshCw size={16} />
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {renderContent()}
        </div>
      </main>
    </div>
  );
}