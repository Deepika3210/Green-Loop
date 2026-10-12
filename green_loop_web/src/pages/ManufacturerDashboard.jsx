import { useCallback, useEffect, useState } from "react";

import {
  LayoutDashboard,
  Building2,
  Recycle,
  BarChart3,
  ShieldCheck,
  UserRound,
  LogOut,
  Menu,
  X,
  Leaf,
  Package,
  ClipboardCheck,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Weight,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import "../styles/ManufacturerDashboard.css";

const API_BASE = "http://localhost:5000";

const EMPTY_DASHBOARD = {
  totalSubmissions: 0,
  submittedWeightKg: 0,
  collectedWeightKg: 0,
  recycledWeightKg: 0,
  pendingWeightKg: 0,
  rejectedWeightKg: 0,
};

export default function ManufacturerDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState("Overview");
  const [menuOpen, setMenuOpen] = useState(false);

  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [brands, setBrands] = useState([]);
  const [records, setRecords] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

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

      if (parsedUser.role !== "manufacturer") {
        const roleRoutes = {
          user: "/dashboard",
          collection_center: "/collection-center",
          recycler: "/recycler",
        };

        navigate(roleRoutes[parsedUser.role] || "/login", {
          replace: true,
        });

        return;
      }

      setUser(parsedUser);
    } catch {
      localStorage.removeItem("greenLoopToken");
      localStorage.removeItem("greenLoopUser");

      navigate("/login", { replace: true });
    }
  }, [navigate]);

  // --------------------------------------------------
  // API HELPER
  // --------------------------------------------------

  const apiRequest = useCallback(async (endpoint) => {
    const token = localStorage.getItem("greenLoopToken");

    if (!token) {
      throw new Error("Your login session has expired. Please log in again.");
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    let data;

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (response.status === 401) {
      localStorage.removeItem("greenLoopToken");
      localStorage.removeItem("greenLoopUser");

      navigate("/login", { replace: true });

      throw new Error("Your login session has expired.");
    }

    if (!response.ok) {
      throw new Error(
        data.message || `Request failed: ${response.status}`
      );
    }

    if (data.success === false) {
      throw new Error(data.message || "Unable to load data.");
    }

    return data;
  }, [navigate]);

  // --------------------------------------------------
  // LOAD EPR DASHBOARD DATA
  // --------------------------------------------------

  const loadDashboardData = useCallback(async () => {
    if (!user || user.role !== "manufacturer") {
      return;
    }

    setLoading(true);
    setApiError("");

    const results = await Promise.allSettled([
      apiRequest("/epr/dashboard"),
      apiRequest("/epr/brands"),
      apiRequest("/epr/records"),
      apiRequest("/products"),
    ]);

    const errors = [];

    // EPR summary
    if (results[0].status === "fulfilled") {
      const data = results[0].value;

      setDashboard({
        ...EMPTY_DASHBOARD,
        ...(data.dashboard || {}),
      });
    } else {
      errors.push(
        `EPR summary: ${results[0].reason.message}`
      );
    }

    // Brand statistics
    if (results[1].status === "fulfilled") {
      setBrands(results[1].value.brands || []);
    } else {
      setBrands([]);
      errors.push(
        `Brand analytics: ${results[1].reason.message}`
      );
    }

    // Compliance records
    if (results[2].status === "fulfilled") {
      setRecords(results[2].value.records || []);
    } else {
      setRecords([]);
      errors.push(
        `Compliance records: ${results[2].reason.message}`
      );
    }

    // Registered products
    if (results[3].status === "fulfilled") {
      const data = results[3].value;

      setProducts(
        Array.isArray(data)
          ? data
          : data.products || []
      );
    } else {
      setProducts([]);
      errors.push(
        `Products: ${results[3].reason.message}`
      );
    }

    setLastUpdated(new Date());

    if (errors.length > 0) {
      setApiError(errors.join(" | "));
    }

    setLoading(false);
  }, [user, apiRequest]);

  useEffect(() => {
    if (user?.role === "manufacturer") {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

  const handleLogout = () => {
    localStorage.removeItem("greenLoopToken");
    localStorage.removeItem("greenLoopUser");

    navigate("/login", { replace: true });
  };

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  const formatWeight = (value) =>
    `${Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })} kg`;

  const formatDate = (date) => {
    if (!date) return "—";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return "—";

    return parsed.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const statusClass = (status) =>
    `manufacturer-status-badge ${String(status || "Pending")
      .toLowerCase()
      .replace(/\s+/g, "-")}`;

  const menuItems = [
    { name: "Overview", icon: LayoutDashboard },
    { name: "EPR Compliance", icon: ShieldCheck },
    { name: "Recycling Analytics", icon: BarChart3 },
    { name: "Brand Performance", icon: TrendingUp },
    { name: "Profile", icon: UserRound },
  ];

  // --------------------------------------------------
  // SUMMARY CARDS
  // --------------------------------------------------

  const renderStats = () => (
    <section className="manufacturer-stats">
      <article className="manufacturer-stat-card">
        <div className="manufacturer-stat-icon">
          <Package size={23} />
        </div>

        <span>Registered Products</span>

        <h3>{products.length}</h3>

        <p>Products available in the catalogue</p>
      </article>

      <article className="manufacturer-stat-card">
        <div className="manufacturer-stat-icon">
          <Weight size={23} />
        </div>

        <span>Waste Submitted</span>

        <h3>{formatWeight(dashboard.submittedWeightKg)}</h3>

        <p>{dashboard.totalSubmissions} submissions</p>
      </article>

      <article className="manufacturer-stat-card">
        <div className="manufacturer-stat-icon">
          <Recycle size={23} />
        </div>

        <span>Waste Recycled</span>

        <h3>{formatWeight(dashboard.recycledWeightKg)}</h3>

        <p>Recorded as recycled</p>
      </article>

      <article className="manufacturer-stat-card">
        <div className="manufacturer-stat-icon">
          <Clock size={23} />
        </div>

        <span>Pending Collection</span>

        <h3>{formatWeight(dashboard.pendingWeightKg)}</h3>

        <p>Awaiting collection</p>
      </article>
    </section>
  );

  // --------------------------------------------------
  // REUSABLE RECORD TABLE
  // --------------------------------------------------

  const renderRecordsTable = (items) => (
    <div className="manufacturer-table-wrapper">
      <table className="manufacturer-data-table">
        <thead>
          <tr>
            <th>Product / Brand</th>
            <th>Quantity</th>
            <th>Weight</th>
            <th>AI Category</th>
            <th>Confidence</th>
            <th>Status</th>
            <th>Submitted</th>
          </tr>
        </thead>

        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan="7" className="manufacturer-table-empty">
                No waste records are available.
              </td>
            </tr>
          ) : (
            items.map((record) => (
              <tr key={record._id}>
                <td>
                  <strong>
                    {record.product_id?.brand || "Unknown brand"}
                  </strong>

                  <small>
                    {record.product_id?.barcode || "No barcode"}
                  </small>
                </td>

                <td>{record.quantity ?? "—"}</td>

                <td>{formatWeight(record.total_weight)}</td>

                <td>
                  {record.ai_verification?.predicted_category || "—"}
                </td>

                <td>
                  {record.ai_verification?.confidence != null
                    ? `${record.ai_verification.confidence}%`
                    : "—"}
                </td>

                <td>
                  <span className={statusClass(record.status)}>
                    {record.status || "Pending"}
                  </span>
                </td>

                <td>{formatDate(record.createdAt)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  // --------------------------------------------------
  // BRAND TABLE
  // --------------------------------------------------

  const renderBrandTable = () => (
    <div className="manufacturer-table-wrapper">
      <table className="manufacturer-data-table">
        <thead>
          <tr>
            <th>Brand</th>
            <th>Submissions</th>
            <th>Submitted</th>
            <th>Collected</th>
            <th>Recycled</th>
            <th>Recycling Progress</th>
          </tr>
        </thead>

        <tbody>
          {brands.length === 0 ? (
            <tr>
              <td colSpan="6" className="manufacturer-table-empty">
                No brand statistics are available.
              </td>
            </tr>
          ) : (
            brands.map((brand) => {
              const submitted = Number(
                brand.submittedWeightKg || 0
              );

              const recycled = Number(
                brand.recycledWeightKg || 0
              );

              const percentage =
                submitted > 0
                  ? Math.min(
                      100,
                      Math.round((recycled / submitted) * 100)
                    )
                  : 0;

              return (
                <tr key={brand.brand}>
                  <td>
                    <strong>{brand.brand || "Unknown"}</strong>
                  </td>

                  <td>{brand.submissions || 0}</td>

                  <td>{formatWeight(submitted)}</td>

                  <td>{formatWeight(brand.collectedWeightKg)}</td>

                  <td>{formatWeight(recycled)}</td>

                  <td>
                    <div className="manufacturer-progress">
                      <div className="manufacturer-progress-track">
                        <div
                          className="manufacturer-progress-fill"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>

                      <span>{percentage}%</span>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  // --------------------------------------------------
  // EPR COMPLIANCE SECTION
  // --------------------------------------------------

  const renderEPRCompliance = () => (
    <section className="manufacturer-panel">
      <div className="manufacturer-panel-heading">
        <div>
          <h2>EPR Compliance Dashboard</h2>

          <p>
            Monitor submitted waste, collection progress and
            recorded recycling activity.
          </p>
        </div>

        <ShieldCheck size={30} />
      </div>

      {renderStats()}

      <div className="manufacturer-info">
        <h3>Recycling Progress</h3>

        <p>
          Recorded recycling progress:
          {" "}
          <strong>
            {dashboard.submittedWeightKg > 0
              ? Math.min(
                  100,
                  (
                    (dashboard.recycledWeightKg /
                      dashboard.submittedWeightKg) *
                    100
                  )
                ).toFixed(1)
              : "0.0"}
            %
          </strong>
          {" "}
          of submitted waste weight.
        </p>

        <div className="manufacturer-progress-track">
          <div
            className="manufacturer-progress-fill"
            style={{
              width: `${
                dashboard.submittedWeightKg > 0
                  ? Math.min(
                      100,
                      (dashboard.recycledWeightKg /
                        dashboard.submittedWeightKg) *
                        100
                    )
                  : 0
              }%`,
            }}
          />
        </div>

        <p className="manufacturer-muted">
          This is an operational recycling ratio, not a legal EPR
          compliance percentage. An applicable regulatory target
          is required to calculate legal compliance.
        </p>
      </div>

      <div className="manufacturer-info">
        <h3>Waste Compliance Records</h3>

        <p>
          Review waste submissions and their current processing status.
        </p>

        {renderRecordsTable(records)}
      </div>
    </section>
  );

  // --------------------------------------------------
  // RECYCLING ANALYTICS SECTION
  // --------------------------------------------------

  const renderAnalytics = () => (
    <section className="manufacturer-panel">
      <div className="manufacturer-panel-heading">
        <div>
          <h2>Recycling Analytics</h2>

          <p>
            Review submitted, collected and recycled quantities.
          </p>
        </div>

        <BarChart3 size={30} />
      </div>

      {renderStats()}

      <div className="manufacturer-info">
        <h3>Waste Processing Overview</h3>

        <div className="manufacturer-analytics-grid">
          <article>
            <Package size={24} />

            <span>Submitted</span>

            <strong>
              {formatWeight(dashboard.submittedWeightKg)}
            </strong>
          </article>

          <article>
            <ClipboardCheck size={24} />

            <span>Collected</span>

            <strong>
              {formatWeight(dashboard.collectedWeightKg)}
            </strong>
          </article>

          <article>
            <Recycle size={24} />

            <span>Recycled</span>

            <strong>
              {formatWeight(dashboard.recycledWeightKg)}
            </strong>
          </article>

          <article>
            <Clock size={24} />

            <span>Pending</span>

            <strong>
              {formatWeight(dashboard.pendingWeightKg)}
            </strong>
          </article>
        </div>
      </div>

      <div className="manufacturer-info">
        <h3>Latest Waste Records</h3>

        {renderRecordsTable(records.slice(0, 10))}
      </div>
    </section>
  );

  // --------------------------------------------------
  // BRAND PERFORMANCE SECTION
  // --------------------------------------------------

  const renderBrandPerformance = () => (
    <section className="manufacturer-panel">
      <div className="manufacturer-panel-heading">
        <div>
          <h2>Brand Performance</h2>

          <p>
            Compare recycling activity across product brands.
          </p>
        </div>

        <TrendingUp size={30} />
      </div>

      {renderBrandTable()}

      <div className="manufacturer-info">
        <h3>How performance is calculated</h3>

        <p>
          Recycling progress is calculated as recorded recycled
          weight divided by submitted weight. It is not a substitute
          for an applicable regulatory EPR target.
        </p>
      </div>
    </section>
  );

  // --------------------------------------------------
  // PROFILE SECTION
  // --------------------------------------------------

  const renderProfile = () => (
    <section className="manufacturer-panel">
      <h2>Manufacturer Profile</h2>

      <div className="manufacturer-profile">
        <div className="manufacturer-avatar">
          <Building2 size={32} />
        </div>

        <div>
          <h3>{user?.name}</h3>

          <p>{user?.email}</p>

          <span className="manufacturer-badge">
            Manufacturer Account
          </span>
        </div>
      </div>

      <div className="manufacturer-details">
        <div>
          <span>Organization</span>

          <strong>{user?.name || "—"}</strong>
        </div>

        <div>
          <span>Email Address</span>

          <strong>{user?.email || "—"}</strong>
        </div>

        <div>
          <span>Account Role</span>

          <strong>Manufacturer</strong>
        </div>

        <div>
          <span>Account Status</span>

          <strong>{user?.accountStatus || "active"}</strong>
        </div>
      </div>
    </section>
  );

  // --------------------------------------------------
  // OVERVIEW SECTION
  // --------------------------------------------------

  const renderOverview = () => (
    <>
      <section className="manufacturer-welcome">
        <div>
          <span className="manufacturer-eyebrow">
            GREEN LOOP · MANUFACTURER PORTAL
          </span>

          <h2>Welcome, {user?.name || "Manufacturer"}!</h2>

          <p>
            Monitor recycling activity, review brand performance
            and track operational EPR indicators.
          </p>
        </div>

        <div className="manufacturer-welcome-icon">
          <Building2 size={54} />
        </div>
      </section>

      {renderStats()}

      <section className="manufacturer-panel">
        <h2>Manufacturer Workspace</h2>

        <p>
          View compliance information and recycling performance.
        </p>

        <div className="manufacturer-operation-grid">
          <button
            className="manufacturer-operation"
            onClick={() => setActiveSection("EPR Compliance")}
          >
            <ShieldCheck size={28} />

            <h3>EPR Compliance</h3>

            <p>Review waste records and recycling progress.</p>
          </button>

          <button
            className="manufacturer-operation"
            onClick={() => setActiveSection("Recycling Analytics")}
          >
            <BarChart3 size={28} />

            <h3>Recycling Analytics</h3>

            <p>View submitted, collected and recycled quantities.</p>
          </button>

          <button
            className="manufacturer-operation"
            onClick={() => setActiveSection("Brand Performance")}
          >
            <TrendingUp size={28} />

            <h3>Brand Performance</h3>

            <p>Compare recycling statistics across brands.</p>
          </button>
        </div>
      </section>

      <section className="manufacturer-notice">
        <Leaf size={23} />

        <div>
          <strong>Sustainability Monitoring</strong>

          <p>
            Recycling figures are calculated from waste records
            available through the Green Loop backend.
          </p>
        </div>
      </section>

      <section className="manufacturer-panel">
        <h2>Recent Waste Activity</h2>

        {renderRecordsTable(records.slice(0, 5))}
      </section>
    </>
  );

  // --------------------------------------------------
  // MAIN CONTENT ROUTER
  // --------------------------------------------------

  const renderContent = () => {
    switch (activeSection) {
      case "EPR Compliance":
        return renderEPRCompliance();

      case "Recycling Analytics":
        return renderAnalytics();

      case "Brand Performance":
        return renderBrandPerformance();

      case "Profile":
        return renderProfile();

      default:
        return renderOverview();
    }
  };

  if (!user || user.role !== "manufacturer") {
    return null;
  }

  // --------------------------------------------------
  // PAGE LAYOUT
  // --------------------------------------------------

  return (
    <div className="manufacturer-layout">
      {menuOpen && (
        <button
          className="manufacturer-overlay"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`manufacturer-sidebar ${
          menuOpen ? "open" : ""
        }`}
      >
        <div className="manufacturer-brand">
          <div className="manufacturer-brand-icon">
            <Recycle size={27} />
          </div>

          <div>
            <h1>Green Loop</h1>

            <span>Manufacturer Portal</span>
          </div>

          <button
            className="manufacturer-close-menu"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        <div className="manufacturer-sidebar-label">
          WORKSPACE
        </div>

        <nav className="manufacturer-navigation">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={
                  activeSection === item.name
                    ? "manufacturer-nav-item active"
                    : "manufacturer-nav-item"
                }
                onClick={() => {
                  setActiveSection(item.name);
                  setMenuOpen(false);
                }}
              >
                <Icon size={20} />

                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="manufacturer-sidebar-bottom">
          <div className="manufacturer-account">
            <div className="manufacturer-account-avatar">
              <Building2 size={21} />
            </div>

            <div>
              <strong>{user.name}</strong>

              <span>Manufacturer</span>
            </div>
          </div>

          <button
            className="manufacturer-logout"
            onClick={handleLogout}
          >
            <LogOut size={19} />

            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="manufacturer-main">
        <header className="manufacturer-topbar">
          <button
            className="manufacturer-menu-button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>

          <div className="manufacturer-breadcrumb">
            <span>Green Loop /</span>

            <strong>{activeSection}</strong>
          </div>

          <div className="manufacturer-topbar-user">
            <div className="manufacturer-topbar-avatar">
              <UserRound size={20} />
            </div>

            <div>
              <strong>{user.name}</strong>

              <span>Manufacturer</span>
            </div>
          </div>
        </header>

        <div className="manufacturer-content">
          <div className="manufacturer-data-toolbar">
            <div>
              {lastUpdated && (
                <span>
                  Updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>

            <button
              className="manufacturer-refresh-button"
              onClick={loadDashboardData}
              disabled={loading}
            >
              <RefreshCw
                size={16}
                className={loading ? "manufacturer-spinning" : ""}
              />

              {loading ? "Loading..." : "Refresh Data"}
            </button>
          </div>

          {apiError && (
            <div className="manufacturer-api-error">
              <AlertCircle size={20} />

              <div>
                <strong>Some dashboard data could not be loaded.</strong>

                <p>{apiError}</p>
              </div>
            </div>
          )}

          {!apiError && !loading && (
            <div className="manufacturer-api-success">
              <CheckCircle2 size={17} />

              <span>Dashboard data loaded successfully.</span>
            </div>
          )}

          {renderContent()}
        </div>
      </main>
    </div>
  );
}