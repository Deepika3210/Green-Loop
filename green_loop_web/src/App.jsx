import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import UserDashboard from "./pages/UserDashboard";
import CollectionCenterDashboard from "./pages/CollectionCenterDashboard";
import RecyclerDashboard from "./pages/RecyclerDashboard";
import ManufacturerDashboard from "./pages/ManufacturerDashboard";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default page */}
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        {/* Authentication pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Individual user dashboard */}
        <Route
          path="/dashboard"
          element={<UserDashboard />}
        />

        
        <Route
  path="/collection-center"
  element={<CollectionCenterDashboard />}
/>

        <Route
  path="/recycler"
  element={<RecyclerDashboard />}
/>

        <Route
  path="/manufacturer"
  element={<ManufacturerDashboard />}
/>

        {/* Unknown routes */}
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;