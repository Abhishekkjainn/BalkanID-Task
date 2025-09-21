import './App.css';
import { Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom';

import MainPage from './mainpage';
import Loginpage from './pages/loginpage';
import Registerpage from './pages/registerpage';
import Dashboard from './pages/dashboard';
import Header from './components/header';
import Loader from './components/loader'; 
import { useAuth } from './context/AuthContext';

function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function App() {
  const location = useLocation();
  const { loading } = useAuth();

  const hideHeaderRoutes = ['/login', '/register', '/dashboard'];
  const shouldHideHeader = hideHeaderRoutes.includes(location.pathname);


  return (
    <>
    {loading && <Loader />}
      {!shouldHideHeader && <Header />}
      
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<MainPage />} />
        <Route path="/login" element={<Loginpage />} />
        <Route path="/register" element={<Registerpage />} />

        {/* Protected Routes Wrapper */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;