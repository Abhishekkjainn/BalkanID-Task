// import './App.css'
// import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
// import MainPage from './mainpage';
// import Loginpage from './pages/loginpage';
// import Registerpage from './pages/registerpage';
// import Header from './components/header';
// import Dashboard from './pages/dashboard';
// import Loader from './components/loader';

// function Layout() {
//   const location = useLocation();

//   // pages where header should be hidden
//   const hideHeaderRoutes = ['/login', '/register','/dashboard'];
//   const shouldHideHeader = hideHeaderRoutes.includes(location.pathname);

//   return (
//     <>
//     {/* <Loader/> */}
//       {!shouldHideHeader && <Header />}
//       <Routes>
//         <Route path="/" element={<MainPage />} />
//         <Route path="/login" element={<Loginpage />} />
//         <Route path="/register" element={<Registerpage />} />
//         <Route path="/dashboard" element={<Dashboard />} />
//       </Routes>
//     </>
//   );
// }

// function App() {
//   return (
//     <Router>
//       <Layout />
//     </Router>
//   );
// }

// export default App;


// src/App.jsx

import './App.css';
import { Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom';

// Page & Component Imports
import MainPage from './mainpage';
import Loginpage from './pages/loginpage';
import Registerpage from './pages/registerpage';
import Dashboard from './pages/dashboard';
import Header from './components/header';
import Loader from './components/loader'; // Make sure this path is correct

import { useAuth } from './context/AuthContext';

function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function App() {
  const location = useLocation();
  // Get the new loading state from the context
  const { loading } = useAuth();

  const hideHeaderRoutes = ['/login', '/register', '/dashboard'];
  const shouldHideHeader = hideHeaderRoutes.includes(location.pathname);

  // If the app is performing the initial auth check, show the global loader
  // if (loading) {
  //   return <Loader />;
  // }

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