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
