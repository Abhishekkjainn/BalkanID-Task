import './App.css'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import MainPage from './mainpage';
import Loginpage from './pages/loginpage';
import Registerpage from './pages/registerpage';
import Header from './components/header';
import Dashboard from './pages/dashboard';

function Layout() {
  const location = useLocation();

  // pages where header should be hidden
  const hideHeaderRoutes = ['/login', '/register','/dashboard'];
  const shouldHideHeader = hideHeaderRoutes.includes(location.pathname);

  return (
    <>
      {!shouldHideHeader && <Header />}
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/login" element={<Loginpage />} />
        <Route path="/register" element={<Registerpage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}

export default App;



// import './App.css';
// import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom';
// import MainPage from './mainpage';
// import Loginpage from './pages/loginpage';
// import Registerpage from './pages/registerpage';
// import Header from './components/header';
// import Dashboard from './pages/dashboard';

// // NEW: Import the AuthProvider and useAuth hook from your context
// import { AuthProvider, useAuth } from './context/AuthContext';
// import { ToastProvider } from './context/ToastContext'; 

// // NEW: Create a ProtectedRoute component
// // This component will check if a user is logged in.
// // If they are, it will render the requested page (via <Outlet />).
// // If not, it will redirect them to the /login page.
// function ProtectedRoute() {
//   const { user } = useAuth();
//   return user ? <Outlet /> : <Navigate to="/login" replace />;
// }

// // UPDATED: Your Layout component now contains the protected route logic
// function Layout() {
//   const location = useLocation();

//   // Your existing logic for hiding the header remains unchanged.
//   const hideHeaderRoutes = ['/login', '/register', '/dashboard'];
//   const shouldHideHeader = hideHeaderRoutes.includes(location.pathname);

//   return (
//     <>
//       {!shouldHideHeader && <Header />}
      
//       {/* The Routes definition is now updated to protect the dashboard */}
//       <Routes>
//         {/* These are your public routes, accessible to everyone */}
//         <Route path="/" element={<MainPage />} />
//         <Route path="/login" element={<Loginpage />} />
//         <Route path="/register" element={<Registerpage />} />

//         {/* This is the wrapper for all your protected routes */}
//         <Route element={<ProtectedRoute />}>
//           {/* Any route nested inside here requires a logged-in user */}
//           <Route path="/dashboard" element={<Dashboard />} />
//           {/* You can add more protected routes here later, e.g., /profile, /settings */}
//         </Route>
        
//         {/* OPTIONAL: You can add a catch-all redirect for any unknown paths */}
//         <Route path="*" element={<Navigate to="/" replace />} />
//       </Routes>
//     </>
//   );
// }

// // UPDATED: The main App component now wraps everything in the AuthProvider
// // This makes the user, token, login, and logout functions available to all components.
// function App() {
//   return (
//     ReactDOM.createRoot(document.getElementById('root')).render(
//   <React.StrictMode>
//     <AuthProvider>
//       <ToastProvider> {/* WRAP HERE */}
//         <App />
//       </ToastProvider>
//     </AuthProvider>
//   </React.StrictMode>,
// )
//   );
// }

// export default App;

// src/App.jsx

// import './App.css';
// import { Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom';
// import MainPage from './mainpage';
// import Loginpage from './pages/loginpage';
// import Registerpage from './pages/registerpage';
// import Header from './components/header';
// import Dashboard from './pages/dashboard';

// import { useAuth } from './context/AuthContext';

// // This ProtectedRoute component is correct and can stay here.
// function ProtectedRoute() {
//   const { user } = useAuth();
//   return user ? <Outlet /> : <Navigate to="/login" replace />;
// }

// // Your main App component should define the structure.
// // NOTE: We rename 'Layout' to 'App' for simplicity, as it's the root component.
// function App() {
//   const location = useLocation();

//   const hideHeaderRoutes = ['/login', '/register', '/dashboard'];
//   const shouldHideHeader = hideHeaderRoutes.includes(location.pathname);

//   return (
//     <>
//       {!shouldHideHeader && <Header />}
      
//       <Routes>
//         {/* Public Routes */}
//         <Route path="/" element={<MainPage />} />
//         <Route path="/login" element={<Loginpage />} />
//         <Route path="/register" element={<Registerpage />} />

//         {/* Protected Routes Wrapper */}
//         <Route element={<ProtectedRoute />}>
//           <Route path="/dashboard" element={<Dashboard />} />
//           {/* Add more protected routes here */}
//         </Route>
        
//         {/* Catch-all Route */}
//         <Route path="*" element={<Navigate to="/" replace />} />
//       </Routes>
//     </>
//   );
// }

// export default App;