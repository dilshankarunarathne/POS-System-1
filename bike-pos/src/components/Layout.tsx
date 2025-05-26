import { useEffect, useState } from 'react';
import {
  Container,
  Dropdown,
  Nav,
  Navbar,
  Offcanvas
} from 'react-bootstrap';
import {
  BarChart,
  BoxArrowRight,
  BoxSeam,
  Cart,
  Diagram3,
  House,
  Receipt,
  Truck
} from 'react-bootstrap-icons';
import { LinkContainer } from 'react-router-bootstrap';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const menuItems = [
  { name: 'Dashboard', icon: <House size={18} />, path: '/dashboard' },
  { name: 'Point of Sale', icon: <Cart size={18} />, path: '/pos' },
  { name: 'Products', icon: <BoxSeam size={18} />, path: '/products' },
  { name: 'Categories', icon: <Diagram3 size={18} />, path: '/categories' },
  { name: 'Suppliers', icon: <Truck size={18} />, path: '/suppliers' },
  { name: 'Sales', icon: <Receipt size={18} />, path: '/sales' },
  { name: 'Reports', icon: <BarChart size={18} />, path: '/reports' },
];

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 992);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close offcanvas after navigation
  const handleNavigation = () => {
    setShowOffcanvas(false);
  };

  // Get current page title
  const getCurrentPageTitle = () => {
    const currentItem = menuItems.find(item => item.path === location.pathname);
    return currentItem ? currentItem.name : 'Dashboard';
  };

  return (
    <>
      {/* Enhanced Navbar */}
      <Navbar 
        bg="primary" 
        variant="dark" 
        expand="lg" 
        fixed="top" 
        className="shadow-lg py-2 px-0"
        style={{
          background: 'linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <Container fluid className="px-3 px-md-4">
          {/* Brand and Mobile Menu Toggle */}
          <div className="d-flex align-items-center">
            {isMobile && (
              <button
                className="btn btn-link text-white p-1 me-2 border-0"
                onClick={() => setShowOffcanvas(!showOffcanvas)}
                aria-label="Toggle navigation"
              >
                <div className="hamburger-icon">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </button>
            )}
            
            <LinkContainer to="/dashboard">
              <Navbar.Brand className="fw-bold fs-4 text-white d-flex align-items-center">
                <div className="brand-icon me-2 bg-white bg-opacity-10 rounded-circle p-2">
                  <BoxSeam size={20} />
                </div>
                <span className="d-none d-sm-inline">Bike Parts POS</span>
                <span className="d-sm-none">BikePOS</span>
              </Navbar.Brand>
            </LinkContainer>
          </div>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Nav className="mx-auto d-none d-lg-flex">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                
                return (
                  <LinkContainer key={item.name} to={item.path}>
                    <Nav.Link 
                      className={`nav-item-custom mx-1 px-3 py-2 rounded-pill transition-all ${
                        isActive ? 'active-nav-item' : ''
                      }`}
                    >
                      <span className="me-2">{item.icon}</span>
                      <span className="d-none d-xl-inline">{item.name}</span>
                    </Nav.Link>
                  </LinkContainer>
                );
              })}
            </Nav>
          )}

          {/* Right side controls */}
          <div className="d-flex align-items-center">
            

            {/* User Dropdown */}
            <Dropdown align="end">
              <Dropdown.Toggle 
                as="button"
                className="btn btn-link text-white border-0 p-0 d-flex align-items-center user-dropdown"
              >
               
                <div 
                  className="user-avatar bg-white bg-opacity-20 text-white rounded-circle d-flex justify-content-center align-items-center fw-bold"
                  style={{ width: '40px', height: '40px', fontSize: '14px' }}
                >
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
              </Dropdown.Toggle>
              
              <Dropdown.Menu className="shadow-lg border-0 mt-2" style={{ minWidth: '200px' }}>
                <Dropdown.ItemText className="text-muted small">
                  <div className="fw-bold text-dark">{user?.username}</div>
                  <div>Role: {user?.role?.charAt(0).toUpperCase()}{user?.role?.slice(1)}</div>
                </Dropdown.ItemText>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout} className="text-danger">
                  <BoxArrowRight size={16} className="me-2" />
                  Sign Out
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown> 
          </div>
        </Container>
      </Navbar>

      {/* Enhanced Mobile Offcanvas */}
      <Offcanvas
        show={showOffcanvas}
        onHide={() => setShowOffcanvas(false)}
        placement="start"
        className="mobile-sidebar"
        style={{ width: '280px' }}
      >
        <Offcanvas.Header 
          closeButton 
          className="bg-primary text-white"
          style={{ background: 'linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%)' }}
        >
          <Offcanvas.Title className="fw-bold d-flex align-items-center">
            <div className="brand-icon me-2 bg-white bg-opacity-20 rounded-circle p-2">
              <BoxSeam size={18} />
            </div>
            Bike Parts POS
          </Offcanvas.Title>
        </Offcanvas.Header>
        
        <Offcanvas.Body className="p-0 bg-light">
          <Nav className="flex-column">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              
              return (
                <LinkContainer key={item.name} to={item.path} onClick={handleNavigation}>
                  <Nav.Link 
                    className={`mobile-nav-item px-4 py-3 border-0 d-flex align-items-center ${
                      isActive ? 'active-mobile-nav' : ''
                    }`}
                  >
                    <span className="nav-icon me-3">{item.icon}</span>
                    <span className="nav-text">{item.name}</span>
                  </Nav.Link>
                </LinkContainer>
              );
            })}
          </Nav>
        </Offcanvas.Body>
      </Offcanvas>

      {/* Enhanced Main Content */}
      <main className="main-content">
        <Container fluid className="content-container p-3 p-md-4">
          {/* Mobile Page Header */}
          {isMobile && (
            <div className="mobile-header mb-3 pb-3 border-bottom">
              <h4 className="mb-0 fw-bold text-primary d-flex align-items-center">
                {menuItems.find(item => item.path === location.pathname)?.icon}
                <span className="ms-2">{getCurrentPageTitle()}</span>
              </h4>
            </div>
          )}
          
          <Outlet />
        </Container>
      </main>

      {/* Custom Styles */}
      <style>{`
        .hamburger-icon {
          width: 20px;
          height: 15px;
          position: relative;
          cursor: pointer;
        }
        
        .hamburger-icon span {
          display: block;
          position: absolute;
          height: 2px;
          width: 100%;
          background: white;
          border-radius: 1px;
          opacity: 1;
          left: 0;
          transform: rotate(0deg);
          transition: .25s ease-in-out;
        }
        
        .hamburger-icon span:nth-child(1) {
          top: 0px;
        }
        
        .hamburger-icon span:nth-child(2) {
          top: 6px;
        }
        
        .hamburger-icon span:nth-child(3) {
          top: 12px;
        }

        .nav-item-custom {
          color: rgba(255, 255, 255, 0.8) !important;
          transition: all 0.3s ease;
          border: 1px solid transparent;
        }

        .nav-item-custom:hover {
          color: white !important;
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-1px);
        }

        .active-nav-item {
          color: white !important;
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .user-dropdown:hover {
          opacity: 0.8;
        }

        .mobile-nav-item {
          color: #6c757d;
          transition: all 0.3s ease;
          border-left: 3px solid transparent;
        }

        .mobile-nav-item:hover {
          background: #f8f9fa;
          color: #0d6efd;
          border-left-color: #0d6efd;
        }

        .active-mobile-nav {
          background: #e3f2fd;
          color: #0d6efd;
          border-left-color: #0d6efd;
          font-weight: 500;
        }

        .main-content {
          margin-top: 70px; /* Increased from 60px to ensure content isn't hidden */
          padding-top: 15px; /* Added padding to create space for content */
          min-height: calc(100vh - 70px);
          background: #f8f9fa;
          width: 100%;
        }

        .content-container {
          max-width: 100%;
          width: 100%;
        }

        @media (min-width: 768px) {
          .main-content {
            margin-top: 75px; /* More space on larger screens */
            padding-top: 20px;
          }
          .content-container {
            padding-top: 1rem;
            padding-bottom: 2rem;
          }
        }

        @media (min-width: 1200px) {
          .content-container {
            padding-top: 1.5rem;
            padding-bottom: 2.5rem;
          }
        }

        .user-avatar {
          transition: all 0.3s ease;
        }

        .user-avatar:hover {
          transform: scale(1.05);
        }

        .mobile-sidebar {
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
        }

        .mobile-header {
          background: white;
          margin: 0 0 1.5rem 0;
          padding: 0 0 1rem 0; /* Adjusted padding to prevent overlap */
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }

        @media (min-width: 768px) {
          .mobile-header {
            margin: 0 0 2rem 0;
            padding: 2rem;
          }
        }
      `}</style>
    </>
  );
};

export default Layout;