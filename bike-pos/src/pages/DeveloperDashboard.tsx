import React, { useEffect, useState } from 'react';
import { Card, Col, Container, Row } from 'react-bootstrap';
import { Building, People } from 'react-bootstrap-icons';
import { useAuth } from '../contexts/AuthContext';
import { statsApi } from '../services/api'; // Using named import

interface DashboardStats {
  totalShops: number;
  totalUsers: number;
  usersByRole: {
    developer: number;
    admin: number;
    manager: number;
    cashier: number;
  };
  activeShops: number;
  inactiveShops: number;
}

const DeveloperDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Use the correct method without parameters
        const response = await statsApi.getDeveloperStats();
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching developer stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <Container fluid className="py-3">
      <h1 className="h3 mb-4">Developer Dashboard</h1>
      
      {/* Summary Cards */}
      <Row className="g-3 mb-4">
        <Col xs={12} md={6} xl={3}>
          <Card className="h-100">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0 me-3">
                  <Building size={32} className="text-primary" />
                </div>
                <div>
                  <h6 className="card-subtitle mb-1 text-muted">Total Shops</h6>
                  <h2 className="card-title mb-0">{stats?.totalShops || 0}</h2>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={6} xl={3}>
          <Card className="h-100">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0 me-3">
                  <People size={32} className="text-success" />
                </div>
                <div>
                  <h6 className="card-subtitle mb-1 text-muted">Total Users</h6>
                  <h2 className="card-title mb-0">{stats?.totalUsers || 0}</h2>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={6} xl={3}>
          <Card className="h-100">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0 me-3">
                  <Building size={32} className="text-success" />
                </div>
                <div>
                  <h6 className="card-subtitle mb-1 text-muted">Active Shops</h6>
                  <h2 className="card-title mb-0">{stats?.activeShops || 0}</h2>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={6} xl={3}>
          <Card className="h-100">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0 me-3">
                  <Building size={32} className="text-danger" />
                </div>
                <div>
                  <h6 className="card-subtitle mb-1 text-muted">Inactive Shops</h6>
                  <h2 className="card-title mb-0">{stats?.inactiveShops || 0}</h2>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* User Distribution */}
      <Row className="mb-4">
        <Col xs={12}>
          <Card>
            <Card.Header>
              <h5 className="card-title mb-0">User Distribution by Role</h5>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col xs={12} sm={6} md={3}>
                  <div className="border rounded p-3">
                    <h6 className="text-muted mb-1">Developers</h6>
                    <h3 className="mb-0">{stats?.usersByRole.developer || 0}</h3>
                  </div>
                </Col>
                <Col xs={12} sm={6} md={3}>
                  <div className="border rounded p-3">
                    <h6 className="text-muted mb-1">Admins</h6>
                    <h3 className="mb-0">{stats?.usersByRole.admin || 0}</h3>
                  </div>
                </Col>
                <Col xs={12} sm={6} md={3}>
                  <div className="border rounded p-3">
                    <h6 className="text-muted mb-1">Managers</h6>
                    <h3 className="mb-0">{stats?.usersByRole.manager || 0}</h3>
                  </div>
                </Col>
                <Col xs={12} sm={6} md={3}>
                  <div className="border rounded p-3">
                    <h6 className="text-muted mb-1">Cashiers</h6>
                    <h3 className="mb-0">{stats?.usersByRole.cashier || 0}</h3>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DeveloperDashboard;