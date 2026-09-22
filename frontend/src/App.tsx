import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Shifts from './pages/Shifts';
import Settings from './pages/Settings';
import Leaves from './pages/Leaves';
import Attendance from './pages/Attendance';
import EmployeeDetail from './pages/EmployeeDetail';
import MyDashboard from './pages/MyDashboard';
import Team from './pages/Team';
import HrView from './pages/HrView';
import { AuthProvider, useAuth } from './lib/auth';
import { getToken } from './lib/api';
import { RequireRole, RequireManager } from './components/RouteGuards';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }
  // Token present but /me hasn't resolved yet - avoid a flash of a half-authed page.
  if (loading) return null;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/my" replace />} />
            <Route path="my" element={<MyDashboard />} />
            <Route path="team" element={<RequireManager><Team /></RequireManager>} />
            <Route path="hr" element={<RequireRole roles={['HR', 'ADMIN']}><HrView /></RequireRole>} />

            <Route path="overview" element={<RequireRole roles={['ADMIN']}><Dashboard /></RequireRole>} />
            <Route path="employees" element={<RequireRole roles={['ADMIN']}><Employees /></RequireRole>} />
            <Route path="employees/:id" element={<EmployeeDetail />} />
            <Route path="shifts" element={<RequireRole roles={['ADMIN']}><Shifts /></RequireRole>} />
            <Route path="attendance" element={<RequireRole roles={['ADMIN']}><Attendance /></RequireRole>} />
            <Route path="leaves" element={<RequireRole roles={['ADMIN']}><Leaves /></RequireRole>} />
            <Route path="settings" element={<RequireRole roles={['ADMIN']}><Settings /></RequireRole>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
