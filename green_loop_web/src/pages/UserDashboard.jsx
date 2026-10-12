import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Leaf,
  Camera,
  X,
  Recycle,
  Award,
  Package,
  History,
  LogOut,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  UserRound,
  Menu,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/UserDashboard.css";

const API_URL = "http://localhost:5000";

export default function UserDashboard() {
  const navigate = useNavigate();

  const scannerRef = useRef(null);
  const scannerStartingRef = useRef(false);
  const scanHandledRef = useRef(false);

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("greenLoopUser")) || {};
    } catch {
      return {};
    }
  });

  const [history, setHistory] = useState([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // AI verification states
  const [wasteImage, setWasteImage] = useState(null);
  const [verification, setVerification] = useState(null);
  const [verifyingImage, setVerifyingImage] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeSection, setActiveSection] = useState("recycling");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userId = user.id || user._id;

  const headers = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${
      localStorage.getItem("greenLoopToken") || ""
    }`,
  });

  async function requestJson(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message || `Request failed (${response.status})`
      );
    }

    return data;
  }

  // Load user profile and recycling history
  async function loadDashboard() {
    if (!userId) {
      navigate("/login", { replace: true });
      return;
    }

    setLoading(true);

    try {
      const [userData, historyData] = await Promise.all([
        requestJson(`${API_URL}/user/${userId}`, {
          headers: headers(),
        }),

        requestJson(`${API_URL}/history/${userId}`, {
          headers: headers(),
        }),
      ]);

      const updatedUser = userData.user || userData;

      setUser((previous) => {
        const next = { ...previous, ...updatedUser };

        localStorage.setItem(
          "greenLoopUser",
          JSON.stringify(next)
        );

        return next;
      });

      setHistory(
        Array.isArray(historyData)
          ? historyData
          : historyData.history || []
      );
    } catch (err) {
      setError(
        err.message ||
          "Could not load your recycling information."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Stop camera when the dashboard is removed
  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;

      if (scanner?.isScanning) {
        scanner
          .stop()
          .catch(() => {})
          .finally(() => {
            scanner.clear().catch(() => {});
          });
      }
    };
  }, []);

  // Stop barcode scanner
  async function stopScanner() {
    const scanner = scannerRef.current;

    scannerStartingRef.current = false;
    setScanning(false);

    if (!scanner) return;

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch (err) {
      console.debug("Camera already stopped.", err);
    }

    try {
      scanner.clear();
    } catch (err) {
      console.debug("Scanner cleanup completed.", err);
    }

    scannerRef.current = null;
  }

  async function closeScanner() {
    await stopScanner();
    setScannerOpen(false);
  }

  // Identify product using its barcode
  async function identifyBarcode(barcode) {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const data = await requestJson(
        `${API_URL}/scan-product`,
        {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ barcode }),
        }
      );

      if (!data.product) {
        throw new Error(
          "The backend did not return product details."
        );
      }

      if (!data.scanToken) {
        throw new Error(
          "The backend did not return a scan reference. " +
            "Check that your updated backend is running."
        );
      }

      setProduct({
        ...data.product,
        _scanToken: data.scanToken,
        _scanExpiresAt: data.expiresAt,
        _scannedBarcode: barcode,
      });

      setQuantity(1);
      setWasteImage(null);
      setVerification(null);

      setSuccess(
        "Product identified successfully. Upload a clear " +
          "image of the waste for AI verification."
      );
    } catch (err) {
      setError(
        err.message || "Could not identify this product."
      );
    } finally {
      setLoading(false);
    }
  }

  // Open camera and scan barcode
  async function startScanner() {
    if (scannerStartingRef.current) return;

    setError("");
    setSuccess("");
    setProduct(null);
    setWasteImage(null);
    setVerification(null);
    setScannerOpen(true);
    setScanning(false);

    scannerStartingRef.current = true;
    scanHandledRef.current = false;

    await new Promise((resolve) => setTimeout(resolve, 150));

    if (!scannerStartingRef.current) return;

    let scanner;

    try {
      scanner = new Html5Qrcode("green-loop-scanner");
      scannerRef.current = scanner;

      const cameras = await Html5Qrcode.getCameras();

      if (!scannerStartingRef.current) {
        scanner.clear();
        scannerRef.current = null;
        return;
      }

      if (!cameras || cameras.length === 0) {
        throw new Error(
          "No camera was found. Connect a camera or check " +
            "your device settings."
        );
      }

      const backCamera = cameras.find((camera) =>
        /back|rear|environment|facing back/i.test(
          camera.label
        )
      );

      const cameraId =
        backCamera?.id || cameras[cameras.length - 1].id;

      await scanner.start(
        cameraId,
        {
          fps: 10,

          qrbox: (viewWidth, viewHeight) => ({
            width: Math.min(
              320,
              Math.floor(viewWidth * 0.85)
            ),
            height: Math.min(
              150,
              Math.floor(viewHeight * 0.65)
            ),
          }),

          aspectRatio: 1.5,
          disableFlip: false,
        },

        async (decodedText) => {
          if (scanHandledRef.current) return;

          scanHandledRef.current = true;
          scannerStartingRef.current = false;

          const barcode = String(decodedText).trim();

          await stopScanner();
          setScannerOpen(false);

          await identifyBarcode(barcode);
        },

        () => {
          // Continue scanning if a barcode is not found.
        }
      );

      setScanning(true);
    } catch (err) {
      console.error("Camera initialization error:", err);

      scannerStartingRef.current = false;

      try {
        if (scanner?.isScanning) {
          await scanner.stop();
        }
      } catch {
        // Ignore camera cleanup errors.
      }

      try {
        scanner?.clear();
      } catch {
        // Ignore cleanup errors.
      }

      scannerRef.current = null;
      setScanning(false);
      setScannerOpen(false);

      setError(
        err.message ||
          "Unable to open the camera. Check browser camera " +
            "permissions and try again."
      );
    }
  }

  // AI IMAGE VERIFICATION
  async function verifyWasteImage() {
    setError("");
    setSuccess("");

    if (!product?._scanToken) {
      setError("Scan a registered product first.");
      return;
    }

    if (!wasteImage) {
      setError(
        "Choose or take a photo of the waste before verifying."
      );
      return;
    }

    if (
      wasteImage.size > 10 * 1024 * 1024
    ) {
      setError("Image size must not exceed 10 MB.");
      return;
    }

    if (
      product._scanExpiresAt &&
      new Date(product._scanExpiresAt).getTime() <=
        Date.now()
    ) {
      setProduct(null);
      setWasteImage(null);
      setVerification(null);

      setError(
        "Your scan has expired. Please scan the product again."
      );

      return;
    }

    setVerifyingImage(true);
    setVerification(null);

    try {
      const formData = new FormData();

      formData.append("file", wasteImage);
      formData.append(
        "scanToken",
        product._scanToken
      );

      const response = await fetch(
        `${API_URL}/verify-waste-image`,
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${
              localStorage.getItem("greenLoopToken") || ""
            }`,
          },

          // Do not set Content-Type manually for FormData.
          // The browser adds the multipart boundary.
          body: formData,
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            `AI verification failed (${response.status}).`
        );
      }

      if (
        !data.verificationId ||
        typeof data.eligible !== "boolean"
      ) {
        throw new Error(
          "The AI API response is missing verificationId " +
            "or eligibility information. Check Backend/server.js."
        );
      }

      setVerification(data);

      if (data.eligible) {
        setSuccess(
          `AI verification approved: ${data.category} ` +
            `(${Number(data.confidence).toFixed(1)}% confidence). ` +
            "You can now submit this recycling record."
        );
      } else {
        setError(
          `This item is not eligible for rewards. ` +
            `AI category: ${data.category || "Unknown"}; ` +
            `confidence: ${Number(
              data.confidence || 0
            ).toFixed(1)}%.`
        );
      }
    } catch (err) {
      setError(
        err.message || "Unable to verify this image."
      );
    } finally {
      setVerifyingImage(false);
    }
  }

  // SUBMIT RECYCLING AFTER AI VERIFICATION
  async function submitRecycling(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!product?._scanToken) {
      setError(
        "Please scan the product before submitting."
      );
      return;
    }

    if (
      !verification?.verificationId ||
      !verification?.eligible
    ) {
      setError(
        "Upload a waste image and complete successful " +
          "AI verification before submitting."
      );
      return;
    }

    if (
      verification.expiresAt &&
      new Date(verification.expiresAt).getTime() <=
        Date.now()
    ) {
      setVerification(null);

      setError(
        "Your AI verification has expired. Please verify " +
          "the image again."
      );

      return;
    }

    if (
      product._scanExpiresAt &&
      new Date(product._scanExpiresAt).getTime() <=
        Date.now()
    ) {
      setProduct(null);

      setError(
        "Your scan has expired. Please scan the product again."
      );

      return;
    }

    const qty = Number(quantity);

    if (!Number.isInteger(qty) || qty < 1) {
      setError(
        "Enter a valid whole-number quantity."
      );
      return;
    }

    setSubmitting(true);

    try {
      const result = await requestJson(
        `${API_URL}/submit-waste`,
        {
          method: "POST",
          headers: headers(),

          body: JSON.stringify({
            quantity: qty,
            scanToken: product._scanToken,
            verificationId: verification.verificationId,
          }),
        }
      );

      setProduct(null);
      setQuantity(1);
      setWasteImage(null);
      setVerification(null);

      if (result.user) {
        setUser((previous) => {
          const next = {
            ...previous,
            ...result.user,
          };

          localStorage.setItem(
            "greenLoopUser",
            JSON.stringify(next)
          );

          return next;
        });
      }

      setSuccess(
        `Successfully submitted ${qty} item(s)! ` +
          "Your recycling points have been credited."
      );

      await loadDashboard();
    } catch (err) {
      setError(
        err.message || "Unable to submit recycling."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function navigateToSection(section) {
    setActiveSection(section);
    setMobileMenuOpen(false);

    document
      .getElementById(section)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  function logout() {
    localStorage.removeItem("greenLoopToken");
    localStorage.removeItem("greenLoopUser");

    navigate("/login", { replace: true });
  }

  const totalItems = history.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0),
    0
  );

  const totalWeight = history.reduce(
    (sum, item) =>
      sum + Number(item.total_weight || 0),
    0
  );

  return (
    <div className="user-dashboard">
      {/* SIDEBAR */}
      <aside
        className={`dashboard-sidebar ${
          mobileMenuOpen ? "open" : ""
        }`}
      >
        <div className="dashboard-brand">
          <span className="dashboard-brand-icon">
            <Leaf size={27} />
          </span>

          <div>
            <h2>Green Loop</h2>
            <p>Recycle. Reward. Repeat.</p>
          </div>

          <button
            className="mobile-close-menu"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={21} />
          </button>
        </div>

        <div className="sidebar-section-label">
          YOUR ACTIVITY
        </div>

        <button
          className={`sidebar-link ${
            activeSection === "recycling" ? "active" : ""
          }`}
          onClick={() => navigateToSection("recycling")}
        >
          <Recycle size={19} />
          <span>Recycle</span>
        </button>

        <button
          className="sidebar-link"
          onClick={startScanner}
          disabled={loading || scanning}
        >
          <Camera size={19} />
          <span>Scan Product</span>
        </button>

        <button
          className={`sidebar-link ${
            activeSection === "history" ? "active" : ""
          }`}
          onClick={() => navigateToSection("history")}
        >
          <History size={19} />
          <span>Recycling History</span>
        </button>

        <div className="sidebar-section-label sidebar-section-spaced">
          ACCOUNT
        </div>

        <button
          className={`sidebar-link ${
            activeSection === "profile" ? "active" : ""
          }`}
          onClick={() => navigateToSection("profile")}
        >
          <UserRound size={19} />
          <span>My Profile</span>
        </button>

        <button
          className="sidebar-link"
          onClick={logout}
        >
          <LogOut size={19} />
          <span>Logout</span>
        </button>

        <div className="sidebar-bottom-card">
          <div className="sidebar-leaf-circle">
            <Leaf size={22} />
          </div>

          <h4>Small actions, big impact.</h4>

          <p>
            Every recycled item helps build a cleaner future.
          </p>
        </div>
      </aside>

      {mobileMenuOpen && (
        <button
          className="dashboard-overlay"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close navigation"
        />
      )}

      {/* MAIN DASHBOARD */}
      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <button
            className="mobile-menu-button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          <div className="topbar-heading">
            <h1>Recycle</h1>

            <p>
              Welcome back, {user.name || "Recycler"}!
            </p>
          </div>

          <button
            className="topbar-user"
            onClick={() => navigateToSection("profile")}
          >
            <span className="topbar-user-avatar">
              {(user.name || "U")
                .charAt(0)
                .toUpperCase()}
            </span>

            <span className="topbar-user-details">
              <strong>
                {user.name || "Green Loop User"}
              </strong>

              <span>Individual User</span>
            </span>
          </button>
        </header>

        <div className="dashboard-content">
          {/* WELCOME */}
          <section className="dashboard-welcome">
            <div>
              <span className="welcome-label">
                <Leaf size={15} />
                YOUR SUSTAINABILITY JOURNEY
              </span>

              <h2>Make Every Item Count!</h2>

              <p>
                Scan your product barcode, upload a waste
                image for AI verification, and earn points
                for eligible submissions.
              </p>
            </div>

            <div className="welcome-illustration">
              <Recycle size={70} />
            </div>
          </section>

          {/* ERROR MESSAGE */}
          {error && (
            <div className="dashboard-message error-message">
              <AlertCircle size={18} />

              <span>{error}</span>

              <button
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {/* SUCCESS MESSAGE */}
          {success && (
            <div className="dashboard-message success-message">
              <CheckCircle size={18} />

              <span>{success}</span>

              <button
                onClick={() => setSuccess("")}
                aria-label="Dismiss success message"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {/* STATISTICS */}
          <section className="impact-stat-grid">
            <div className="impact-stat-card">
              <span className="stat-icon points-icon">
                <Award size={23} />
              </span>

              <p>Available Points</p>

              <h3>
                {Number(user.points || 0).toLocaleString(
                  "en-IN"
                )}
              </h3>
            </div>

            <div className="impact-stat-card">
              <span className="stat-icon items-icon">
                <Package size={23} />
              </span>

              <p>Items Submitted</p>

              <h3>
                {totalItems.toLocaleString("en-IN")}
              </h3>
            </div>

            <div className="impact-stat-card">
              <span className="stat-icon weight-icon">
                <Recycle size={23} />
              </span>

              <p>Total Recorded Waste</p>

              <h3>
                {totalWeight >= 1000
                  ? `${(totalWeight / 1000).toFixed(2)} kg`
                  : `${totalWeight} g`}
              </h3>
            </div>
          </section>

          {/* RECYCLING PANEL */}
          <section
            className="dashboard-panel"
            id="recycling"
          >
            <div className="panel-heading">
              <div>
                <span className="panel-icon">
                  <Recycle size={22} />
                </span>

                <div>
                  <h2>Recycle Waste</h2>

                  <p>
                    Scan a registered product and verify
                    your waste image before submitting.
                  </p>
                </div>
              </div>
            </div>

            {!product ? (
              <div className="scanner-start">
                <div className="scanner-start-icon">
                  <Camera size={35} />
                </div>

                <h3>Ready to recycle?</h3>

                <p>
                  Use your device camera to scan the barcode
                  on your product.
                </p>

                <button
                  className="recycle-submit-button"
                  onClick={startScanner}
                  disabled={loading || scanning}
                >
                  <Camera size={19} />

                  {loading
                    ? "Please wait..."
                    : "Scan Product Barcode"}
                </button>
              </div>
            ) : (
              <form
                className="scanned-product-card"
                onSubmit={submitRecycling}
              >
                {/* PRODUCT DETAILS */}
                <div className="scanned-product-header">
                  <span className="product-verified-icon">
                    <CheckCircle size={25} />
                  </span>

                  <div>
                    <h3>
                      {product.brand ||
                        product.name ||
                        "Product"}
                    </h3>

                    <p>
                      Barcode: {product._scannedBarcode}
                    </p>
                  </div>
                </div>

                <div className="scanned-product-details">
                  <div>
                    <span>Points per item</span>

                    <strong>
                      {product.points || 0}
                    </strong>
                  </div>

                  <div>
                    <span>Weight per item</span>

                    <strong>
                      {product.weight || 0} g
                    </strong>
                  </div>
                </div>

                {/* IMAGE UPLOAD */}
                <div className="dashboard-form-field">
                  <label htmlFor="waste-image">
                    Upload Waste Image *
                  </label>

                  <input
                    id="waste-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    onChange={(event) => {
                      setWasteImage(
                        event.target.files?.[0] || null
                      );

                      // A new image must be verified again.
                      setVerification(null);
                      setError("");
                      setSuccess("");
                    }}
                    disabled={
                      submitting || verifyingImage
                    }
                    required
                  />

                  <small>
                    Select a clear JPG, PNG, or WEBP photo.
                    Maximum size: 10 MB.
                  </small>
                </div>

                {/* SELECTED IMAGE */}
                {wasteImage && (
                  <div className="ai-image-preview">
                    <p>
                      <strong>Selected image:</strong>{" "}
                      {wasteImage.name}
                    </p>

                    <button
                      type="button"
                      className="recycle-submit-button"
                      onClick={verifyWasteImage}
                      disabled={
                        verifyingImage || submitting
                      }
                    >
                      {verifyingImage
                        ? "Checking image..."
                        : "Verify Image with AI"}
                    </button>
                  </div>
                )}

                {/* AI RESULTS */}
                {verification && (
                  <div
                    className={`ai-verification-result ${
                      verification.eligible
                        ? "ai-approved"
                        : "ai-rejected"
                    }`}
                  >
                    <strong>
                      {verification.eligible
                        ? "AI Verification Approved"
                        : "AI Verification Not Eligible"}
                    </strong>

                    

                    <p>
                      Confidence:{" "}
                      {Number(
                        verification.confidence || 0
                      ).toFixed(1)}
                      %
                    </p>

                    <p>
                      {verification.message ||
                        (verification.eligible
                          ? "You may submit this item."
                          : "This item cannot be submitted for rewards.")}
                    </p>

                    <small>
                      AI classification alone does not prove
                      that physical recycling has occurred.
                    </small>
                  </div>
                )}

                {/* QUANTITY */}
                <div className="dashboard-form-field">
                  <label htmlFor="recycle-quantity">
                    Quantity
                  </label>

                  <input
                    id="recycle-quantity"
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(event) => {
                      setQuantity(event.target.value);
                    }}
                    disabled={
                      submitting || verifyingImage
                    }
                    required
                  />
                </div>

                {/* POINTS PREVIEW */}
                <p className="scanned-points-preview">
                  Estimated points:{" "}
                  <strong>
                    {Number(product.points || 0) *
                      Number(quantity || 0)}
                  </strong>
                </p>

                {/* ACTION BUTTONS */}
                <div className="scanner-action-buttons">
                  <button
                    type="button"
                    className="scanner-cancel-button"
                    onClick={() => {
                      setProduct(null);
                      setWasteImage(null);
                      setVerification(null);
                      setQuantity(1);
                      setError("");
                      setSuccess("");
                    }}
                    disabled={
                      submitting || verifyingImage
                    }
                  >
                    Cancel
                  </button>

                  <button
                  type="submit"
                  className="recycle-submit-button"
                  disabled={
                  submitting ||
                  verifyingImage ||
                ! verification?.verificationId
                  }
                  >
                  {submitting ? "Submitting..." : "Submit Recycling"}
                  </button>
                </div>

                <p className="scanner-expiry-note">
                  Scan references expire after 10 minutes.
                  Scan again if your reference expires.
                </p>
              </form>
            )}
          </section>

          {/* RECYCLING HISTORY */}
          <section
            className="dashboard-panel"
            id="history"
          >
            <div className="panel-heading">
              <div>
                <span className="panel-icon history-panel-icon">
                  <History size={21} />
                </span>

                <div>
                  <h2>Recycling History</h2>

                  <p>
                    Your latest recorded recycling activity.
                  </p>
                </div>
              </div>

              <button
                className="refresh-button"
                onClick={loadDashboard}
                disabled={loading}
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="dashboard-empty-state">
                Loading your recycling history...
              </div>
            ) : history.length === 0 ? (
              <div className="dashboard-empty-state">
                No recycling records yet. Scan your first
                product to get started!
              </div>
            ) : (
              <div className="history-table-wrapper">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Weight</th>
                      <th>Points</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {history.map((item, index) => (
                      <tr key={item._id || index}>
                        <td>
                          {item.brand ||
                            item.product_name ||
                            item.product?.brand ||
                            item.product_id?.brand ||
                            "Product"}
                        </td>

                        <td>{item.quantity || 0}</td>

                        <td>
                          {item.total_weight || 0} g
                        </td>

                        <td>
                          {item.points_earned || 0}
                        </td>

                        <td>
                          <span className="history-status">
                            {item.status || "Recorded"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* PROFILE */}
          <section
            className="dashboard-panel"
            id="profile"
          >
            <div className="panel-heading">
              <div>
                <span className="panel-icon profile-panel-icon">
                  <UserRound size={21} />
                </span>

                <div>
                  <h2>My Profile</h2>

                  <p>
                    Your Green Loop account information.
                  </p>
                </div>
              </div>
            </div>

            <div className="profile-information">
              <div className="profile-avatar">
                {(user.name || "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="profile-details">
                <h3>
                  {user.name || "Green Loop User"}
                </h3>

                <p>
                  {user.email || "Email not available"}
                </p>

                <p>
                  Available Points:{" "}
                  {Number(user.points || 0)}
                </p>

                <span className="profile-role-badge">
                  <Leaf size={13} />
                  Individual User
                </span>
              </div>

              <button
                className="profile-logout-button"
                onClick={logout}
              >
                <LogOut size={17} />
                Logout
              </button>
            </div>
          </section>

          {/* FOOTER */}
          <footer className="dashboard-footer">
            <Leaf size={16} />
            Green Loop — Together for a sustainable future.
          </footer>
        </div>
      </main>

      {/* BARCODE SCANNER MODAL */}
      {scannerOpen && (
        <div
          className="scanner-modal"
          role="dialog"
          aria-modal="true"
        >
          <div className="scanner-modal-content">
            <div className="scanner-modal-header">
              <div>
                <h2>Scan Product Barcode</h2>

                <p>
                  Position the barcode inside the camera
                  view.
                </p>
              </div>

              <button
                onClick={closeScanner}
                aria-label="Close scanner"
              >
                <X size={22} />
              </button>
            </div>

            <div className="scanner-video-container">
              <div
                id="green-loop-scanner"
                className="green-loop-scanner"
              />
            </div>

            <p className="scanner-help">
              {scanning
                ? "Camera active. Hold the barcode steady."
                : "Starting camera..."}
            </p>

            <button
              className="scanner-cancel-button scanner-close-button"
              onClick={closeScanner}
            >
              Close Camera
            </button>
          </div>
        </div>
      )}
    </div>
  );
}