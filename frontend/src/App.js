import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext'; // 🔹 NOUVEAU
import Navbar from './components/Navbar';
import './i18n/i18n';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
// Pages
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import AdminDashboard from './dashboards/AdminDashboard';
import AvocatDashboard from './dashboards/AvocatDashboard';
import AssociationDashboard from './dashboards/DashboardAssociation';
import AssociationListPage from './pages/AssociationsListPage';
import DemandeFormPage from './pages/DemandeAssociation';
import AboutUs from './pages/AboutUs';
import RegisterDonneur from './pages/RegisterDonneur';
import DashboardDonneur from './dashboards/DashboardDonneur';
import CreateDon from './pages/CreateDon';
import DemandeForm from './pages/DemandeBeneficiaire';
import DashboardBeneficiaire from './dashboards/DashboardBeneficiaire'; 
import AssociationDetailsPage from './pages/AssociationDetailsPage';
import SetPassword from './pages/SetPassword';
import Chatbot from './pages/Chatbot';
import ChatbotWidget from './components/ChatbotWidget'; 
import TopDonateurs from "./pages/TopDonateurs";
import MapPage from './pages/MapPage';


function App() {
  return (
    <AuthProvider>
      <ThemeProvider> {/* 🔹 WRAP avec ThemeProvider */}
        <Router>
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/avocat/dashboard" element={<AvocatDashboard />} />
            <Route path="/association/dashboard" element={<AssociationDashboard />} />
            <Route path="/associations" element={<AssociationListPage />} />
            <Route path="/demande" element={<DemandeFormPage />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/register-donneur" element={<RegisterDonneur />} />
            <Route path="/dashboard-donneur" element={<DashboardDonneur />} />
            <Route path="/create-don/:id" element={<CreateDon />} />
            <Route path="/demande-aide" element={<DemandeForm />} />
            <Route path="/dashboard-beneficiaire" element={<DashboardBeneficiaire />} />
            <Route path="/association/:id" element={<AssociationDetailsPage />} />
            <Route path="/set-password/:token" element={<SetPassword />} />
            <Route path="/chatbot" element={<Chatbot />} />
            <Route path="/chatbot-widget" element={<ChatbotWidget />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/top-donateurs" element={<TopDonateurs />} />
<Route path="/carte" element={<MapPage />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;