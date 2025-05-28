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

// Menu items configuration
const getMenuItems = (role: string) => {
  const items = [
    {
      name: 'Dashboard',
      path: '/dashboard', 
      icon: <House size={18} />,
      roles: [ 'admin', 'manager', 'cashier']
    },
    {
      name: 'POS',
      path: '/pos',
      icon: <Cart size={18} />,
      roles: ['admin', 'manager', 'cashier']
    },
    {
      name: 'Products',
      path: '/products',
      icon: <BoxSeam size={18} />,
      roles: ['admin', 'manager']
    },
    {
      name: 'Categories',
      path: '/categories',
      icon: <Diagram3 size={18} />,
      roles: ['admin', 'manager']
    },
    {
      name: 'Suppliers',
      path: '/suppliers',
      icon: <Truck size={18} />,
      roles: ['admin', 'manager']
    },
    {
      name: 'Sales',
      path: '/sales',
      icon: <Receipt size={18} />,
      roles: ['admin', 'manager']
    },
    {
      name: 'Reports',
      path: '/reports',
      icon: <BarChart size={18} />,
      roles: ['admin', 'manager']
    }
  ];

  // Add developer-specific items
  if (role === 'developer') {
    items.unshift(
      {
        name: 'Developer Dashboard',
        path: '/developer/dashboard',
        icon: <House size={18} />,
        roles: ['developer']
      },
      {
        name: 'User Management',
        path: '/developer/users',
        icon: <House size={18} />,
        roles: ['developer']
      }
    );
  }

  return items.filter(item => item.roles.includes(role));
};

const Layout = () => {
  const { user, logout, getCurrentShop } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const currentShop = getCurrentShop();

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

  // Get menu items based on user role
  const menuItems = getMenuItems(user?.role || 'cashier');

  // Get current page title
  const getCurrentPageTitle = () => {
    const currentItem = menuItems.find(item => item.path === location.pathname);
    return currentItem ? currentItem.name : 'Dashboard';
  };

  return (
    <div className="layout-container">
      {/* Enhanced Navbar */}
      <Navbar 
        bg="primary" 
        variant="dark" 
        expand="lg" 
        fixed="top" 
        className="shadow-sm py-2"
        style={{
          background: 'linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          zIndex: 1030
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
                <span className="d-none d-sm-inline">
                  {user?.role === 'developer' ? 'Bike Parts POS' : currentShop?.name || 'Bike Parts POS'}
                </span>
                <span className="d-sm-none">
                  {user?.role === 'developer' ? 'BikePOS' : currentShop?.name || 'BikePOS'}
                </span>
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
              <Dropdown.Toggle variant="link" className="nav-link text-white border-0 d-flex align-items-center p-0">
                <div className="d-none d-md-block me-2 text-end">
                  <div className="fw-bold">{user?.name}</div>
                  <div className="small text-white-50">
                    <span className="text-capitalize">{user?.role}</span>
                    {currentShop && user?.role !== 'developer' && (
                      <> • {currentShop.name}</>
                    )}
                  </div>
                </div>
                <div className="user-avatar bg-white bg-opacity-10 rounded-circle p-2">
                  <BoxArrowRight size={20} />
                </div>
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={handleLogout}>Logout</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown> 
          </div>
        </Container>
      </Navbar>

      {/* Mobile Navigation Offcanvas */}
      <Offcanvas
        show={showOffcanvas}
        onHide={() => setShowOffcanvas(false)}
        placement="start"
        className="sidebar-nav"
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>
            {user?.role === 'developer' ? 'Bike Parts POS' : currentShop?.name || 'Bike Parts POS'}
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Nav className="flex-column">
            {menuItems.map((item) => (
                <LinkContainer key={item.name} to={item.path} onClick={handleNavigation}>
                <Nav.Link className="py-2">
                  <span className="me-3">{item.icon}</span>
                  {item.name}
                  </Nav.Link>
                </LinkContainer>
            ))}
          </Nav>
        </Offcanvas.Body>
      </Offcanvas>

      {/* Main Content */}
      <main className="main-content">
        <Container fluid className="h-100 py-4 px-3 px-md-4">
          <Outlet />
        </Container>
      </main>

      {/* Custom Styles */}
      <style>{`
        .layout-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .navbar {
          height: 60px;
        }

        .main-content {
          flex: 1;
          margin-top: 60px;
          background: #f8f9fa;
          min-height: calc(100vh - 60px);
          width: 100%;
          padding-bottom: 2rem;
        }

        .sidebar-nav {
          margin-top: 60px;
          width: 280px;
        }

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
        
        .hamburger-icon span:nth-child(1) { top: 0px; }
        .hamburger-icon span:nth-child(2) { top: 6px; }
        .hamburger-icon span:nth-child(3) { top: 12px; }

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

        .user-avatar {
          transition: all 0.3s ease;
        }

        .user-avatar:hover {
          transform: scale(1.05);
        }

        /* Responsive Adjustments */
        @media (min-width: 768px) {
          .main-content {
            padding-top: 1rem;
          }
        }

        @media (min-width: 992px) {
          .main-content {
            padding-top: 1.5rem;
          }
        }

        /* Mobile Specific Styles */
        @media (max-width: 991.98px) {
          .navbar-brand {
            font-size: 1.1rem;
          }
          
          .brand-icon {
            width: 32px;
            height: 32px;
          }
        }

        /* Offcanvas Navigation Styles */
        .offcanvas-body .nav-link {
          padding: 0.75rem 1rem;
          color: #495057;
          border-radius: 0.25rem;
          margin-bottom: 0.25rem;
          transition: all 0.2s ease;
        }

        .offcanvas-body .nav-link:hover {
          background-color: #f8f9fa;
          color: #0d6efd;
        }

        .offcanvas-body .nav-link.active {
          background-color: #e9ecef;
          color: #0d6efd;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export default Layout;