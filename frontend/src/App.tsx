import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Employees from './pages/Employees';
import Shifts from './pages/Shifts';
import Groups from './pages/Groups';
import Leaves from './pages/Leaves';
import EmployeeDetail from './pages/EmployeeDetail';
import MyDashboard from './pages/MyDashboard';
import Today from './pages/Today';
import WorkLog from './pages/WorkLog';
import People from './pages/People';
import { AuthProvider, useAuth } from './lib/auth';
import { getToken } from './lib/api';
import { RequireRole, RequireTeamAccess } from './components/RouteGuards';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }
  // Token present but /me hasn't resolved yet - avoid a flash of a half-authed page.
  if (loading) return null;
  return <>{children}</>;
}

/** Managers, HR and admins land on Today; everyone else on their own page. */
function HomeRedirect() {
  const { user } = useAuth();
  const team = user && (user.isManager || user.role === 'HR' || user.role === 'ADMIN');
  return <Navigate to={team ? '/today' : '/my'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<HomeRedirect />} />
            <Route path="my" element={<MyDashboard />} />

            <Route path="today" element={<RequireTeamAccess><Today /></RequireTeamAccess>} />
            <Route path="work-log" element={<RequireTeamAccess><WorkLog /></RequireTeamAccess>} />
            <Route path="people" element={<RequireTeamAccess><People /></RequireTeamAccess>} />
            <Route path="leaves" element={<RequireTeamAccess><Leaves /></RequireTeamAccess>} />
            <Route path="employees/:id" element={<EmployeeDetail />} />

            <Route path="employees" element={<RequireRole roles={['ADMIN']}><Employees /></RequireRole>} />
            <Route path="shifts" element={<RequireRole roles={['ADMIN']}><Shifts /></RequireRole>} />
            <Route path="groups" element={<RequireRole roles={['ADMIN']}><Groups /></RequireRole>} />

            {/* Old addresses, kept so bookmarks and notification links still land. */}
            <Route path="overview" element={<Navigate to="/today" replace />} />
            <Route path="team" element={<Navigate to="/people" replace />} />
            <Route path="hr" element={<Navigate to="/people" replace />} />
            <Route path="attendance" element={<Navigate to="/work-log" replace />} />
            <Route path="settings" element={<Navigate to="/groups" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
